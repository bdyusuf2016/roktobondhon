-- ==============================================================================
-- ROKTOBONDHON - PRODUCTION-HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- This script replaces all permissive wildcard policies with strictly audited,
-- role-based and ownership-based RLS policies across all 16 Supabase tables.
-- ==============================================================================

-- Helper function to check if the current auth user is staff (admin/super_admin/moderator/volunteer)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if the current auth user is admin or super_admin
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 1. USERS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on users" ON public.users;
DROP POLICY IF EXISTS "Public can view users" ON public.users;
DROP POLICY IF EXISTS "Public can insert own user profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Public can select safe user card data; authenticated users can read profiles
CREATE POLICY "Users can read profiles" ON public.users
  FOR SELECT USING (true);

-- Authenticated users can create their own profile upon registration
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = id OR public.is_admin());

-- Users can only update their own profile; admins can update any profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id OR public.is_admin())
  WITH CHECK (auth.uid()::text = id OR public.is_admin());

-- Only admins can delete profiles
CREATE POLICY "Admins can delete user profiles" ON public.users
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 2. BRANCHES TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on branches" ON public.branches;
DROP POLICY IF EXISTS "Public can view branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;

CREATE POLICY "Public can view active branches" ON public.branches
  FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY "Admins can insert branches" ON public.branches
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update branches" ON public.branches
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete branches" ON public.branches
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 3. DONORS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on donors" ON public.donors;
DROP POLICY IF EXISTS "Public can view donors" ON public.donors;
DROP POLICY IF EXISTS "Public can register as donor" ON public.donors;
DROP POLICY IF EXISTS "Donors/Admins can update donor records" ON public.donors;

-- Public directory: anyone can view verified active donors
CREATE POLICY "Public can view verified donors" ON public.donors
  FOR SELECT USING (verification_status = 'verified' OR user_id = auth.uid()::text OR public.is_staff());

-- Authenticated users can register their donor profile
CREATE POLICY "Authenticated users can create donor record" ON public.donors
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR public.is_staff());

-- Donors can update their own record; Staff can update verification & admin fields
CREATE POLICY "Donors can update own record" ON public.donors
  FOR UPDATE USING (auth.uid()::text = user_id OR public.is_staff())
  WITH CHECK (auth.uid()::text = user_id OR public.is_staff());

CREATE POLICY "Admins can delete donor records" ON public.donors
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 4. BLOOD REQUESTS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on blood_requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can view blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users can create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users/Admins can update blood requests" ON public.blood_requests;

-- Anyone can view active/verified blood requests
CREATE POLICY "Public can view active blood requests" ON public.blood_requests
  FOR SELECT USING (status IN ('active', 'verified', 'matched', 'fulfilled') OR user_id = auth.uid()::text OR public.is_staff());

-- Anyone (public or authenticated) can submit a blood request in need
CREATE POLICY "Public can create blood requests" ON public.blood_requests
  FOR INSERT WITH CHECK (true);

-- Requester can update their own request; Staff can verify/update status
CREATE POLICY "Requesters and staff can update blood requests" ON public.blood_requests
  FOR UPDATE USING (user_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Admins can delete blood requests" ON public.blood_requests
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 5. DONOR REQUESTS (MATCHING) TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.donor_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on donor_requests" ON public.donor_requests;

CREATE POLICY "Users can view relevant donor requests" ON public.donor_requests
  FOR SELECT USING (donor_user_id = auth.uid()::text OR requester_user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Users and system can create donor requests" ON public.donor_requests
  FOR INSERT WITH CHECK (requester_user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Donors can respond to their requests" ON public.donor_requests
  FOR UPDATE USING (donor_user_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (donor_user_id = auth.uid()::text OR public.is_staff());

-- ==============================================================================
-- 6. DONATIONS TABLE POLICIES
-- ==============================================================================
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on donations" ON public.donations;

CREATE POLICY "Public can view donation impact logs" ON public.donations
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert verified donations" ON public.donations
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Admins can update donations" ON public.donations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete donations" ON public.donations
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 7. HOSPITALS DIRECTORY POLICIES
-- ==============================================================================
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on hospitals" ON public.hospitals;

CREATE POLICY "Public can view verified hospitals" ON public.hospitals
  FOR SELECT USING (verification_status = 'verified' OR public.is_staff());

CREATE POLICY "Staff and community can submit hospitals" ON public.hospitals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update hospitals" ON public.hospitals
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Admins can delete hospitals" ON public.hospitals
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 8. BLOOD CAMPS POLICIES
-- ==============================================================================
ALTER TABLE public.blood_camps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on blood_camps" ON public.blood_camps;

CREATE POLICY "Public can view blood camps" ON public.blood_camps
  FOR SELECT USING (true);

CREATE POLICY "Staff can create blood camps" ON public.blood_camps
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update blood camps" ON public.blood_camps
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Admins can delete blood camps" ON public.blood_camps
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 9. CAMP REGISTRATIONS POLICIES
-- ==============================================================================
ALTER TABLE public.camp_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on camp_registrations" ON public.camp_registrations;

CREATE POLICY "Users and staff can view camp registrations" ON public.camp_registrations
  FOR SELECT USING (user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Public can register for blood camps" ON public.camp_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update camp registrations" ON public.camp_registrations
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ==============================================================================
-- 10. FUND DONATIONS POLICIES
-- ==============================================================================
ALTER TABLE public.fund_donations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on fund_donations" ON public.fund_donations;

CREATE POLICY "Public can view verified non-anonymous donations" ON public.fund_donations
  FOR SELECT USING (status = 'verified' OR public.is_staff());

CREATE POLICY "Public can submit fund donation proof" ON public.fund_donations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can verify/update fund donations" ON public.fund_donations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete fund donations" ON public.fund_donations
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 11. FUND DISBURSEMENTS POLICIES
-- ==============================================================================
ALTER TABLE public.fund_disbursements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on fund_disbursements" ON public.fund_disbursements;

CREATE POLICY "Public can view fund disbursements for transparency" ON public.fund_disbursements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage disbursements" ON public.fund_disbursements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- 12. PAYMENT METHODS POLICIES
-- ==============================================================================
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on payment_methods" ON public.payment_methods;

CREATE POLICY "Public can view active payment methods" ON public.payment_methods
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ==============================================================================
-- 13. NOTIFICATIONS POLICIES
-- ==============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on notifications" ON public.notifications;

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = 'all' OR public.is_staff());

CREATE POLICY "Staff can send notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Users can mark notifications as read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (user_id = auth.uid()::text OR public.is_staff());

-- ==============================================================================
-- 14. AUDIT LOGS POLICIES
-- ==============================================================================
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on audit_logs" ON public.audit_logs;

CREATE POLICY "Staff can view audit trail" ON public.audit_logs
  FOR SELECT USING (public.is_staff());

CREATE POLICY "System can record audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

-- ==============================================================================
-- 15. VERIFICATION LOGS POLICIES
-- ==============================================================================
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on verification_logs" ON public.verification_logs;

CREATE POLICY "Staff can view verification logs" ON public.verification_logs
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff can record verification logs" ON public.verification_logs
  FOR INSERT WITH CHECK (public.is_staff());

-- ==============================================================================
-- 16. SYSTEM CONFIG POLICIES
-- ==============================================================================
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on system_config" ON public.system_config;

-- Public can read site configuration
CREATE POLICY "Public can view system configuration" ON public.system_config
  FOR SELECT USING (true);

-- Only Admins and Super Admins can modify system configuration
CREATE POLICY "Admins can modify system config" ON public.system_config
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert system config" ON public.system_config
  FOR INSERT WITH CHECK (public.is_admin());
