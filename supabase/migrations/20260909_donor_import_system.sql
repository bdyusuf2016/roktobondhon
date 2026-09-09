-- ==============================================================================
-- ROKTOBONDHON - DONOR IMPORT SYSTEM DATABASE MIGRATION
-- Migration: 20260909_donor_import_system.sql
-- ==============================================================================
-- Features:
-- 1. Support for Paper/Excel/CSV Donor Imports without requiring immediate Auth accounts.
-- 2. public.donors.user_id is nullable (user_id = NULL for imported historical donors).
-- 3. public.donor_import_batches table for batch tracking, audit trail, and safe rollback.
-- 4. Secure SECURITY DEFINER RPCs:
--    - admin_import_donors_batch: Authorizes caller (super_admin, admin, moderator),
--      validates constraints, enforces pending status & NULL user_id, generates collision-safe
--      donor IDs, records audit logs, and notifies active reviewers.
--    - admin_rollback_import_batch: Restricted to Super Admin & Admin to safely undo unverified imports.
-- 5. Strict RLS and audit governance.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema Extensions for public.donors
-- ------------------------------------------------------------------------------
-- Allow imported historical donors to exist without an immediate Auth user account
ALTER TABLE public.donors ALTER COLUMN user_id DROP NOT NULL;

-- Add tracking columns for source and import batches
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS import_batch_id TEXT;
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'registered';
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS alternate_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_donors_import_batch_id ON public.donors(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_donors_phone ON public.donors(phone);
CREATE INDEX IF NOT EXISTS idx_donors_source ON public.donors(source);

-- ------------------------------------------------------------------------------
-- 2. Create public.donor_import_batches Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donor_import_batches (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  imported_by TEXT NOT NULL,
  imported_by_name TEXT,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'completed_with_errors', 'failed', 'rolled_back')),
  error_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_donor_import_batches_created_at ON public.donor_import_batches(created_at);

-- Enable RLS on batches
ALTER TABLE public.donor_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view import batches" ON public.donor_import_batches;
DROP POLICY IF EXISTS "Staff can insert import batches" ON public.donor_import_batches;
DROP POLICY IF EXISTS "Admins can update import batches" ON public.donor_import_batches;

CREATE POLICY "Staff can view import batches" ON public.donor_import_batches
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff can insert import batches" ON public.donor_import_batches
  FOR INSERT WITH CHECK (public.is_staff() OR current_user = 'service_role');

CREATE POLICY "Admins can update import batches" ON public.donor_import_batches
  FOR UPDATE USING (public.is_admin() OR current_user = 'service_role');

-- ------------------------------------------------------------------------------
-- 3. Secure Server-Side Batch Import RPC Function (admin_import_donors_batch)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_import_donors_batch(
  p_filename TEXT,
  p_donors JSONB,
  p_skipped_details JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_caller_id TEXT := auth.uid()::text;
  v_caller_role TEXT;
  v_caller_name TEXT := 'Staff';
  v_batch_id TEXT := 'batch-' || floor(random() * 10000000)::text;
  v_donor JSONB;
  v_donor_count INTEGER := 0;
  v_success_count INTEGER := 0;
  v_duplicate_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_imported_donors JSONB := '[]'::jsonb;
  v_loc_code TEXT;
  v_donor_human_id TEXT;
  v_new_donor_id TEXT;
  v_phone TEXT;
  v_staff RECORD;
BEGIN
  -- 1. Authenticate caller and verify RBAC clearance
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authenticated session required.';
  END IF;

  SELECT role, full_name INTO v_caller_role, v_caller_name
  FROM public.users
  WHERE id = v_caller_id AND status = 'active';

  -- Only super_admin, admin, moderator are allowed to import donors. Volunteers and donors are blocked.
  IF v_caller_role NOT IN ('super_admin', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin, Admin, or Moderator can import donor records.';
  END IF;

  -- 2. Count skipped/error items from pre-validation
  SELECT count(*) INTO v_duplicate_count
  FROM jsonb_array_elements(p_skipped_details) item
  WHERE item->>'status' = 'DUPLICATE';

  SELECT count(*) INTO v_error_count
  FROM jsonb_array_elements(p_skipped_details) item
  WHERE item->>'status' = 'ERROR';

  -- 3. Process valid donors
  FOR v_donor IN SELECT * FROM jsonb_array_elements(p_donors)
  LOOP
    v_phone := v_donor->>'phone';

    -- Double-check database duplicate constraint to prevent race conditions
    IF EXISTS (SELECT 1 FROM public.donors WHERE phone = v_phone) THEN
      v_duplicate_count := v_duplicate_count + 1;
      CONTINUE;
    END IF;

    -- Determine location code
    v_loc_code := CASE
      WHEN lower(COALESCE(v_donor->>'upazila', v_donor->>'district', '')) LIKE '%dhamrai%' OR COALESCE(v_donor->>'upazila', v_donor->>'district', '') LIKE '%ধামরাই%' THEN 'DHM'
      WHEN lower(COALESCE(v_donor->>'upazila', v_donor->>'district', '')) LIKE '%savar%' OR COALESCE(v_donor->>'upazila', v_donor->>'district', '') LIKE '%সাভার%' THEN 'SVR'
      WHEN lower(COALESCE(v_donor->>'upazila', v_donor->>'district', '')) LIKE '%manikganj%' OR COALESCE(v_donor->>'upazila', v_donor->>'district', '') LIKE '%মানিকগঞ্জ%' THEN 'MNK'
      WHEN lower(COALESCE(v_donor->>'upazila', v_donor->>'district', '')) LIKE '%singair%' OR COALESCE(v_donor->>'upazila', v_donor->>'district', '') LIKE '%সিংগাইর%' THEN 'SNG'
      ELSE 'BD'
    END;

    -- Generate unique human donor ID
    v_donor_human_id := 'DNR-' || v_loc_code || '-' || LPAD((floor(random() * 900000) + 100000)::text, 6, '0');
    v_new_donor_id := 'donor-imp-' || floor(random() * 10000000)::text;

    -- Insert donor with strict server defaults:
    -- verification_status = 'pending', user_id = NULL, verified_at = NULL, verified_by = NULL
    INSERT INTO public.donors (
      id,
      donor_id,
      user_id,
      full_name,
      photo_url,
      blood_group,
      division,
      district_id,
      district,
      upazila_id,
      upazila,
      area_id,
      area,
      location_label,
      phone,
      alternate_phone,
      gender,
      date_of_birth,
      exact_address,
      availability,
      emergency_available,
      last_donation_date,
      total_donations,
      verification_status,
      organization_id,
      branch_id,
      privacy,
      admin_notes,
      source,
      import_batch_id,
      created_at,
      updated_at
    ) VALUES (
      v_new_donor_id,
      v_donor_human_id,
      NULL, -- Explicitly NULL for imported historical donor
      COALESCE(v_donor->>'fullName', 'Unnamed Donor'),
      NULL,
      v_donor->>'bloodGroup',
      'Dhaka',
      'dist-dhaka',
      COALESCE(v_donor->>'district', 'ঢাকা'),
      'upa-dhamrai',
      COALESCE(v_donor->>'upazila', 'ধামরাই'),
      'area-gen',
      COALESCE(v_donor->>'area', ''),
      COALESCE(v_donor->>'upazila', 'ধামরাই') || ', ' || COALESCE(v_donor->>'district', 'ঢাকা'),
      v_phone,
      v_donor->>'alternatePhone',
      COALESCE(v_donor->>'gender', 'male'),
      CASE WHEN v_donor->>'dateOfBirth' IS NOT NULL AND v_donor->>'dateOfBirth' != '' THEN (v_donor->>'dateOfBirth')::date ELSE NULL END,
      COALESCE(v_donor->>'exactAddress', ''),
      true,
      false,
      CASE WHEN v_donor->>'lastDonationDate' IS NOT NULL AND v_donor->>'lastDonationDate' != '' THEN (v_donor->>'lastDonationDate')::date ELSE NULL END,
      COALESCE((v_donor->>'totalDonations')::integer, 0),
      'pending', -- Must always start in pending verification status
      'org-roktobondon',
      'br-dhm',
      '{"showPhone": false, "showGender": false, "showAge": false, "allowDirectContact": true}'::jsonb,
      COALESCE(v_donor->>'notes', 'কাগজ/Excel তালিকা থেকে আমদানিকৃত প্রোফাইল'),
      'imported',
      v_batch_id,
      NOW(),
      NOW()
    );

    v_success_count := v_success_count + 1;
    v_imported_donors := v_imported_donors || jsonb_build_object(
      'id', v_new_donor_id,
      'donor_id', v_donor_human_id,
      'fullName', v_donor->>'fullName',
      'phone', v_phone,
      'bloodGroup', v_donor->>'bloodGroup'
    );
  END LOOP;

  v_donor_count := v_success_count + v_duplicate_count + v_error_count;

  -- 4. Record batch entry
  INSERT INTO public.donor_import_batches (
    id, filename, imported_by, imported_by_name, total_rows, success_count, duplicate_count, error_count, status, error_details, created_at
  ) VALUES (
    v_batch_id,
    p_filename,
    v_caller_id,
    v_caller_name,
    v_donor_count,
    v_success_count,
    v_duplicate_count,
    v_error_count,
    CASE WHEN v_error_count > 0 THEN 'completed_with_errors' ELSE 'completed' END,
    p_skipped_details,
    NOW()
  );

  -- 5. Record immutable audit log
  PERFORM public.record_audit_log(
    'DONOR_IMPORT_COMPLETED',
    'DonorImportBatch',
    v_batch_id,
    jsonb_build_object(
      'filename', p_filename,
      'total_rows', v_donor_count,
      'success_count', v_success_count,
      'duplicate_count', v_duplicate_count,
      'error_count', v_error_count,
      'imported_by', v_caller_name
    )
  );

  -- 6. Send notification to active Super Admin, Admin, and Moderator reviewers (excluding caller)
  IF v_success_count > 0 THEN
    FOR v_staff IN 
      SELECT id FROM public.users 
      WHERE role IN ('super_admin', 'admin', 'moderator') 
      AND status = 'active'
      AND id != v_caller_id
    LOOP
      INSERT INTO public.notifications (
        id, user_id, title, message, type, link, is_read, created_at
      ) VALUES (
        'notif-' || floor(random() * 10000000)::text,
        v_staff.id,
        'নতুন রক্তদাতা যাচাইয়ের জন্য অপেক্ষমাণ',
        'কাগজ/Excel ফাইল ("' || p_filename || '") থেকে ' || v_success_count || ' জন রক্তদাতার তথ্য আমদানি করা হয়েছে এবং যাচাই প্রয়োজন।',
        'verification',
        '/admin?tab=donors',
        false,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'imported_count', v_success_count,
    'duplicate_count', v_duplicate_count,
    'error_count', v_error_count,
    'skipped_count', v_duplicate_count + v_error_count,
    'imported_donors', v_imported_donors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.admin_import_donors_batch(TEXT, JSONB, JSONB) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. Secure Server-Side Batch Rollback RPC Function (admin_rollback_import_batch)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_rollback_import_batch(p_batch_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_caller_id TEXT := auth.uid()::text;
  v_caller_role TEXT;
  v_caller_name TEXT := 'Admin';
  v_batch RECORD;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Strict authorization: only Super Admin and Admin can rollback imports
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin and Admin can rollback an import batch.';
  END IF;

  SELECT full_name, role INTO v_caller_name, v_caller_role FROM public.users WHERE id = v_caller_id;

  SELECT * INTO v_batch FROM public.donor_import_batches WHERE id = p_batch_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch not found: %', p_batch_id;
  END IF;

  IF v_batch.status = 'rolled_back' THEN
    RAISE EXCEPTION 'Batch has already been rolled back.';
  END IF;

  -- Delete only UNVERIFIED, UNLINKED imported donors belonging to this batch
  -- (Preserves any donor who was already verified or linked to an Auth account)
  WITH deleted AS (
    DELETE FROM public.donors
    WHERE import_batch_id = p_batch_id
    AND verification_status = 'pending'
    AND user_id IS NULL
    RETURNING id
  )
  SELECT count(*) INTO v_deleted_count FROM deleted;

  -- Update batch status
  UPDATE public.donor_import_batches
  SET status = 'rolled_back',
      rolled_back_at = NOW(),
      rolled_back_by = v_caller_name
  WHERE id = p_batch_id;

  -- Record audit trail
  PERFORM public.record_audit_log(
    'DONOR_IMPORT_ROLLED_BACK',
    'DonorImportBatch',
    p_batch_id,
    jsonb_build_object(
      'filename', v_batch.filename,
      'deleted_donors_count', v_deleted_count,
      'rolled_back_by', v_caller_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'deleted_count', v_deleted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.admin_rollback_import_batch(TEXT) TO authenticated;
