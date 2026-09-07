-- ==============================================================================
-- ROKTOBONDHON - FIX RLS PERMISSIONS & PRIVILEGE ESCALATION GUARDS
-- ==============================================================================
-- Run this in Supabase SQL Editor to enforce RLS, immutable audit logs,
-- and server-side role & verification tampering protection.
-- ==============================================================================

-- 1. Secure search path on helper functions
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

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()::text
      AND role IN ('super_admin', 'admin')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Prevent arbitrary vertical role escalation on users table
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
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

-- 4. Prevent fund donation status forgery
CREATE OR REPLACE FUNCTION public.protect_fund_donation_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.verified_by IS DISTINCT FROM OLD.verified_by) OR (NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can verify fund donations.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_fund_donation_verification ON public.fund_donations;
CREATE TRIGGER trg_protect_fund_donation_verification
  BEFORE UPDATE ON public.fund_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_fund_donation_verification();

-- 5. Strict immutable audit trail
DROP POLICY IF EXISTS "Prevent updating audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Prevent deleting audit logs" ON public.audit_logs;

CREATE POLICY "Prevent updating audit logs" ON public.audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "Prevent deleting audit logs" ON public.audit_logs
  FOR DELETE USING (false);
