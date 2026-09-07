-- ==============================================================================
-- ROKTOBONDHON - FIX RLS PERMISSIONS & PRIVILEGE ESCALATION GUARDS
-- ==============================================================================
-- Run this in Supabase SQL Editor to enforce RLS, immutable audit logs,
-- and server-side role & verification tampering protection.
-- ==============================================================================

-- 1. Secure search path on helper functions (Multi-attribute resolution)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_jwt_email TEXT := lower(auth.jwt() ->> 'email');
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = v_uid
      OR (v_jwt_email IS NOT NULL AND lower(u.email) = v_jwt_email)
      OR EXISTS (
        SELECT 1 FROM auth.users a 
        WHERE a.id = auth.uid() AND lower(u.email) = lower(a.email)
      )
    )
    AND u.role IN ('super_admin', 'admin', 'moderator', 'volunteer')
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_jwt_email TEXT := lower(auth.jwt() ->> 'email');
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = v_uid
      OR (v_jwt_email IS NOT NULL AND lower(u.email) = v_jwt_email)
      OR EXISTS (
        SELECT 1 FROM auth.users a 
        WHERE a.id = auth.uid() AND lower(u.email) = lower(a.email)
      )
    )
    AND u.role IN ('super_admin', 'admin')
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_jwt_email TEXT := lower(auth.jwt() ->> 'email');
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = v_uid
      OR (v_jwt_email IS NOT NULL AND lower(u.email) = v_jwt_email)
      OR EXISTS (
        SELECT 1 FROM auth.users a 
        WHERE a.id = auth.uid() AND lower(u.email) = lower(a.email)
      )
    )
    AND u.role = 'super_admin'
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Prevent arbitrary vertical role escalation on users table
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent elevating anyone to super_admin unless the caller is already a super_admin
  IF (NEW.role = 'super_admin' AND (OLD.role IS DISTINCT FROM 'super_admin')) THEN
    IF NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only super administrators can assign super_admin role.';
    END IF;
  END IF;

  -- Prevent modifying role, status, or organization_id unless administrator
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role, status, or organization.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.users;
CREATE TRIGGER trg_protect_user_roles
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_roles();

-- 3. Prevent donor self-verification tampering
CREATE OR REPLACE FUNCTION public.protect_donor_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status) OR (NEW.verified_by IS DISTINCT FROM OLD.verified_by) OR (NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
    IF NOT public.is_staff() THEN
      RAISE EXCEPTION 'Unauthorized: Only staff can verify or change donor verification status.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_donor_verification ON public.donors;
CREATE TRIGGER trg_protect_donor_verification
  BEFORE UPDATE ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donor_verification();

-- 4. Prevent fund donation status forgery & non-admin mutations
CREATE OR REPLACE FUNCTION public.protect_fund_donations()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can modify or verify fund donations.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_fund_donations ON public.fund_donations;
CREATE TRIGGER trg_protect_fund_donations
  BEFORE UPDATE ON public.fund_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_fund_donations();

-- 5. Strict immutable audit trail
DROP POLICY IF EXISTS "Prevent updating audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Prevent deleting audit logs" ON public.audit_logs;

CREATE POLICY "Prevent updating audit logs" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "Prevent deleting audit logs" ON public.audit_logs
  FOR DELETE USING (false);

-- 6. Atomic Donor Verification RPC Function
-- Leverages canonical public.is_staff() to guarantee single source of authorization truth.
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
  v_user_name TEXT;
  v_donor RECORD;
  v_log_id TEXT;
  v_now TIMESTAMPTZ := clock_timestamp();
  v_rows_updated INT;
BEGIN
  -- A. Canonical role check: super_admin, admin, moderator, volunteer permitted
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only staff can verify or change donor verification status.';
  END IF;

  -- B. Retrieve server-authoritative caller name
  SELECT u.full_name INTO v_user_name
  FROM public.users u
  WHERE (
    u.id = auth.uid()::text
    OR (auth.jwt() ->> 'email' IS NOT NULL AND lower(u.email) = lower(auth.jwt() ->> 'email'))
    OR EXISTS (SELECT 1 FROM auth.users a WHERE a.id = auth.uid() AND lower(u.email) = lower(a.email))
  )
  AND u.status = 'active'
  ORDER BY CASE WHEN u.id = auth.uid()::text THEN 0 ELSE 1 END
  LIMIT 1;

  IF v_user_name IS NULL OR TRIM(v_user_name) = '' THEN
    v_user_name := COALESCE(auth.jwt() ->> 'user_metadata' ->> 'full_name', 'Staff Verifier');
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
    verified_by = v_user_name,
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
    v_user_name,
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
    'verified_by', v_user_name,
    'verified_at', v_now,
    'log_id', v_log_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_donor(TEXT, TEXT, TEXT) TO authenticated;


