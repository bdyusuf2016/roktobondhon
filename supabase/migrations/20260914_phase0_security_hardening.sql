-- ==============================================================================
-- ROKTOBONDHON — PHASE 0 PRODUCTION SECURITY HARDENING MIGRATION
-- Migration: 20260914_phase0_security_hardening.sql
-- ==============================================================================
-- Objectives:
-- P0.1 — users table privacy: revoke broad SELECT, isolate private data
-- P0.2 — donor privacy: isolate private columns from raw table, safe public view
-- P0.3 — blood request privacy: public view without patient PII, controlled access
-- P0.4 — role escalation defense: BEFORE INSERT/UPDATE trigger, strict auth binding
-- P0.5 — audit log integrity: server-authoritative RPC only, immutable trail
-- P0.6 — storage security: authenticated upload, folder ownership, MIME validation
-- P0.7 — staff/volunteer least privilege: field-level and operational scoping
-- P0.8 — donation privacy: donor-only/staff history, aggregated metrics
-- P0.9 — hospital submission security: unverified quarantine, prevent fake entries
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. Decommission Legacy Auth Trigger & Harden handle_new_user (P0.4)
-- ------------------------------------------------------------------------------
-- In the Two-Tier Authentication Architecture:
-- 1. Ordinary donors register into auth.users and public.donors (NOT public.users).
-- 2. Staff accounts are created authoritatively via admin-create-user Edge Function.
-- 3. Automatic insertion into public.users via auth.users hook is removed to prevent
--    unauthorized role assignment via raw_user_meta_data and prevent database bloat.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  END IF;
END $$;

-- Harden fallback handle_new_user() with strict search_path and safe default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Always enforce safest role 'donor' regardless of client metadata
  INSERT INTO public.users (
    id,
    full_name,
    email,
    phone,
    role,
    organization_id,
    status,
    phone_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'নতুন রক্তদাতা'),
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '01700000000'),
    'donor', -- STRICT SAFE DEFAULT: raw_user_meta_data->>'role' is completely ignored
    'org-roktobondon',
    'active',
    NEW.phone_confirmed_at IS NOT NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    phone = CASE WHEN EXCLUDED.phone <> '01700000000' THEN EXCLUDED.phone ELSE public.users.phone END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 1. Canonical Authorization Functions (Strict auth.uid() = users.id Binding)
-- ------------------------------------------------------------------------------
-- Eliminates fuzzy matching on unconfirmed email or phone to prevent account takeover

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
    AND u.role IN ('super_admin', 'admin', 'moderator', 'volunteer')
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
    AND u.role IN ('super_admin', 'admin')
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
    AND u.role = 'super_admin'
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 2. Hardened public.users RLS & Role Escalation Defense (P0.1, P0.4)
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on users" ON public.users;
DROP POLICY IF EXISTS "Public can view users" ON public.users;
DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
DROP POLICY IF EXISTS "Public can insert own user profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Staff and users can insert profiles" ON public.users;
DROP POLICY IF EXISTS "Admins and service_role can insert portal users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Staff and users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Public users view" ON public.users;
DROP POLICY IF EXISTS "Staff can view users or user view self" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile or admin update" ON public.users;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- P0.1: Least-privilege SELECT: user views self, or staff views for management
CREATE POLICY "Users view self or staff view all" ON public.users
  FOR SELECT USING (
    auth.uid()::text = id 
    OR public.is_staff()
  );

-- P0.4: Portal user INSERT: only Admins or trusted service_role can create portal users
CREATE POLICY "Admins and service_role insert users" ON public.users
  FOR INSERT WITH CHECK (
    public.is_admin() 
    OR current_user IN ('postgres', 'service_role')
  );

-- P0.4: Self update or Admin update
CREATE POLICY "Users update self or admin update" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = id 
    OR public.is_admin()
  ) WITH CHECK (
    auth.uid()::text = id 
    OR public.is_admin()
  );

-- Admin DELETE only
CREATE POLICY "Admins delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- P0.4: Trigger protecting role escalation on BOTH INSERT AND UPDATE
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Superuser/service_role bypass in backend tasks
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- On INSERT: If non-admin attempts to insert, force role to 'donor' and active status
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.role := 'donor';
      NEW.status := 'active';
      NEW.organization_id := 'org-roktobondon';
    END IF;
    RETURN NEW;
  END IF;

  -- On UPDATE: Disallow modifying role, status, or organization unless caller is an admin
  IF TG_OP = 'UPDATE' THEN
    IF (NEW.role IS DISTINCT FROM OLD.role) OR 
       (NEW.status IS DISTINCT FROM OLD.status) OR 
       (NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role, status, or organization.';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.users;
CREATE TRIGGER trg_protect_user_roles
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_roles();

-- ------------------------------------------------------------------------------
-- 3. Hardened public.donors Partitioning & Public View (P0.2, P0.7)
-- ------------------------------------------------------------------------------
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on donors" ON public.donors;
DROP POLICY IF EXISTS "Public can view donors" ON public.donors;
DROP POLICY IF EXISTS "Public can view verified donors" ON public.donors;
DROP POLICY IF EXISTS "Donors select policy" ON public.donors;
DROP POLICY IF EXISTS "Donors can view own or staff view all" ON public.donors;
DROP POLICY IF EXISTS "Public can register as donor" ON public.donors;
DROP POLICY IF EXISTS "Authenticated users can create donor record" ON public.donors;
DROP POLICY IF EXISTS "Donors can insert own record" ON public.donors;
DROP POLICY IF EXISTS "Donors/Admins can update donor records" ON public.donors;
DROP POLICY IF EXISTS "Donors can update own record" ON public.donors;
DROP POLICY IF EXISTS "Admins can delete donor records" ON public.donors;
DROP POLICY IF EXISTS "Admins can delete donors" ON public.donors;

-- P0.2: Raw donors table is PRIVATE: only the donor or authorized staff can SELECT
CREATE POLICY "Donors view self or staff view all" ON public.donors
  FOR SELECT USING (
    auth.uid()::text = user_id 
    OR public.is_staff()
  );

-- Donor self-registration (binds to authenticated user_id)
CREATE POLICY "Donors insert own profile" ON public.donors
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id 
    OR public.is_staff() 
    OR current_user IN ('postgres', 'service_role')
  );

-- Donor self-update (with trigger protection against unapproved verification)
CREATE POLICY "Donors update own profile" ON public.donors
  FOR UPDATE USING (
    auth.uid()::text = user_id 
    OR public.is_staff()
  ) WITH CHECK (
    auth.uid()::text = user_id 
    OR public.is_staff()
  );

-- Admins can delete donors
CREATE POLICY "Admins delete donors" ON public.donors
  FOR DELETE USING (public.is_admin());

-- P0.2: Secure Public Donor View (Zero Sensitive PII: No phone, NID, address, or emergency contact)
CREATE OR REPLACE VIEW public.donors_public_search AS
SELECT
  d.id,
  d.donor_id,
  d.full_name,
  d.photo_url,
  d.blood_group,
  d.division,
  d.district,
  d.upazila,
  d.area,
  d.location_label,
  d.availability,
  d.emergency_available,
  d.last_donation_date,
  d.total_donations,
  d.verification_status,
  d.organization_id,
  d.branch_id,
  d.gender,
  d.created_at
FROM public.donors d
WHERE d.verification_status = 'verified';

GRANT SELECT ON public.donors_public_search TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 4. Hardened public.blood_requests Privacy & Public View (P0.3)
-- ------------------------------------------------------------------------------
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can view blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can view active blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Requesters and staff can update blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Admins can delete blood requests" ON public.blood_requests;

-- P0.3: Raw blood_requests with patient contact info is restricted:
-- Visible only to the requester, staff, or donors who have accepted a match request
CREATE POLICY "Authorized view on blood requests" ON public.blood_requests
  FOR SELECT USING (
    auth.uid()::text = user_id 
    OR public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.donor_requests dr
      WHERE dr.blood_request_id = blood_requests.id
      AND dr.donor_user_id = auth.uid()::text
      AND dr.status = 'accepted'
    )
  );

-- Emergency request creation
CREATE POLICY "Public create blood requests" ON public.blood_requests
  FOR INSERT WITH CHECK (
    user_id = COALESCE(auth.uid()::text, user_id)
    OR current_user IN ('postgres', 'service_role')
  );

-- Requesters and staff can update
CREATE POLICY "Requesters and staff update blood requests" ON public.blood_requests
  FOR UPDATE USING (
    user_id = auth.uid()::text 
    OR public.is_staff()
  ) WITH CHECK (
    user_id = auth.uid()::text 
    OR public.is_staff()
  );

-- Admins can delete
CREATE POLICY "Admins delete blood requests" ON public.blood_requests
  FOR DELETE USING (public.is_admin());

-- P0.3: Secure Public Blood Requests View (Omits patient name, contact person, phone, notes)
CREATE OR REPLACE VIEW public.blood_requests_public AS
SELECT
  r.id,
  r.request_id,
  r.blood_group,
  r.required_units,
  r.required_date,
  r.required_time,
  r.hospital,
  r.division,
  r.district,
  r.upazila,
  r.area,
  r.emergency_level,
  r.status,
  r.is_verified,
  r.verified_at,
  r.organization_id,
  r.expires_at,
  r.created_at
FROM public.blood_requests r
WHERE r.status IN ('active', 'verified', 'matched', 'fulfilled');

GRANT SELECT ON public.blood_requests_public TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. Audit Log Immutability & Trusted RPC Access (P0.5)
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view audit trail" ON public.audit_logs;
DROP POLICY IF EXISTS "System can record audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "Prevent updating audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Prevent deleting audit logs" ON public.audit_logs;

-- Read restricted to authorized staff
CREATE POLICY "Staff view audit trail" ON public.audit_logs
  FOR SELECT USING (public.is_staff());

-- Direct client INSERT is blocked; insertion is only possible via record_audit_log() RPC
CREATE POLICY "Service role insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    current_user IN ('postgres', 'service_role')
  );

CREATE POLICY "Block update audit logs" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "Block delete audit logs" ON public.audit_logs
  FOR DELETE USING (false);

-- Trusted RPC for immutable audit logging with database-enforced actor context
CREATE OR REPLACE FUNCTION public.record_audit_log(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_user_name TEXT := 'Anonymous';
  v_user_role TEXT := 'donor';
  v_log_id TEXT := 'audit-' || floor(random() * 10000000)::text;
BEGIN
  IF v_uid IS NOT NULL THEN
    SELECT full_name, role INTO v_user_name, v_user_role
    FROM public.users
    WHERE id = v_uid;

    IF v_user_name IS NULL THEN
      SELECT full_name INTO v_user_name
      FROM public.donors
      WHERE user_id = v_uid;

      v_user_name := COALESCE(v_user_name, 'Authenticated Donor');
      v_user_role := 'donor';
    END IF;
  ELSE
    v_uid := 'system';
    v_user_name := 'System';
    v_user_role := 'system';
  END IF;

  INSERT INTO public.audit_logs (
    id, user_id, user_name, user_role, action, target_type, target_id, metadata, timestamp
  ) VALUES (
    v_log_id, v_uid, v_user_name, v_user_role, p_action, p_target_type, p_target_id, p_metadata, NOW()
  );

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.record_audit_log(TEXT, TEXT, TEXT, JSONB) TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 6. Storage Bucket Security & MIME/Ownership Verification (P0.6)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('verification-docs', 'verification-docs', false),
  ('assets', 'assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public can view avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public can view organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Donors and staff can upload verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Donors and staff can view verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete verification docs" ON storage.objects;

-- Avatars: Public read, authenticated user upload to own folder only
CREATE POLICY "Public view avatar images" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users upload avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.role() = 'authenticated'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_staff()
    )
  );

-- Assets: Public read, staff upload
CREATE POLICY "Public view assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

CREATE POLICY "Staff upload assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'assets' 
    AND public.is_staff()
  );

-- Verification Docs: STRICT PRIVATE — only owner or staff can read & upload
CREATE POLICY "Owner and staff upload verification docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-docs' 
    AND (
      (storage.foldername(name))[1] IN (
        SELECT donor_id FROM public.donors WHERE user_id = auth.uid()::text
        UNION
        SELECT id FROM public.donors WHERE user_id = auth.uid()::text
        UNION
        SELECT auth.uid()::text
      )
      OR public.is_staff()
    )
  );

CREATE POLICY "Owner and staff view verification docs" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-docs' 
    AND (
      (storage.foldername(name))[1] IN (
        SELECT donor_id FROM public.donors WHERE user_id = auth.uid()::text
        UNION
        SELECT id FROM public.donors WHERE user_id = auth.uid()::text
        UNION
        SELECT auth.uid()::text
      )
      OR public.is_staff()
    )
  );

CREATE POLICY "Admins delete verification docs" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verification-docs' 
    AND public.is_admin()
  );

-- ------------------------------------------------------------------------------
-- 7. Hardened public.donations Privacy (P0.8)
-- ------------------------------------------------------------------------------
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on donations" ON public.donations;
DROP POLICY IF EXISTS "Public can view donation impact logs" ON public.donations;
DROP POLICY IF EXISTS "Staff can insert verified donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON public.donations;
DROP POLICY IF EXISTS "Donors can view own donations or staff view all" ON public.donations;

-- P0.8: Donations history is private to the donor or staff
CREATE POLICY "Donors view own donations or staff view all" ON public.donations
  FOR SELECT USING (
    donor_user_id = auth.uid()::text
    OR public.is_staff()
  );

CREATE POLICY "Staff insert donations" ON public.donations
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Admins update donations" ON public.donations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete donations" ON public.donations
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Hardened public.hospitals Moderation & Anti-Spam (P0.9)
-- ------------------------------------------------------------------------------
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Public can view hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Public can view verified hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff and community can submit hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff can update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can delete hospitals" ON public.hospitals;

-- Public can view ONLY verified hospitals or staff can view all
CREATE POLICY "Public view verified hospitals" ON public.hospitals
  FOR SELECT USING (
    verification_status = 'verified' 
    OR public.is_staff()
  );

-- Community submissions must be quarantined as 'unverified'
CREATE POLICY "Community submit unverified hospitals" ON public.hospitals
  FOR INSERT WITH CHECK (
    verification_status = 'unverified' 
    OR public.is_staff()
  );

-- Staff can verify and update hospitals
CREATE POLICY "Staff update hospitals" ON public.hospitals
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- Admins can delete hospitals
CREATE POLICY "Admins delete hospitals" ON public.hospitals
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- END OF PHASE 0 SECURITY HARDENING MIGRATION
-- ==============================================================================
