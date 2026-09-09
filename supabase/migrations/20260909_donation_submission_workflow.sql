-- ==============================================================================
-- ROKTOBONDHON - DONOR SELF-REPORTED DONATION WORKFLOW MIGRATION
-- Migration: 20260909_donation_submission_workflow.sql
-- ==============================================================================
-- Features:
-- 1. Table public.donation_submissions:
--    - Staging table for ordinary donor self-reported donation events.
--    - Controlled status lifecycle: 'pending', 'needs_info', 'approved', 'rejected', 'cancelled'.
--    - Prevents direct insertion/mutation into official public.donations.
--
-- 2. Hardened Row Level Security (RLS):
--    - Donors can SELECT/INSERT/UPDATE only their own submissions.
--    - Unauthorized clients cannot modify review fields, approved_donation_id, or status.
--    - Direct DELETE is denied for all (cancellation via status = 'cancelled').
--
-- 3. Secure Atomic Approval RPC:
--    - approve_donation_submission(): Atomically validates caller authorization,
--      locks submission, verifies idempotency, inserts official public.donations row,
--      updates submission status, triggers donor metrics sync, sends notification,
--      and records immutable audit log.
--
-- 4. Rejection and Information Request RPCs:
--    - reject_donation_submission() and request_donation_submission_info().
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create public.donation_submissions Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.donation_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id TEXT NOT NULL,
  donor_user_id TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  donation_date DATE NOT NULL,
  hospital TEXT,
  location TEXT,
  camp_id TEXT,
  blood_request_id TEXT,
  units INTEGER NOT NULL DEFAULT 1 CHECK (units > 0 AND units <= 5),
  donation_type TEXT NOT NULL DEFAULT 'Whole Blood',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'needs_info', 'approved', 'rejected', 'cancelled')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT,
  approved_donation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries and duplicate lookups
CREATE INDEX IF NOT EXISTS idx_donation_submissions_donor_user_id ON public.donation_submissions(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donation_submissions_donor_id ON public.donation_submissions(donor_id);
CREATE INDEX IF NOT EXISTS idx_donation_submissions_status ON public.donation_submissions(status);
CREATE INDEX IF NOT EXISTS idx_donation_submissions_donation_date ON public.donation_submissions(donation_date);

-- ------------------------------------------------------------------------------
-- 2. Trigger: Protect Donor Submission Security Fields & Prevent Tampering
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_donation_submission_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_is_staff BOOLEAN;
BEGIN
  v_is_staff := public.is_staff();

  -- Prevent ordinary donors from changing ownership or critical review fields
  IF NOT v_is_staff THEN
    IF NEW.donor_user_id IS DISTINCT FROM OLD.donor_user_id THEN
      RAISE EXCEPTION 'Unauthorized: Modification of donor_user_id is forbidden';
    END IF;

    IF NEW.donor_id IS DISTINCT FROM OLD.donor_id THEN
      RAISE EXCEPTION 'Unauthorized: Modification of donor_id is forbidden';
    END IF;

    IF NEW.approved_donation_id IS DISTINCT FROM OLD.approved_donation_id THEN
      RAISE EXCEPTION 'Unauthorized: Modification of approved_donation_id is forbidden';
    END IF;

    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'Unauthorized: Modification of review metadata is forbidden';
    END IF;

    -- Donors can only change status to 'cancelled' from 'pending'/'needs_info'
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (OLD.status IN ('pending', 'needs_info') AND NEW.status = 'cancelled') THEN
        RAISE EXCEPTION 'Unauthorized: Donors can only cancel pending submissions';
      END IF;
    END IF;

    -- Cannot edit submission once approved or rejected
    IF OLD.status IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify a finalized donation submission';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_donation_submission_fields ON public.donation_submissions;
CREATE TRIGGER trg_protect_donation_submission_fields
  BEFORE UPDATE ON public.donation_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donation_submission_fields();

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies on public.donation_submissions
-- ------------------------------------------------------------------------------
ALTER TABLE public.donation_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Donors view own submissions or staff view all" ON public.donation_submissions;
DROP POLICY IF EXISTS "Donors can insert own pending submission" ON public.donation_submissions;
DROP POLICY IF EXISTS "Donors can update own pending submission or staff update" ON public.donation_submissions;
DROP POLICY IF EXISTS "Direct deletion is forbidden" ON public.donation_submissions;

-- SELECT Policy
CREATE POLICY "Donors view own submissions or staff view all" ON public.donation_submissions
  FOR SELECT USING (
    public.is_staff()
    OR (auth.uid() IS NOT NULL AND donor_user_id = auth.uid()::text)
  );

-- INSERT Policy
CREATE POLICY "Donors can insert own pending submission" ON public.donation_submissions
  FOR INSERT WITH CHECK (
    (auth.uid() IS NOT NULL AND donor_user_id = auth.uid()::text AND status = 'pending')
    OR public.is_staff()
    OR current_user = 'service_role'
  );

-- UPDATE Policy
CREATE POLICY "Donors can update own pending submission or staff update" ON public.donation_submissions
  FOR UPDATE USING (
    public.is_staff()
    OR (
      auth.uid() IS NOT NULL 
      AND donor_user_id = auth.uid()::text 
      AND status IN ('pending', 'needs_info')
    )
    OR current_user = 'service_role'
  );

-- ------------------------------------------------------------------------------
-- 4. Atomic Approval RPC Function (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.approve_donation_submission(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.approve_donation_submission(
  p_submission_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_caller_name TEXT;
  v_submission public.donation_submissions%ROWTYPE;
  v_new_donation_id TEXT;
  v_donor RECORD;
  v_duplicate_count INTEGER := 0;
BEGIN
  -- 1. Verify caller authentication
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL AND current_user != 'service_role' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2. Verify caller role (Must be active super_admin, admin, or moderator)
  IF current_user != 'service_role' THEN
    SELECT role, full_name INTO v_caller_role, v_caller_name
    FROM public.users
    WHERE id = v_caller_uid::text AND status = 'active';

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'moderator') THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators and moderators can approve donation submissions';
    END IF;
  ELSE
    v_caller_name := 'System Service';
  END IF;

  -- 3. Lock submission row to ensure concurrency safety
  SELECT * INTO v_submission
  FROM public.donation_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation submission not found: %', p_submission_id;
  END IF;

  -- 4. Idempotency check: If already approved, return existing donation ID
  IF v_submission.status = 'approved' AND v_submission.approved_donation_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_approved', true,
      'donation_id', v_submission.approved_donation_id,
      'message', 'Submission is already approved'
    );
  END IF;

  -- 5. Status check: Can only approve pending or needs_info
  IF v_submission.status NOT IN ('pending', 'needs_info') THEN
    RAISE EXCEPTION 'Cannot approve submission with status: %', v_submission.status;
  END IF;

  -- 6. Verify linked donor exists
  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = v_submission.donor_id OR donor_id = v_submission.donor_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked donor profile not found for donor_id: %', v_submission.donor_id;
  END IF;

  -- 7. Check for duplicate official donation on same date
  SELECT count(*) INTO v_duplicate_count
  FROM public.donations
  WHERE donor_id = v_submission.donor_id 
    AND donation_date = v_submission.donation_date;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'A verified donation record already exists for this donor on date: %', v_submission.donation_date;
  END IF;

  -- 8. Generate new official donation ID
  v_new_donation_id := 'don-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 6);

  -- 9. Insert official record into public.donations
  INSERT INTO public.donations (
    id,
    donor_id,
    donor_user_id,
    donor_name,
    blood_group,
    donation_date,
    hospital,
    location,
    camp_id,
    blood_request_id,
    units,
    donation_type,
    source,
    verified_by,
    verification_date,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_new_donation_id,
    v_donor.donor_id,
    v_submission.donor_user_id,
    v_submission.donor_name,
    v_submission.blood_group,
    v_submission.donation_date,
    COALESCE(v_submission.hospital, 'ধামরাই রক্তদান কেন্দ্র'),
    COALESCE(v_submission.location, v_submission.hospital, 'ধামরাই'),
    v_submission.camp_id,
    v_submission.blood_request_id,
    v_submission.units,
    v_submission.donation_type,
    'donor_reported',
    v_caller_name,
    CURRENT_DATE::text,
    v_submission.notes,
    NOW(),
    NOW()
  );

  -- 10. Update submission status to approved
  UPDATE public.donation_submissions
  SET status = 'approved',
      approved_donation_id = v_new_donation_id,
      reviewed_by = v_caller_name,
      reviewed_at = NOW(),
      review_notes = p_review_notes,
      updated_at = NOW()
  WHERE id = p_submission_id;

  -- 11. Create confirmation notification for donor
  IF v_submission.donor_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      id,
      user_id,
      title,
      message,
      type,
      link,
      is_read,
      created_at
    ) VALUES (
      'notif-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
      v_submission.donor_user_id,
      'আপনার রক্তদানের তথ্য অনুমোদিত হয়েছে',
      'আপনার জমা দেওয়া রক্তদানের তথ্য (' || v_submission.blood_group || ', তারিখ: ' || v_submission.donation_date || ') সফলভাবে যাচাই ও সিস্টেমে সংরক্ষণ করা হয়েছে। ধন্যবাদ!',
      'donation',
      '/profile',
      false,
      NOW()
    );
  END IF;

  -- 12. Create audit log
  INSERT INTO public.audit_logs (
    id,
    user_id,
    user_name,
    user_role,
    action,
    target_type,
    target_id,
    details,
    created_at
  ) VALUES (
    'audit-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
    COALESCE(v_caller_uid::text, 'system'),
    v_caller_name,
    COALESCE(v_caller_role, 'system'),
    'DONATION_SUBMISSION_APPROVED',
    'DonationSubmission',
    p_submission_id::text,
    jsonb_build_object(
      'submission_id', p_submission_id,
      'donation_id', v_new_donation_id,
      'donor_id', v_submission.donor_id,
      'donation_date', v_submission.donation_date,
      'reviewed_by', v_caller_name,
      'review_notes', p_review_notes
    ),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'donation_id', v_new_donation_id,
    'message', 'Donation submission approved successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 5. Rejection RPC Function (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.reject_donation_submission(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.reject_donation_submission(
  p_submission_id UUID,
  p_reason TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_caller_name TEXT;
  v_submission public.donation_submissions%ROWTYPE;
BEGIN
  -- 1. Verify caller
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL AND current_user != 'service_role' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF current_user != 'service_role' THEN
    SELECT role, full_name INTO v_caller_role, v_caller_name
    FROM public.users
    WHERE id = v_caller_uid::text AND status = 'active';

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'moderator') THEN
      RAISE EXCEPTION 'Unauthorized: Only staff can reject submissions';
    END IF;
  ELSE
    v_caller_name := 'System Service';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  -- 2. Lock and fetch submission
  SELECT * INTO v_submission
  FROM public.donation_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id;
  END IF;

  IF v_submission.status IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Submission is already finalized: %', v_submission.status;
  END IF;

  -- 3. Update status to rejected
  UPDATE public.donation_submissions
  SET status = 'rejected',
      reviewed_by = v_caller_name,
      reviewed_at = NOW(),
      review_notes = p_reason,
      updated_at = NOW()
  WHERE id = p_submission_id;

  -- 4. Notify donor
  IF v_submission.donor_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      id,
      user_id,
      title,
      message,
      type,
      link,
      is_read,
      created_at
    ) VALUES (
      'notif-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
      v_submission.donor_user_id,
      'রক্তদানের তথ্য যাচাই করা যায়নি',
      'আপনার জমা দেওয়া রক্তদানের তথ্য (' || v_submission.donation_date || ') অনুমোদিত হয়নি। কারণ: ' || p_reason,
      'donation',
      '/profile',
      false,
      NOW()
    );
  END IF;

  -- 5. Audit Log
  INSERT INTO public.audit_logs (
    id,
    user_id,
    user_name,
    user_role,
    action,
    target_type,
    target_id,
    details,
    created_at
  ) VALUES (
    'audit-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
    COALESCE(v_caller_uid::text, 'system'),
    v_caller_name,
    COALESCE(v_caller_role, 'system'),
    'DONATION_SUBMISSION_REJECTED',
    'DonationSubmission',
    p_submission_id::text,
    jsonb_build_object(
      'submission_id', p_submission_id,
      'donor_id', v_submission.donor_id,
      'reason', p_reason,
      'reviewed_by', v_caller_name
    ),
    NOW()
  );

  RETURN jsonb_build_object('success', true, 'message', 'Submission rejected');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 6. Request More Information RPC Function (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.request_donation_submission_info(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.request_donation_submission_info(
  p_submission_id UUID,
  p_message TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_caller_name TEXT;
  v_submission public.donation_submissions%ROWTYPE;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL AND current_user != 'service_role' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF current_user != 'service_role' THEN
    SELECT role, full_name INTO v_caller_role, v_caller_name
    FROM public.users
    WHERE id = v_caller_uid::text AND status = 'active';

    IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'admin', 'moderator') THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;
  ELSE
    v_caller_name := 'System Service';
  END IF;

  SELECT * INTO v_submission
  FROM public.donation_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id;
  END IF;

  IF v_submission.status != 'pending' THEN
    RAISE EXCEPTION 'Can only request info on pending submissions';
  END IF;

  UPDATE public.donation_submissions
  SET status = 'needs_info',
      reviewed_by = v_caller_name,
      reviewed_at = NOW(),
      review_notes = p_message,
      updated_at = NOW()
  WHERE id = p_submission_id;

  IF v_submission.donor_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      id,
      user_id,
      title,
      message,
      type,
      link,
      is_read,
      created_at
    ) VALUES (
      'notif-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 4),
      v_submission.donor_user_id,
      'রক্তদানের তথ্য সম্পর্কে অতিরিক্ত তথ্য প্রয়োজন',
      'আপনার রক্তদানের তথ্য যাচাইয়ের জন্য কিছু অতিরিক্ত তথ্য প্রয়োজন: ' || p_message || '। অনুগ্রহ করে প্রোফাইল থেকে আপডেট করুন।',
      'donation',
      '/profile',
      false,
      NOW()
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Info requested');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 7. Grants
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.donation_submissions TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_donation_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_donation_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_donation_submission_info(UUID, TEXT) TO authenticated;
