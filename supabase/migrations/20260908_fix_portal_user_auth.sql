-- ==============================================================================
-- ROKTOBONDHON - PORTAL USER PROFILE & ROLE SECURITY MIGRATION
-- Migration: 20260908_fix_portal_user_auth.sql
-- ==============================================================================
-- Architecture:
-- 1. Portal User creation is performed authoritative server-side via Supabase Edge Function
--    (`admin-create-user`) using supabaseAdmin.auth.admin.createUser({ email_confirm: true }).
-- 2. No direct SQL INSERTs into auth.users or auth.identities are permitted.
-- 3. public.users.id strictly maps to the generated auth.users.id (UUID).
-- 4. public.users RLS allows service_role and authenticated staff/admins to insert synced profiles.
-- 5. protect_user_roles() trigger strictly prevents unauthorized privilege escalation.
-- ==============================================================================

-- 1. Ensure public.users RLS allows administrators & service_role to insert user profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Staff and users can insert profiles" ON public.users;

CREATE POLICY "Staff and users can insert profiles" ON public.users
  FOR INSERT WITH CHECK (
    auth.uid()::text = id 
    OR public.is_admin()
    OR (current_user = 'service_role')
  );

-- 2. Verify protect_user_roles trigger remains intact and blocks unauthorized escalation
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow direct database superuser/administrator in Supabase SQL Editor
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

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

-- 3. Document security constraint: no plaintext passwords in public tables
COMMENT ON TABLE public.users IS 'Public user profiles strictly synchronized with auth.users. Passwords must never be stored here.';
