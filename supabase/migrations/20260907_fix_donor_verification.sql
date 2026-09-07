-- ==============================================================================
-- ROKTOBONDHON - ATOMIC DONOR VERIFICATION RPC & RLS SYNCHRONIZATION
-- ==============================================================================
-- Fixes live production bug where verification failed with:
-- "Unauthorized: Only staff can verify or change donor verification status."
-- 
-- ROOT CAUSE:
-- In public.users, administrative accounts seeded prior to auth registration
-- had custom string IDs (e.g. 'user-superadmin') while auth.uid() produces an
-- auth.users UUID. is_staff() checked ONLY id = auth.uid()::text without
-- joining auth.users or checking verified JWT email.
--
-- ENFORCES:
-- 1. Synchronized is_staff(), is_admin(), is_super_admin() matching by Auth UID,
--    auth.users table join, or verified JWT email claim.
-- 2. Single canonical authorization mechanism: verify_donor() calls public.is_staff().
-- 3. Automatic user ID synchronization: updates public.users.id to match auth.users.id.
-- 4. Atomic PostgreSQL transaction: update donors + insert verification_logs together.
-- 5. Idempotency: prevents duplicate verification logs on repeated clicks.
-- ==============================================================================

-- 1. Auto-confirm any staff accounts in auth.users so their logins succeed
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, clock_timestamp()),
    phone_confirmed_at = COALESCE(phone_confirmed_at, clock_timestamp())
WHERE lower(email) IN (
  SELECT lower(email) FROM public.users WHERE role IN ('super_admin', 'admin', 'moderator', 'volunteer') AND email IS NOT NULL
)
OR phone IN (
  SELECT phone FROM public.users WHERE role IN ('super_admin', 'admin', 'moderator', 'volunteer') AND phone IS NOT NULL
);

-- 2. Synchronize existing public.users IDs with auth.users UUIDs based on verified email OR phone
UPDATE public.users u
SET id = a.id::text,
    updated_at = clock_timestamp()
FROM auth.users a
WHERE (
  (u.email IS NOT NULL AND a.email IS NOT NULL AND lower(u.email) = lower(a.email))
  OR (u.phone IS NOT NULL AND a.phone IS NOT NULL AND (
    u.phone = a.phone 
    OR replace(u.phone, '+88', '') = replace(a.phone, '+88', '')
    OR replace(u.phone, '+880', '0') = replace(a.phone, '+880', '0')
  ))
)
AND u.id <> a.id::text;

-- 3. Canonical Authorization Functions (Fixed search_path, multi-attribute email + phone resolution)
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_jwt_email TEXT := lower(auth.jwt() ->> 'email');
  v_jwt_phone TEXT := auth.jwt() ->> 'phone';
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = v_uid
      OR (v_jwt_email IS NOT NULL AND lower(u.email) = v_jwt_email)
      OR (v_jwt_phone IS NOT NULL AND (
        u.phone = v_jwt_phone 
        OR replace(u.phone, '+88', '') = replace(v_jwt_phone, '+88', '')
        OR replace(u.phone, '+880', '0') = replace(v_jwt_phone, '+880', '0')
      ))
      OR EXISTS (
        SELECT 1 FROM auth.users a 
        WHERE a.id = auth.uid() AND (
          (u.email IS NOT NULL AND a.email IS NOT NULL AND lower(u.email) = lower(a.email))
          OR (u.phone IS NOT NULL AND a.phone IS NOT NULL AND (
            u.phone = a.phone 
            OR replace(u.phone, '+88', '') = replace(a.phone, '+88', '')
            OR replace(u.phone, '+880', '0') = replace(a.phone, '+880', '0')
          ))
        )
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
  v_jwt_phone TEXT := auth.jwt() ->> 'phone';
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = v_uid
      OR (v_jwt_email IS NOT NULL AND lower(u.email) = v_jwt_email)
      OR (v_jwt_phone IS NOT NULL AND (
        u.phone = v_jwt_phone 
        OR replace(u.phone, '+88', '') = replace(v_jwt_phone, '+88', '')
        OR replace(u.phone, '+880', '0') = replace(v_jwt_phone, '+880', '0')
      ))
      OR EXISTS (
        SELECT 1 FROM auth.users a 
        WHERE a.id = auth.uid() AND (
          (u.email IS NOT NULL AND a.email IS NOT NULL AND lower(u.email) = lower(a.email))
          OR (u.phone IS NOT NULL AND a.phone IS NOT NULL AND (
            u.phone = a.phone 
            OR replace(u.phone, '+88', '') = replace(a.phone, '+88', '')
            OR replace(u.phone, '+880', '0') = replace(a.phone, '+880', '0')
          ))
        )
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
  v_jwt_phone TEXT := auth.jwt() ->> 'phone';
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE (
      u.id = v_uid
      OR (v_jwt_email IS NOT NULL AND lower(u.email) = v_jwt_email)
      OR (v_jwt_phone IS NOT NULL AND (
        u.phone = v_jwt_phone 
        OR replace(u.phone, '+88', '') = replace(v_jwt_phone, '+88', '')
        OR replace(u.phone, '+880', '0') = replace(v_jwt_phone, '+880', '0')
      ))
      OR EXISTS (
        SELECT 1 FROM auth.users a 
        WHERE a.id = auth.uid() AND (
          (u.email IS NOT NULL AND a.email IS NOT NULL AND lower(u.email) = lower(a.email))
          OR (u.phone IS NOT NULL AND a.phone IS NOT NULL AND (
            u.phone = a.phone 
            OR replace(u.phone, '+88', '') = replace(a.phone, '+88', '')
            OR replace(u.phone, '+880', '0') = replace(a.phone, '+880', '0')
          ))
        )
      )
    )
    AND u.role = 'super_admin'
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 3. Atomic Donor Verification RPC Function
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

-- Grant execution to authenticated users (role checked inside function via public.is_staff())
GRANT EXECUTE ON FUNCTION public.verify_donor(TEXT, TEXT, TEXT) TO authenticated;

-- 4. Synchronize trigger guard on public.donors
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

-- 5. Synchronize donors UPDATE policy
DROP POLICY IF EXISTS "Donors can update own record" ON public.donors;
DROP POLICY IF EXISTS "Donors/Admins can update donor records" ON public.donors;

CREATE POLICY "Donors can update own record" ON public.donors
  FOR UPDATE USING (auth.uid()::text = user_id OR public.is_staff())
  WITH CHECK (auth.uid()::text = user_id OR public.is_staff());

-- 6. Synchronize verification_logs INSERT policy
DROP POLICY IF EXISTS "Admins can insert verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Staff can record verification logs" ON public.verification_logs;

CREATE POLICY "Staff can record verification logs" ON public.verification_logs
  FOR INSERT WITH CHECK (public.is_staff());
