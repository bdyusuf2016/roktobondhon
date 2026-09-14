-- ==============================================================================
-- র ক্ত ব ন্ধ ন (ROKTOBONDON) - COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==============================================================================
-- Run this SQL in your Supabase Dashboard > SQL Editor to initialize all tables,
-- indexes, row-level security (RLS), storage buckets, and initial system config.
-- This script is 100% IDEMPOTENT (safe to run multiple times without any errors).
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. USERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY, -- Maps to Supabase Auth UID or custom ID
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'donor' CHECK (role IN ('super_admin', 'admin', 'moderator', 'volunteer', 'donor', 'recipient')),
  organization_id TEXT NOT NULL DEFAULT 'org-roktobondon',
  branch_id TEXT DEFAULT 'br-dhm',
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. BRANCHES / CHAPTERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.branches (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL DEFAULT 'org-roktobondon',
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  district TEXT NOT NULL,
  upazila TEXT NOT NULL,
  coordinator_name TEXT,
  coordinator_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. DONORS TABLE (Full Profile & Public Directory)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.donors (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL UNIQUE, -- e.g. DNR-DHM-000101
  user_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  division TEXT DEFAULT 'Dhaka',
  district_id TEXT DEFAULT 'dist-dhaka',
  district TEXT NOT NULL DEFAULT 'ঢাকা',
  upazila_id TEXT DEFAULT 'upa-dhamrai',
  upazila TEXT NOT NULL DEFAULT 'ধামরাই',
  area_id TEXT,
  area TEXT NOT NULL DEFAULT 'ধামরাই সদর',
  location_label TEXT,
  age INTEGER,
  weight NUMERIC(5,2),
  availability BOOLEAN NOT NULL DEFAULT true,
  emergency_available BOOLEAN NOT NULL DEFAULT true,
  last_donation_date DATE,
  next_eligible_date DATE,
  first_donation_date DATE,
  total_donations INTEGER NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'suspended')),
  organization_id TEXT NOT NULL DEFAULT 'org-roktobondon',
  branch_id TEXT DEFAULT 'br-dhm',
  phone TEXT NOT NULL,
  email TEXT,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  date_of_birth DATE,
  exact_address TEXT,
  emergency_contact TEXT,
  admin_notes TEXT,
  nid_or_id_number TEXT,
  privacy JSONB NOT NULL DEFAULT '{"showPhone": true, "showGender": true, "showAge": false, "allowDirectContact": true}'::jsonb,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. BLOOD REQUESTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.blood_requests (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE, -- e.g. BD-2026-000184
  user_id TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  required_units INTEGER NOT NULL DEFAULT 1,
  required_date DATE NOT NULL,
  required_time TEXT NOT NULL,
  hospital TEXT NOT NULL,
  division TEXT NOT NULL DEFAULT 'Dhaka',
  district TEXT NOT NULL DEFAULT 'Dhaka',
  upazila TEXT NOT NULL DEFAULT 'Dhamrai',
  area TEXT NOT NULL DEFAULT 'ধামরাই সদর',
  contact_person TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  relationship TEXT NOT NULL,
  emergency_level TEXT NOT NULL DEFAULT 'NORMAL' CHECK (emergency_level IN ('LOW', 'NORMAL', 'URGENT', 'CRITICAL')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'verified', 'active', 'matched', 'fulfilled', 'cancelled', 'expired')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  organization_id TEXT DEFAULT 'org-roktobondon',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. DONOR REQUESTS TABLE (Direct matching & Response)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.donor_requests (
  id TEXT PRIMARY KEY,
  blood_request_id TEXT NOT NULL REFERENCES public.blood_requests(id) ON DELETE CASCADE,
  donor_id TEXT NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  donor_user_id TEXT NOT NULL,
  requester_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'maybe', 'declined')),
  decline_reason TEXT,
  match_score NUMERIC(5,2) NOT NULL DEFAULT 100,
  patient_name TEXT NOT NULL,
  hospital TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  emergency_level TEXT NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- ==============================================================================
-- 6. DONATIONS TABLE (Logged Blood Donation Histories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.donations (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  donor_user_id TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  request_id TEXT,
  blood_request_id TEXT,
  donor_request_id TEXT REFERENCES public.donor_requests(id) ON DELETE SET NULL,
  donation_date DATE NOT NULL,
  hospital TEXT NOT NULL,
  location TEXT,
  units INTEGER NOT NULL DEFAULT 1,
  donation_type TEXT NOT NULL DEFAULT 'Whole Blood' CHECK (donation_type IN ('Whole Blood', 'Platelets', 'Plasma', 'RBC')),
  source TEXT DEFAULT 'request',
  camp_id TEXT,
  verified_by TEXT NOT NULL,
  verification_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_donor_request_id 
  ON public.donations(donor_request_id) 
  WHERE donor_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_donations_donor_user_id ON public.donations(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donations_blood_request_id ON public.donations(blood_request_id);

-- ==============================================================================
-- 7. HOSPITALS & BLOOD BANKS DIRECTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.hospitals (
  id TEXT PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'government' CHECK (category IN ('government', 'medical_college', 'private', 'blood_bank')),
  district TEXT NOT NULL,
  upazila TEXT NOT NULL,
  address TEXT NOT NULL,
  hotline TEXT NOT NULL,
  emergency_phone TEXT,
  ambulance_phone TEXT,
  has_blood_bank BOOLEAN NOT NULL DEFAULT false,
  has_icu BOOLEAN NOT NULL DEFAULT false,
  is_open_24_hours BOOLEAN NOT NULL DEFAULT true,
  map_url TEXT,
  notes TEXT,
  is_community_added BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'verified' CHECK (verification_status IN ('verified', 'unverified')),
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. BLOOD CAMPS & DRIVES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.blood_camps (
  id TEXT PRIMARY KEY,
  title_bn TEXT NOT NULL,
  title_en TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  partner_hospital TEXT,
  division TEXT NOT NULL DEFAULT 'Dhaka',
  district TEXT NOT NULL,
  upazila TEXT NOT NULL,
  venue_address TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  target_units INTEGER NOT NULL DEFAULT 100,
  collected_units INTEGER DEFAULT 0,
  contact_person TEXT,
  contact_phone TEXT,
  banner_url TEXT,
  description_bn TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  registered_count INTEGER NOT NULL DEFAULT 0,
  map_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 9. CAMP REGISTRATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.camp_registrations (
  id TEXT PRIMARY KEY,
  camp_id TEXT NOT NULL REFERENCES public.blood_camps(id) ON DELETE CASCADE,
  camp_title TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  blood_group TEXT NOT NULL,
  preferred_time TEXT,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'donated', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. FUND DONATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fund_donations (
  id TEXT PRIMARY KEY,
  donor_name TEXT NOT NULL,
  donor_phone TEXT NOT NULL,
  donor_email TEXT,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bKash', 'Nagad', 'Rocket', 'Upay', 'Bank')),
  transaction_id TEXT NOT NULL,
  account_number TEXT,
  fund_cause TEXT NOT NULL DEFAULT 'জরুরি রক্তদান সহায়তা',
  area TEXT,
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  organization_id TEXT DEFAULT 'org-roktobondon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. FUND DISBURSEMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.fund_disbursements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  cause TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  recipient TEXT NOT NULL,
  area TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  voucher_no TEXT,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. PAYMENT METHOD CONFIGURATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bKash', 'Nagad', 'Rocket', 'Upay', 'Bank')),
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'personal' CHECK (account_type IN ('personal', 'merchant', 'agent')),
  instructions_bn TEXT NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 13. NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- specific userId or 'all'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'system' CHECK (type IN ('request', 'match', 'verification', 'donation', 'system')),
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 14. AUDIT LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'system',
  user_name TEXT NOT NULL DEFAULT 'System',
  user_role TEXT NOT NULL DEFAULT 'volunteer',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 15. VERIFICATION LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  verified_by TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 16. SYSTEM CONFIG TABLE (Central Platform Configuration)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.system_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- AUTOMATIC TIMESTAMP TRIGGERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_donors_updated_at ON public.donors;
CREATE TRIGGER trigger_donors_updated_at
  BEFORE UPDATE ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_blood_requests_updated_at ON public.blood_requests;
CREATE TRIGGER trigger_blood_requests_updated_at
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_system_config_updated_at ON public.system_config;
CREATE TRIGGER trigger_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================================================
-- SUPABASE AUTH SYNCHRONIZATION (TWO-TIER ARCHITECTURE)
-- ==============================================================================
-- In the Two-Tier Authentication Architecture:
-- 1. Ordinary donors register into auth.users and public.donors (NOT public.users).
-- 2. Staff accounts are created authoritatively via admin-create-user Edge Function.
-- 3. Automatic insertion into public.users via auth.users hook is removed to prevent
--    unauthorized role assignment via raw_user_meta_data and eliminate account bloat.

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

-- ==============================================================================
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON public.donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_district ON public.donors(district);
CREATE INDEX IF NOT EXISTS idx_donors_upazila ON public.donors(upazila);
CREATE INDEX IF NOT EXISTS idx_donors_availability ON public.donors(availability);
CREATE INDEX IF NOT EXISTS idx_donors_verification_status ON public.donors(verification_status);
CREATE INDEX IF NOT EXISTS idx_donors_matching_composite ON public.donors(blood_group, district, upazila, availability, verification_status);

CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_upazila ON public.blood_requests(upazila);
CREATE INDEX IF NOT EXISTS idx_blood_requests_emergency ON public.blood_requests(emergency_level);
CREATE INDEX IF NOT EXISTS idx_blood_requests_created_at ON public.blood_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blood_camps_status ON public.blood_camps(status);
CREATE INDEX IF NOT EXISTS idx_blood_camps_district ON public.blood_camps(district);
CREATE INDEX IF NOT EXISTS idx_blood_camps_start_date ON public.blood_camps(start_date);
CREATE INDEX IF NOT EXISTS idx_camp_registrations_camp_id ON public.camp_registrations(camp_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_donor_requests_donor_user_id ON public.donor_requests(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donor_requests_active_count ON public.donor_requests(blood_request_id, status);
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_blood_requests_status_emergency ON public.blood_requests(status, emergency_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS (Multi-Attribute Resolution)
-- ==============================================================================
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

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_camps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camp_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- 1. Users Policies
DROP POLICY IF EXISTS "Public can view users" ON public.users;
DROP POLICY IF EXISTS "Public can insert own user profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.users;
DROP POLICY IF EXISTS "Staff and users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Staff can view users or user view self" ON public.users;
DROP POLICY IF EXISTS "Users view self or staff view all" ON public.users;
DROP POLICY IF EXISTS "Admins and service_role insert users" ON public.users;
DROP POLICY IF EXISTS "Users update self or admin update" ON public.users;
DROP POLICY IF EXISTS "Admins delete users" ON public.users;

CREATE POLICY "Users view self or staff view all" ON public.users
  FOR SELECT USING (
    auth.uid()::text = id 
    OR public.is_staff()
  );

CREATE POLICY "Admins and service_role insert users" ON public.users
  FOR INSERT WITH CHECK (
    public.is_admin() 
    OR current_user IN ('postgres', 'service_role')
  );

CREATE POLICY "Users update self or admin update" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = id 
    OR public.is_admin()
  ) WITH CHECK (
    auth.uid()::text = id 
    OR public.is_admin()
  );

CREATE POLICY "Admins delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- Trigger: Prevent privilege escalation on both INSERT and UPDATE
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_admin() THEN
      NEW.role := 'donor';
      NEW.status := 'active';
      NEW.organization_id := 'org-roktobondon';
    END IF;
    RETURN NEW;
  END IF;

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

-- 2. Branches Policies
DROP POLICY IF EXISTS "Public can view branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can manage branches" ON public.branches;
DROP POLICY IF EXISTS "Public can view active branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can insert branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can update branches" ON public.branches;
DROP POLICY IF EXISTS "Admins can delete branches" ON public.branches;

CREATE POLICY "Public can view active branches" ON public.branches
  FOR SELECT USING (is_active = true OR public.is_staff());

CREATE POLICY "Admins can insert branches" ON public.branches
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update branches" ON public.branches
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete branches" ON public.branches
  FOR DELETE USING (public.is_admin());

-- 3. Donors Policies
DROP POLICY IF EXISTS "Public can view donors" ON public.donors;
DROP POLICY IF EXISTS "Public can register as donor" ON public.donors;
DROP POLICY IF EXISTS "Donors/Admins can update donor records" ON public.donors;
DROP POLICY IF EXISTS "Public can view verified donors" ON public.donors;
DROP POLICY IF EXISTS "Authenticated users can create donor record" ON public.donors;
DROP POLICY IF EXISTS "Donors can update own record" ON public.donors;
DROP POLICY IF EXISTS "Admins can delete donor records" ON public.donors;
DROP POLICY IF EXISTS "Donors view self or staff view all" ON public.donors;
DROP POLICY IF EXISTS "Donors insert own profile" ON public.donors;
DROP POLICY IF EXISTS "Donors update own profile" ON public.donors;
DROP POLICY IF EXISTS "Admins delete donors" ON public.donors;

CREATE POLICY "Donors view self or staff view all" ON public.donors
  FOR SELECT USING (
    auth.uid()::text = user_id 
    OR public.is_staff()
  );

CREATE POLICY "Donors insert own profile" ON public.donors
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id 
    OR public.is_staff() 
    OR current_user IN ('postgres', 'service_role')
  );

CREATE POLICY "Donors update own profile" ON public.donors
  FOR UPDATE USING (
    auth.uid()::text = user_id 
    OR public.is_staff()
  ) WITH CHECK (
    auth.uid()::text = user_id 
    OR public.is_staff()
  );

CREATE POLICY "Admins delete donors" ON public.donors
  FOR DELETE USING (public.is_admin());

-- 4. Blood Requests Policies
DROP POLICY IF EXISTS "Public can view blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users can create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users/Admins can update blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can view active blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Requesters and staff can update blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Admins can delete blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Authorized view on blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Requesters and staff update blood requests" ON public.blood_requests;

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

CREATE POLICY "Public create blood requests" ON public.blood_requests
  FOR INSERT WITH CHECK (
    user_id = COALESCE(auth.uid()::text, user_id)
    OR current_user IN ('postgres', 'service_role')
  );

CREATE POLICY "Requesters and staff update blood requests" ON public.blood_requests
  FOR UPDATE USING (
    user_id = auth.uid()::text 
    OR public.is_staff()
  ) WITH CHECK (
    user_id = auth.uid()::text 
    OR public.is_staff()
  );

CREATE POLICY "Admins delete blood requests" ON public.blood_requests
  FOR DELETE USING (public.is_admin());

-- Trigger: Protect Immutable Blood Request Fields & Enforce Absolute Terminal Protection & Transition Matrix
CREATE OR REPLACE FUNCTION public.protect_blood_request_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Absolute Terminal State Protection (NO BYPASS FOR ANY ROLE, ADMIN, OR SYSTEM)
  -- A terminal blood request is completely immutable: no field may be altered.
  IF OLD.status IN ('fulfilled', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Unauthorized: Modification of a terminal blood request (status: "%") is strictly forbidden.', OLD.status;
  END IF;

  -- B. Enforce Immutable Identity Keys for ALL callers (including staff and admin)
  IF (NEW.id IS DISTINCT FROM OLD.id) OR
     (NEW.request_id IS DISTINCT FROM OLD.request_id) OR
     (NEW.user_id IS DISTINCT FROM OLD.user_id) OR
     (NEW.blood_group IS DISTINCT FROM OLD.blood_group) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) OR
     (NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of immutable blood request identity fields is forbidden.';
  END IF;

  -- C. Database-Authoritative Status Transition Matrix Enforcement
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    -- Disallow direct transition to 'expired' unless executed through trusted system expiration process
    -- Enforced via trusted transaction-local GUC marker 'app.in_blood_request_expiration'
    IF NEW.status = 'expired' THEN
      IF OLD.status NOT IN ('active', 'matched') THEN
        RAISE EXCEPTION 'Invalid transition: blood request must be active or matched to be expired.';
      END IF;
      IF current_setting('app.in_blood_request_expiration', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Direct update to expired is forbidden. Expiration is managed by system automated processes setting trusted transaction context.';
      END IF;
    END IF;

    -- Disallow direct transition to 'fulfilled' unless executed through complete_donation_fulfillment RPC
    -- Enforced via trusted transaction-local GUC marker 'app.in_donation_fulfillment'
    IF NEW.status = 'fulfilled' THEN
      IF OLD.status NOT IN ('active', 'matched') THEN
        RAISE EXCEPTION 'Invalid transition: blood request must be active or matched to be fulfilled.';
      END IF;
      IF current_setting('app.in_donation_fulfillment', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION 'Direct update to fulfilled is forbidden. Fulfillment must occur through complete_donation_fulfillment().';
      END IF;
    END IF;

    -- Enforce transition matrix for each starting status
    IF OLD.status = 'pending' THEN
      IF NEW.status NOT IN ('verified', 'active', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from pending to "%".', NEW.status;
      END IF;
      IF NEW.status IN ('verified', 'active') AND NOT public.is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only staff members can verify or activate blood requests.';
      END IF;

    ELSIF OLD.status = 'verified' THEN
      IF NEW.status NOT IN ('active', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from verified to "%".', NEW.status;
      END IF;
      IF NEW.status = 'active' AND NOT public.is_staff() THEN
        RAISE EXCEPTION 'Unauthorized: Only staff members can activate verified blood requests.';
      END IF;

    ELSIF OLD.status = 'active' THEN
      IF NEW.status NOT IN ('matched', 'cancelled', 'expired', 'fulfilled') THEN
        RAISE EXCEPTION 'Invalid status transition from active to "%".', NEW.status;
      END IF;

    ELSIF OLD.status = 'matched' THEN
      IF NEW.status NOT IN ('active', 'cancelled', 'expired', 'fulfilled') THEN
        RAISE EXCEPTION 'Invalid status transition from matched to "%".', NEW.status;
      END IF;

    ELSE
      RAISE EXCEPTION 'Invalid current status: "%".', OLD.status;
    END IF;
  END IF;

  -- D. For Non-Staff Callers (Requesters):
  IF NOT public.is_staff() THEN
    -- Requester cannot alter staff-only verification fields
    IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified) OR
       (NEW.verified_by IS DISTINCT FROM OLD.verified_by) OR
       (NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
      RAISE EXCEPTION 'Unauthorized: Only staff members can modify verification details.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_blood_request_fields ON public.blood_requests;
CREATE TRIGGER trg_protect_blood_request_fields
  BEFORE UPDATE ON public.blood_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_blood_request_fields();

-- 5. Donor Requests (Matching) Policies
DROP POLICY IF EXISTS "Users can view donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can insert donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can update donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can view relevant donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users and system can create donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Donors can respond to their requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Requesters and staff create donor requests" ON public.donor_requests;

CREATE POLICY "Users can view relevant donor requests" ON public.donor_requests
  FOR SELECT USING (donor_user_id = auth.uid()::text OR requester_user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Requesters and staff create donor requests" ON public.donor_requests
  FOR INSERT WITH CHECK (
    public.is_staff()
    OR (
      requester_user_id = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM public.blood_requests br
        WHERE br.id = blood_request_id
        AND br.user_id = auth.uid()::text
        AND br.status IN ('active', 'pending', 'matched', 'verified')
      )
    )
  );

CREATE POLICY "Donors can respond to their requests" ON public.donor_requests
  FOR UPDATE USING (donor_user_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (donor_user_id = auth.uid()::text OR public.is_staff());

-- Trigger: Strict response-only protection on donor_requests
CREATE OR REPLACE FUNCTION public.protect_donor_request_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow backend service/admin ONLY if not an authenticated client session
  IF (current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL) OR public.is_staff() THEN
    RETURN NEW;
  END IF;

  -- For ordinary donors (donor_user_id = auth.uid()):
  -- Ensure that ONLY status, decline_reason, and responded_at can be modified
  IF (NEW.id IS DISTINCT FROM OLD.id) OR
     (NEW.blood_request_id IS DISTINCT FROM OLD.blood_request_id) OR
     (NEW.donor_id IS DISTINCT FROM OLD.donor_id) OR
     (NEW.donor_user_id IS DISTINCT FROM OLD.donor_user_id) OR
     (NEW.requester_user_id IS DISTINCT FROM OLD.requester_user_id) OR
     (NEW.match_score IS DISTINCT FROM OLD.match_score) OR
     (NEW.patient_name IS DISTINCT FROM OLD.patient_name) OR
     (NEW.hospital IS DISTINCT FROM OLD.hospital) OR
     (NEW.blood_group IS DISTINCT FROM OLD.blood_group) OR
     (NEW.emergency_level IS DISTINCT FROM OLD.emergency_level) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of protected request fields is forbidden.';
  END IF;

  -- Validate allowed response status
  IF NEW.status NOT IN ('pending', 'accepted', 'maybe', 'declined') THEN
    RAISE EXCEPTION 'Invalid status for donor request response: %', NEW.status;
  END IF;

  -- Enforce state transition rules
  IF OLD.status = 'declined' AND NEW.status != 'declined' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify a declined donor request.';
  END IF;

  IF OLD.status = 'accepted' AND NEW.status = 'pending' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Accepted donor request cannot be reset to pending.';
  END IF;

  NEW.responded_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_donor_request_fields ON public.donor_requests;
CREATE TRIGGER trg_protect_donor_request_fields
  BEFORE UPDATE ON public.donor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donor_request_fields();

-- Automated Trigger for Atomic Notification Dispatch
CREATE OR REPLACE FUNCTION public.handle_donor_request_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_notif_id TEXT;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_link TEXT;
BEGIN
  -- A. When a new donor_request is dispatched (AFTER INSERT)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      v_notif_id := 'notif-dreq-' || NEW.id || '-invite';
      v_title := 'জরুরি রক্তদানের নতুন অনুরোধ (' || NEW.blood_group || ')';
      v_message := NEW.hospital || '-এ ' || NEW.blood_group || ' রক্তের জরুরি প্রয়োজন। অনুগ্রহ করে আপনার সম্মতি জানান।';
      v_type := 'request';
      v_link := '/profile?tab=requests';

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
        v_notif_id,
        NEW.donor_user_id,
        v_title,
        v_message,
        v_type,
        v_link,
        false,
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  -- B. When donor responds to the request (AFTER UPDATE of status)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'maybe', 'declined') THEN
      v_notif_id := 'notif-dreq-' || NEW.id || '-' || NEW.status;
      v_type := 'match';
      v_link := '/request/' || NEW.blood_request_id;

      IF NEW.status = 'accepted' THEN
        v_title := 'রক্তদাতা রক্তদানে সম্মতি দিয়েছেন!';
        v_message := 'একজন রক্তদাতা (' || NEW.blood_group || ') আপনার রক্তের অনুরোধে সাড়া দিয়ে রক্তদানে সম্মতি দিয়েছেন।';
      ELSIF NEW.status = 'maybe' THEN
        v_title := 'রক্তদাতা সম্ভাব্য সম্মতি জানিয়েছেন';
        v_message := 'একজন রক্তদাতা (' || NEW.blood_group || ') জানিয়েছেন তিনি সম্ভবত রক্তদান করতে পারবেন।';
      ELSIF NEW.status = 'declined' THEN
        v_title := 'রক্তদাতা অপারগতা প্রকাশ করেছেন';
        v_message := 'একজন রক্তদাতা (' || NEW.blood_group || ') বর্তমান অনুরোধটিতে রক্তদান করতে অপারগতা প্রকাশ করেছেন।';
      END IF;

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
        v_notif_id,
        NEW.requester_user_id,
        v_title,
        v_message,
        v_type,
        v_link,
        false,
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_donor_request_notifications ON public.donor_requests;
CREATE TRIGGER trg_donor_request_notifications
  AFTER INSERT OR UPDATE ON public.donor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_donor_request_notifications();

-- Trigger: Concurrency & Rate Limit on public.donor_requests (Max 5 Pending Requests)
CREATE OR REPLACE FUNCTION public.enforce_donor_request_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_count INTEGER;
  v_breq_status TEXT;
BEGIN
  SELECT status INTO v_breq_status
  FROM public.blood_requests
  WHERE id = NEW.blood_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood request does not exist: %', NEW.blood_request_id;
  END IF;

  IF v_breq_status IN ('fulfilled', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Cannot dispatch donor requests for a % blood request.', v_breq_status;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.donor_requests
    WHERE blood_request_id = NEW.blood_request_id
      AND donor_id = NEW.donor_id
      AND status IN ('pending', 'accepted')
  ) THEN
    RAISE EXCEPTION 'Duplicate: A request has already been sent to this donor for this blood request.';
  END IF;

  IF NEW.status = 'pending' THEN
    SELECT count(*) INTO v_pending_count
    FROM public.donor_requests
    WHERE blood_request_id = NEW.blood_request_id
      AND status = 'pending';

    IF v_pending_count >= 5 THEN
      RAISE EXCEPTION 'Rate limit exceeded: A blood request cannot have more than 5 concurrent pending donor requests.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_enforce_donor_request_limits ON public.donor_requests;
CREATE TRIGGER trg_enforce_donor_request_limits
  BEFORE INSERT ON public.donor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_donor_request_limits();

-- Privacy-Preserving Accepted Donor Contact RPC
CREATE OR REPLACE FUNCTION public.get_accepted_donor_contact(
  p_donor_request_id TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_dreq public.donor_requests%ROWTYPE;
  v_breq public.blood_requests%ROWTYPE;
  v_donor public.donors%ROWTYPE;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view donor contact details.';
  END IF;

  SELECT * INTO v_dreq
  FROM public.donor_requests
  WHERE id = p_donor_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor request not found: %', p_donor_request_id;
  END IF;

  SELECT * INTO v_breq
  FROM public.blood_requests
  WHERE id = v_dreq.blood_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked blood request not found: %', v_dreq.blood_request_id;
  END IF;

  IF v_breq.user_id != v_caller_uid::text AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only the blood request owner or authorized staff can access donor contact details.';
  END IF;

  IF v_dreq.status != 'accepted' THEN
    RAISE EXCEPTION 'Unauthorized: Donor contact details are only disclosed when the request is accepted.';
  END IF;

  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = v_dreq.donor_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor record not found.';
  END IF;

  RETURN jsonb_build_object(
    'donor_id', v_donor.id,
    'human_id', v_donor.donor_id,
    'full_name', v_donor.full_name,
    'phone', v_donor.phone,
    'blood_group', v_donor.blood_group,
    'location_label', v_donor.location_label,
    'photo_url', v_donor.photo_url,
    'last_donation_date', v_donor.last_donation_date,
    'total_donations', v_donor.total_donations
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.get_accepted_donor_contact(TEXT) TO authenticated;

-- Match-State Synchronization
CREATE OR REPLACE FUNCTION public.recompute_blood_request_match_state(
  p_blood_request_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_breq public.blood_requests%ROWTYPE;
  v_accepted_count INTEGER;
BEGIN
  SELECT * INTO v_breq
  FROM public.blood_requests
  WHERE id = p_blood_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_breq.status IN ('fulfilled', 'cancelled', 'expired') THEN
    RETURN;
  END IF;

  SELECT count(*) INTO v_accepted_count
  FROM public.donor_requests
  WHERE blood_request_id = p_blood_request_id
    AND status = 'accepted';

  IF v_accepted_count > 0 AND v_breq.status = 'active' THEN
    UPDATE public.blood_requests
    SET status = 'matched', updated_at = NOW()
    WHERE id = p_blood_request_id;
  ELSIF v_accepted_count = 0 AND v_breq.status = 'matched' THEN
    UPDATE public.blood_requests
    SET status = 'active', updated_at = NOW()
    WHERE id = p_blood_request_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke client execution from internal helper
REVOKE ALL ON FUNCTION public.recompute_blood_request_match_state(TEXT) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_donor_request_match_state()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'accepted' THEN
      PERFORM public.recompute_blood_request_match_state(NEW.blood_request_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.status IS DISTINCT FROM NEW.status) AND (OLD.status = 'accepted' OR NEW.status = 'accepted') THEN
      PERFORM public.recompute_blood_request_match_state(NEW.blood_request_id);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke client execution from trigger function
REVOKE ALL ON FUNCTION public.handle_donor_request_match_state() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_donor_request_match_state ON public.donor_requests;
CREATE TRIGGER trg_donor_request_match_state
  AFTER INSERT OR UPDATE OF status ON public.donor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_donor_request_match_state();

-- 6. Donations Field Protection Trigger & Fulfillment RPC
CREATE OR REPLACE FUNCTION public.protect_donation_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL) OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF (NEW.id IS DISTINCT FROM OLD.id) OR
     (NEW.donor_id IS DISTINCT FROM OLD.donor_id) OR
     (NEW.donor_user_id IS DISTINCT FROM OLD.donor_user_id) OR
     (NEW.blood_request_id IS DISTINCT FROM OLD.blood_request_id) OR
     (NEW.request_id IS DISTINCT FROM OLD.request_id) OR
     (NEW.donor_request_id IS DISTINCT FROM OLD.donor_request_id) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of protected donation relationship fields is forbidden.';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_donation_fields ON public.donations;
CREATE TRIGGER trg_protect_donation_fields
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donation_fields();

CREATE OR REPLACE FUNCTION public.complete_donation_fulfillment(
  p_donor_request_id TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_caller_role TEXT;
  v_caller_name TEXT;
  v_dreq public.donor_requests%ROWTYPE;
  v_breq public.blood_requests%ROWTYPE;
  v_donor public.donors%ROWTYPE;
  v_existing_donation public.donations%ROWTYPE;
  v_donation_id TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_today DATE := CURRENT_DATE;
  v_gender TEXT;
  v_interval_days INTEGER;
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to fulfill donation.';
  END IF;

  SELECT * INTO v_dreq
  FROM public.donor_requests
  WHERE id = p_donor_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor request not found: %', p_donor_request_id;
  END IF;

  IF NOT public.is_staff() THEN
    IF v_dreq.donor_user_id != v_caller_uid::text THEN
      RAISE EXCEPTION 'Unauthorized: Only the assigned donor or staff can complete this donation.';
    END IF;
  END IF;

  IF v_dreq.status != 'accepted' THEN
    RAISE EXCEPTION 'Cannot complete donation for donor request with status "%". Donor request must be accepted first.', v_dreq.status;
  END IF;

  SELECT * INTO v_breq
  FROM public.blood_requests
  WHERE id = v_dreq.blood_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked blood request not found: %', v_dreq.blood_request_id;
  END IF;

  SELECT * INTO v_existing_donation
  FROM public.donations
  WHERE donor_request_id = p_donor_request_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_fulfilled', true,
      'donation_id', v_existing_donation.id,
      'blood_request_id', v_breq.id,
      'message', 'Donation for this request is already recorded.'
    );
  END IF;

  IF v_breq.status = 'fulfilled' THEN
    RAISE EXCEPTION 'Blood request is already fulfilled.';
  END IF;

  IF v_breq.status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'Cannot complete donation for a % blood request.', v_breq.status;
  END IF;

  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = v_dreq.donor_id
  LIMIT 1;

  v_gender := COALESCE(v_donor.gender, 'male');
  IF v_gender = 'female' THEN
    v_interval_days := 120;
  ELSE
    v_interval_days := 90;
  END IF;

  v_donation_id := 'don-' || extract(epoch from v_now)::bigint || '-' || substr(md5(p_donor_request_id || random()::text), 1, 6);

  INSERT INTO public.donations (
    id,
    donor_id,
    donor_user_id,
    donor_name,
    blood_group,
    request_id,
    blood_request_id,
    donor_request_id,
    donation_date,
    hospital,
    location,
    units,
    donation_type,
    source,
    verified_by,
    verification_date,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_donation_id,
    v_dreq.donor_id,
    v_dreq.donor_user_id,
    COALESCE(v_donor.full_name, 'রক্তদাতা'),
    v_dreq.blood_group,
    v_dreq.blood_request_id,
    v_dreq.blood_request_id,
    v_dreq.id,
    v_today,
    v_dreq.hospital,
    v_dreq.hospital,
    COALESCE(v_breq.required_units, 1),
    'Whole Blood',
    'request',
    'সরাসরি সম্পন্ন (Direct Fulfillment)',
    v_today,
    p_notes,
    v_now,
    v_now
  );

  -- Set Transaction-Local Authorization Marker for RPC-Only Fulfillment
  PERFORM set_config('app.in_donation_fulfillment', 'true', true);

  UPDATE public.blood_requests
  SET status = 'fulfilled',
      updated_at = v_now
  WHERE id = v_breq.id;

  IF v_donor.id IS NOT NULL THEN
    UPDATE public.donors
    SET total_donations = COALESCE(total_donations, 0) + 1,
        last_donation_date = v_today,
        next_eligible_date = v_today + (v_interval_days || ' days')::INTERVAL,
        updated_at = v_now
    WHERE id = v_donor.id;
  END IF;

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
    'notif-fulfill-' || v_dreq.id,
    v_dreq.requester_user_id,
    'রক্তদানের অনুরোধ সফলভাবে সম্পন্ন হয়েছে!',
    'আপনার ' || v_dreq.blood_group || ' রক্তের অনুরোধটিতে রক্তদাতা সফলভাবে রক্তদান সম্পন্ন করেছেন। রোগীর দ্রুত সুস্থতা কামনা করছি।',
    'request',
    '/request/' || v_dreq.blood_request_id,
    false,
    v_now
  ) ON CONFLICT (id) DO NOTHING;

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
    'notif-donor-thanks-' || v_dreq.id,
    v_dreq.donor_user_id,
    'মানবিক রক্তদানের জন্য আন্তরিক ধন্যবাদ ও কৃতজ্ঞতা!',
    'আপনার রক্তদানে একটি মূল্যবান প্রাণ রক্ষা পেয়েছে। কালামপুর রক্ত দান পরিবারের পক্ষ থেকে আপনাকে আন্তরিক মোবারকবাদ ও শুভেচ্ছা।',
    'donation',
    '/profile',
    false,
    v_now
  ) ON CONFLICT (id) DO NOTHING;

  PERFORM public.record_audit_log(
    'BLOOD_REQUEST_FULFILLED',
    'BloodRequest',
    v_breq.id,
    jsonb_build_object(
      'blood_request_id', v_breq.id,
      'donor_request_id', v_dreq.id,
      'donor_id', v_dreq.donor_id,
      'donor_user_id', v_dreq.donor_user_id,
      'requester_user_id', v_dreq.requester_user_id,
      'donation_id', v_donation_id,
      'fulfilled_by', COALESCE(v_caller_uid::text, 'service_role')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'donation_id', v_donation_id,
    'blood_request_id', v_breq.id,
    'status', 'fulfilled',
    'message', 'Donation completed and blood request fulfilled successfully.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Hardened Donations RLS Policies (Purge all legacy policies dynamically)
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'donations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.donations', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Donors and requesters view own donations or staff view all" ON public.donations
  FOR SELECT USING (
    donor_user_id = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.blood_requests br
      WHERE (br.id = public.donations.request_id OR br.id = public.donations.blood_request_id)
        AND br.user_id = auth.uid()::text
    )
    OR public.is_staff()
  );

CREATE POLICY "Staff insert donations" ON public.donations
  FOR INSERT WITH CHECK (
    public.is_staff() OR current_user IN ('postgres', 'service_role')
  );

CREATE POLICY "Admins update donations" ON public.donations
  FOR UPDATE USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

CREATE POLICY "Admins delete donations" ON public.donations
  FOR DELETE USING (
    public.is_admin()
  );

-- 7. Hospitals Directory Policies
DROP POLICY IF EXISTS "Public can view hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins/Public can insert hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can delete hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Public can view verified hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff and community can submit hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Community submit unverified hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff can update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins delete hospitals" ON public.hospitals;

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

-- 8. Blood Camps Policies
DROP POLICY IF EXISTS "Public can view blood camps" ON public.blood_camps;
DROP POLICY IF EXISTS "Admins can insert blood camps" ON public.blood_camps;
DROP POLICY IF EXISTS "Admins can update blood camps" ON public.blood_camps;
DROP POLICY IF EXISTS "Admins can delete blood camps" ON public.blood_camps;
DROP POLICY IF EXISTS "Staff can create blood camps" ON public.blood_camps;
DROP POLICY IF EXISTS "Staff can update blood camps" ON public.blood_camps;

CREATE POLICY "Public can view blood camps" ON public.blood_camps
  FOR SELECT USING (true);

CREATE POLICY "Staff can create blood camps" ON public.blood_camps
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Staff can update blood camps" ON public.blood_camps
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Admins can delete blood camps" ON public.blood_camps
  FOR DELETE USING (public.is_admin());

-- 9. Camp Registrations Policies
DROP POLICY IF EXISTS "Public can view camp registrations" ON public.camp_registrations;
DROP POLICY IF EXISTS "Public can register for camps" ON public.camp_registrations;
DROP POLICY IF EXISTS "Admins can update camp registrations" ON public.camp_registrations;
DROP POLICY IF EXISTS "Users and staff can view camp registrations" ON public.camp_registrations;
DROP POLICY IF EXISTS "Public can register for blood camps" ON public.camp_registrations;
DROP POLICY IF EXISTS "Staff can update camp registrations" ON public.camp_registrations;

CREATE POLICY "Users and staff can view camp registrations" ON public.camp_registrations
  FOR SELECT USING (user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Public can register for blood camps" ON public.camp_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update camp registrations" ON public.camp_registrations
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

-- 10. Fund Donations Policies
DROP POLICY IF EXISTS "Public can view fund donations" ON public.fund_donations;
DROP POLICY IF EXISTS "Public can submit fund donation" ON public.fund_donations;
DROP POLICY IF EXISTS "Admins can update fund donation" ON public.fund_donations;
DROP POLICY IF EXISTS "Public can view verified non-anonymous donations" ON public.fund_donations;
DROP POLICY IF EXISTS "Public can submit fund donation proof" ON public.fund_donations;
DROP POLICY IF EXISTS "Admins can verify/update fund donations" ON public.fund_donations;
DROP POLICY IF EXISTS "Admins can delete fund donations" ON public.fund_donations;

CREATE POLICY "Public can view verified non-anonymous donations" ON public.fund_donations
  FOR SELECT USING (status = 'verified' OR public.is_staff());

CREATE POLICY "Public can submit fund donation proof" ON public.fund_donations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can verify/update fund donations" ON public.fund_donations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete fund donations" ON public.fund_donations
  FOR DELETE USING (public.is_admin());

-- 11. Fund Disbursements Policies
DROP POLICY IF EXISTS "Public can view fund disbursements" ON public.fund_disbursements;
DROP POLICY IF EXISTS "Admins can manage disbursements" ON public.fund_disbursements;
DROP POLICY IF EXISTS "Public can view fund disbursements for transparency" ON public.fund_disbursements;

CREATE POLICY "Public can view fund disbursements for transparency" ON public.fund_disbursements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage disbursements" ON public.fund_disbursements
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 12. Payment Methods Policies
DROP POLICY IF EXISTS "Public can view payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Admins can manage payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Public can view active payment methods" ON public.payment_methods;

CREATE POLICY "Public can view active payment methods" ON public.payment_methods
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can manage payment methods" ON public.payment_methods
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 13. Notifications Policies (Purge all legacy policies dynamically)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid()::text OR user_id = 'all' OR public.is_staff());

CREATE POLICY "Staff can send notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Users can mark notifications as read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (user_id = auth.uid()::text OR public.is_staff());

-- 14. Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view audit trail" ON public.audit_logs;
DROP POLICY IF EXISTS "System can record audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "Prevent updating audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Prevent deleting audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff view audit trail" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Block update audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Block delete audit logs" ON public.audit_logs;

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

-- 15. Verification Logs Policies
DROP POLICY IF EXISTS "Admins can view verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Admins can insert verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Staff can view verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Staff can record verification logs" ON public.verification_logs;

CREATE POLICY "Staff can view verification logs" ON public.verification_logs
  FOR SELECT USING (public.is_staff());

CREATE POLICY "Staff can record verification logs" ON public.verification_logs
  FOR INSERT WITH CHECK (public.is_staff());

-- 16. System Config Policies
DROP POLICY IF EXISTS "Public can view system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can update system config" ON public.system_config;
DROP POLICY IF EXISTS "Public can view system configuration" ON public.system_config;
DROP POLICY IF EXISTS "Admins can modify system config" ON public.system_config;
DROP POLICY IF EXISTS "Admins can insert system config" ON public.system_config;

CREATE POLICY "Public can view system configuration" ON public.system_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can modify system config" ON public.system_config
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can insert system config" ON public.system_config
  FOR INSERT WITH CHECK (public.is_admin());

-- ==============================================================================
-- STORAGE BUCKETS & POLICIES (avatars, documents, assets)
-- ==============================================================================
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
DROP POLICY IF EXISTS "Staff upload assets" ON storage.objects;
DROP POLICY IF EXISTS "Public view avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Public view assets" ON storage.objects;
DROP POLICY IF EXISTS "Owner and staff upload verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Owner and staff view verification docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete verification docs" ON storage.objects;

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

-- ==============================================================================
-- INITIAL SYSTEM CONFIGURATION SEED
-- ==============================================================================
INSERT INTO public.system_config (id, config, updated_at)
VALUES (
  'default',
  '{
    "siteName": "রক্ত দান পরিবার কালামপুর",
    "siteTagline": "মানবতার কল্যাণে রক্তদান",
    "primaryColor": "#dc2626",
    "organizationName": "রক্ত দান পরিবার কালামপুর",
    "organizationPhone": "+8801700000000",
    "organizationEmail": "info@roktobondhon.org",
    "organizationAddress": "কালামপুর, ধামরাই, ঢাকা",
    "emergencyHotline": "+8801700000000",
    "matchingRadiusKm": 25,
    "eligibilityDays": 90,
    "maintenanceMode": false,
    "allowRegistrations": true,
    "autoVerifyDonors": false
  }'::jsonb,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 19. ATOMIC DONOR VERIFICATION RPC FUNCTION
-- ==============================================================================
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
    OR (auth.jwt() ->> 'phone' IS NOT NULL AND (
      u.phone = auth.jwt() ->> 'phone' 
      OR replace(u.phone, '+88', '') = replace(auth.jwt() ->> 'phone', '+88', '')
      OR replace(u.phone, '+880', '0') = replace(auth.jwt() ->> 'phone', '+880', '0')
    ))
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

-- ==============================================================================
-- SECURE PUBLIC VIEWS (Partitioned Safe Access: Zero Sensitive PII)
-- ==============================================================================
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

