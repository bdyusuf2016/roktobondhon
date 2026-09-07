-- ==============================================================================
-- ROKTOBONDHON - ATOMIC DONOR VERIFICATION RPC & RLS SYNCHRONIZATION
-- ==============================================================================
-- Fixes live production bug where verification_logs was inserted but public.donors
-- verification_status remained 'pending'.
-- 
-- Enforces:
-- 1. Atomic logical transaction: update donors + insert verification_logs together.
-- 2. Caller authorization: authenticated staff/admin check in PostgreSQL.
-- 3. Idempotency: prevents duplicate verification logs on repeated clicks.
-- 4. Server-verified verifier identity (no client-forged verified_by).
-- 5. Strict row-count validation (ensures exactly 1 donor row was updated).
-- ==============================================================================

-- 1. Helper function ensure is_staff() is up-to-date with secure search_path
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND role IN ('super_admin', 'admin', 'moderator', 'volunteer')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Atomic Donor Verification RPC Function
CREATE OR REPLACE FUNCTION public.verify_donor(
  p_donor_id TEXT,
  p_status TEXT DEFAULT 'verified',
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id TEXT := auth.uid()::text;
  v_user_role TEXT;
  v_user_name TEXT;
  v_donor RECORD;
  v_log_id TEXT;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_rows_updated INT;
BEGIN
  -- A. Ensure caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required to verify donors.';
  END IF;

  -- B. Validate caller role and retrieve authoritative full name from public.users
  SELECT role, full_name INTO v_user_role, v_user_name
  FROM public.users
  WHERE id = v_caller_id AND status = 'active';

  IF v_user_role IS NULL OR v_user_role NOT IN ('super_admin', 'admin', 'moderator', 'volunteer') THEN
    RAISE EXCEPTION 'Unauthorized: Only active staff and administrators can verify donors.';
  END IF;

  -- C. Validate target status
  IF p_status NOT IN ('verified', 'suspended', 'rejected', 'pending', 'unverified') THEN
    RAISE EXCEPTION 'Invalid verification status: %', p_status;
  END IF;

  -- D. Locate target donor (support primary key donors.id, with fallback to donors.donor_id)
  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = p_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    SELECT * INTO v_donor
    FROM public.donors
    WHERE donor_id = p_donor_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Donor not found with identifier: %', p_donor_id;
    END IF;
  END IF;

  -- E. Duplicate Verification Protection / Idempotency
  -- If donor is already in target status, return cleanly without creating duplicate audit records
  IF v_donor.verification_status = p_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'message', 'Donor is already in status ' || p_status,
      'donor_id', v_donor.id,
      'human_id', v_donor.donor_id,
      'status', v_donor.verification_status,
      'verified_by', v_donor.verified_by,
      'verified_at', v_donor.verified_at
    );
  END IF;

  -- F. Atomic UPDATE on public.donors
  UPDATE public.donors
  SET
    verification_status = p_status,
    verified_by = COALESCE(v_user_name, 'Staff Verifier'),
    verified_at = v_now,
    admin_notes = CASE 
      WHEN p_notes IS NOT NULL AND TRIM(p_notes) <> '' THEN TRIM(p_notes)
      ELSE admin_notes 
    END,
    updated_at = v_now
  WHERE id = v_donor.id;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated <> 1 THEN
    RAISE EXCEPTION 'Failed to update donor record: expected 1 row, got %', v_rows_updated;
  END IF;

  -- G. Atomic INSERT into public.verification_logs
  -- Preserves verification_logs.donor_id = donors.id foreign key relationship
  v_log_id := 'vlog-' || EXTRACT(EPOCH FROM v_now)::bigint || '-' || substr(md5(random()::text), 1, 6);

  INSERT INTO public.verification_logs (
    id,
    donor_id,
    status,
    verified_by,
    notes,
    timestamp
  ) VALUES (
    v_log_id,
    v_donor.id,
    p_status,
    COALESCE(v_user_name, 'Staff Verifier'),
    COALESCE(TRIM(p_notes), ''),
    v_now
  );

  -- H. Return authoritative response
  RETURN jsonb_build_object(
    'success', true,
    'already_verified', false,
    'donor_id', v_donor.id,
    'human_id', v_donor.donor_id,
    'status', p_status,
    'verified_by', COALESCE(v_user_name, 'Staff Verifier'),
    'verified_at', v_now,
    'log_id', v_log_id
  );
END;
$$;

-- Grant execution to authenticated users (role checked inside function)
GRANT EXECUTE ON FUNCTION public.verify_donor(TEXT, TEXT, TEXT) TO authenticated;

-- 3. Synchronize donors UPDATE policy
DROP POLICY IF EXISTS "Donors can update own record" ON public.donors;
DROP POLICY IF EXISTS "Donors/Admins can update donor records" ON public.donors;

CREATE POLICY "Donors can update own record" ON public.donors
  FOR UPDATE USING (auth.uid()::text = user_id OR public.is_staff())
  WITH CHECK (auth.uid()::text = user_id OR public.is_staff());

-- 4. Synchronize verification_logs INSERT policy
DROP POLICY IF EXISTS "Admins can insert verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Staff can record verification logs" ON public.verification_logs;

CREATE POLICY "Staff can record verification logs" ON public.verification_logs
  FOR INSERT WITH CHECK (public.is_staff());
