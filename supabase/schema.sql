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
  import_batch_id TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_donor_date ON public.donations(donor_id, donation_date);

-- ==============================================================================
-- 6.1 DONATION SUBMISSIONS TABLE (Offline & Self-Reported Donations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.donation_submissions (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES public.donors(id) ON DELETE CASCADE,
  donor_user_id TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  blood_group TEXT NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  donation_date DATE NOT NULL,
  hospital TEXT,
  location TEXT,
  camp_id TEXT REFERENCES public.blood_camps(id) ON DELETE SET NULL,
  blood_request_id TEXT REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  units INTEGER NOT NULL DEFAULT 1 CHECK (units > 0 AND units <= 4),
  donation_type TEXT NOT NULL DEFAULT 'Whole Blood' CHECK (donation_type IN ('Whole Blood', 'Platelets', 'Plasma', 'RBC')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  approved_donation_id TEXT REFERENCES public.donations(id) ON DELETE SET NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_submissions_donor_date
  ON public.donation_submissions(donor_id, donation_date)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_donation_submissions_status_date
  ON public.donation_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donation_submissions_user
  ON public.donation_submissions(donor_user_id, status);

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

-- Trigger: Field Protection on public.donors (Zero Self-Verification & Metric Forgery)
CREATE OR REPLACE FUNCTION public.protect_donor_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Enforce Immutable Identity Keys for ALL callers (including staff and admin)
  IF (NEW.id IS DISTINCT FROM OLD.id) OR
     (NEW.donor_id IS DISTINCT FROM OLD.donor_id) OR
     (NEW.user_id IS DISTINCT FROM OLD.user_id) OR
     (NEW.blood_group IS DISTINCT FROM OLD.blood_group) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of immutable donor identity fields is forbidden.';
  END IF;

  -- B. Protect Governance Fields: verification_status and admin_notes
  -- Modification is permitted ONLY via authoritative verify_donor_profile() RPC setting transaction marker
  IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status) OR
     (NEW.admin_notes IS DISTINCT FROM OLD.admin_notes) THEN
    IF current_setting('app.in_donor_verification', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Unauthorized: Direct modification of verification_status and admin_notes is forbidden. Mutations must occur via verify_donor_profile().';
    END IF;
  END IF;

  -- C. Protect Metric Fields: total_donations, last_donation_date, next_eligible_date
  -- Modification is permitted ONLY via authorized fulfillment/approval RPCs setting transaction markers
  IF (NEW.total_donations IS DISTINCT FROM OLD.total_donations) OR
     (NEW.last_donation_date IS DISTINCT FROM OLD.last_donation_date) OR
     (NEW.next_eligible_date IS DISTINCT FROM OLD.next_eligible_date) THEN
    IF current_setting('app.in_donation_fulfillment', true) IS DISTINCT FROM 'true' AND
       current_setting('app.in_donation_submission_approval', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Unauthorized: Direct modification of donor metrics and eligibility dates is forbidden.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_donor_fields ON public.donors;
CREATE TRIGGER trg_protect_donor_fields
  BEFORE UPDATE ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donor_fields();

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

-- ==============================================================================
-- 6.1 DONATION SUBMISSIONS POLICIES & TRIGGERS
-- ==============================================================================
ALTER TABLE public.donation_submissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.verify_donation_submission_ownership()
RETURNS TRIGGER AS $$
DECLARE
  v_donor_owner TEXT;
BEGIN
  SELECT user_id INTO v_donor_owner
  FROM public.donors
  WHERE id = NEW.donor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor profile not found: %', NEW.donor_id;
  END IF;

  IF v_donor_owner IS DISTINCT FROM auth.uid()::text AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot submit donation report for another donor profile.';
  END IF;

  NEW.donor_user_id := v_donor_owner;
  NEW.status := 'pending';
  NEW.approved_donation_id := NULL;
  NEW.reviewed_by := NULL;
  NEW.reviewed_at := NULL;
  NEW.review_notes := NULL;
  NEW.created_at := NOW();
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_verify_donation_submission_ownership ON public.donation_submissions;
CREATE TRIGGER trg_verify_donation_submission_ownership
  BEFORE INSERT ON public.donation_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.verify_donation_submission_ownership();

DROP POLICY IF EXISTS "Donors view own submissions or staff view all" ON public.donation_submissions;
DROP POLICY IF EXISTS "Donors insert own submissions" ON public.donation_submissions;
DROP POLICY IF EXISTS "Block direct client update on donation submissions" ON public.donation_submissions;
DROP POLICY IF EXISTS "Admins delete donation submissions" ON public.donation_submissions;

CREATE POLICY "Donors view own submissions or staff view all" ON public.donation_submissions
  FOR SELECT USING (
    donor_user_id = auth.uid()::text
    OR public.is_staff()
  );

CREATE POLICY "Donors insert own submissions" ON public.donation_submissions
  FOR INSERT WITH CHECK (
    donor_user_id = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.donors d
      WHERE d.id = donation_submissions.donor_id
        AND d.user_id = auth.uid()::text
    )
  );

CREATE POLICY "Block direct client update on donation submissions" ON public.donation_submissions
  FOR UPDATE USING (false);

CREATE POLICY "Admins delete donation submissions" ON public.donation_submissions
  FOR DELETE USING (public.is_admin());

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
DROP POLICY IF EXISTS "Staff can view fund donations" ON public.fund_donations;

CREATE POLICY "Staff can view fund donations" ON public.fund_donations
  FOR SELECT TO authenticated USING (public.is_staff());

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
-- PHASE 1D AUTHORITATIVE RPCS
-- ==============================================================================

-- 1. Review Donation Submission RPC (Atomic Approval & Metric Updates)
CREATE OR REPLACE FUNCTION public.review_donation_submission(
  p_submission_id TEXT,
  p_status TEXT,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_sub public.donation_submissions%ROWTYPE;
  v_donor public.donors%ROWTYPE;
  v_donation_id TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_gender TEXT;
  v_interval_days INTEGER;
BEGIN
  -- A. Authentication Check
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to review donation submission.';
  END IF;

  -- B. Authorization Check: Staff Only
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only staff members can review donation submissions.';
  END IF;

  -- C. Parameter Validation
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review status: "%". Status must be "approved" or "rejected".', p_status;
  END IF;

  IF p_status = 'rejected' AND (p_review_notes IS NULL OR trim(p_review_notes) = '') THEN
    RAISE EXCEPTION 'A valid rejection reason is required to reject a donation submission.';
  END IF;

  -- D. Lock target submission row
  SELECT * INTO v_sub
  FROM public.donation_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation submission not found: %', p_submission_id;
  END IF;

  -- E. Terminal State Check
  IF v_sub.status != 'pending' THEN
    RAISE EXCEPTION 'Submission has already been processed (status: "%").', v_sub.status;
  END IF;

  -- F. Lock target donor row
  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = v_sub.donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked donor profile not found.';
  END IF;

  -- G. Handle Approval
  IF p_status = 'approved' THEN
    -- Cross-system duplicate check on public.donations
    IF EXISTS (
      SELECT 1 FROM public.donations
      WHERE donor_id = v_sub.donor_id
        AND donation_date = v_sub.donation_date
    ) THEN
      RAISE EXCEPTION 'A verified donation is already recorded for this donor on %.', v_sub.donation_date;
    END IF;

    -- Determine interval
    v_gender := COALESCE(v_donor.gender, 'male');
    IF v_gender = 'female' THEN
      v_interval_days := 120;
    ELSE
      v_interval_days := 90;
    END IF;

    -- Generate collision-free Donation ID
    v_donation_id := 'don-' || extract(epoch from v_now)::bigint || '-' || substr(md5(p_submission_id || random()::text), 1, 6);

    -- Insert Official Donation Record (Deriving canonical name and blood group from v_donor)
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
      v_donor.id,
      v_donor.user_id,
      COALESCE(v_donor.full_name, 'রক্তদাতা'),
      v_donor.blood_group,
      v_sub.blood_request_id,
      v_sub.blood_request_id,
      NULL,
      v_sub.donation_date,
      v_sub.hospital,
      v_sub.location,
      COALESCE(v_sub.units, 1),
      v_sub.donation_type,
      'self_report',
      v_caller_uid::text,
      v_now::date,
      p_review_notes,
      v_now,
      v_now
    );

    -- Set Transaction Marker for Donor Metric Update
    PERFORM set_config('app.in_donation_submission_approval', 'true', true);

    -- Update Donor Profile Statistics
    UPDATE public.donors
    SET total_donations = COALESCE(total_donations, 0) + 1,
        last_donation_date = CASE
          WHEN last_donation_date IS NULL OR v_sub.donation_date >= last_donation_date THEN v_sub.donation_date
          ELSE last_donation_date
        END,
        next_eligible_date = CASE
          WHEN last_donation_date IS NULL OR v_sub.donation_date >= last_donation_date THEN v_sub.donation_date + (v_interval_days || ' days')::INTERVAL
          ELSE next_eligible_date
        END,
        updated_at = v_now
    WHERE id = v_donor.id;

    -- Update Submission Record to Terminal 'approved'
    UPDATE public.donation_submissions
    SET status = 'approved',
        approved_donation_id = v_donation_id,
        reviewed_by = v_caller_uid::text,
        reviewed_at = v_now,
        review_notes = p_review_notes,
        updated_at = v_now
    WHERE id = v_sub.id;

    -- Dispatch Notification to Donor (Zero sensitive PII)
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
      'notif-sub-app-' || v_sub.id,
      v_sub.donor_user_id,
      'রক্তদানের রিপোর্ট অনুমোদিত হয়েছে!',
      'আপনার ' || v_sub.donation_date || ' তারিখের রক্তদানের রিপোর্টটি সফলভাবে অনুমোদিত হয়েছে এবং প্রোফাইলে যুক্ত করা হয়েছে।',
      'donation',
      '/profile',
      false,
      v_now
    ) ON CONFLICT (id) DO NOTHING;

    -- Record Structured Audit Log
    PERFORM public.record_audit_log(
      'DONATION_SUBMISSION_APPROVED',
      'DonationSubmission',
      v_sub.id,
      jsonb_build_object(
        'submission_id', v_sub.id,
        'donation_id', v_donation_id,
        'donor_id', v_donor.id,
        'donation_date', v_sub.donation_date,
        'approved_by', v_caller_uid::text
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'approved',
      'donation_id', v_donation_id,
      'message', 'Donation submission approved successfully.'
    );

  -- H. Handle Rejection
  ELSIF p_status = 'rejected' THEN
    UPDATE public.donation_submissions
    SET status = 'rejected',
        reviewed_by = v_caller_uid::text,
        reviewed_at = v_now,
        review_notes = p_review_notes,
        updated_at = v_now
    WHERE id = v_sub.id;

    -- Dispatch Rejection Notification to Donor
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
      'notif-sub-rej-' || v_sub.id,
      v_sub.donor_user_id,
      'রক্তদানের রিপোর্ট যাচাইকরণ সংক্রান্ত',
      'আপনার ' || v_sub.donation_date || ' তারিখের রক্তদানের রিপোর্টটি অনুমোদিত হয়নি। কারণ: ' || p_review_notes,
      'donation',
      '/profile',
      false,
      v_now
    ) ON CONFLICT (id) DO NOTHING;

    -- Record Structured Audit Log
    PERFORM public.record_audit_log(
      'DONATION_SUBMISSION_REJECTED',
      'DonationSubmission',
      v_sub.id,
      jsonb_build_object(
        'submission_id', v_sub.id,
        'donor_id', v_donor.id,
        'reason', p_review_notes,
        'rejected_by', v_caller_uid::text
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'message', 'Donation submission rejected.'
    );
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.review_donation_submission(TEXT, TEXT, TEXT) TO authenticated;

-- 2. Authoritative Donor Moderation RPC
CREATE OR REPLACE FUNCTION public.verify_donor_profile(
  p_donor_id TEXT,
  p_new_status TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_donor public.donors%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- A. Authentication Check (auth.uid() is authoritative)
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to update donor verification status.';
  END IF;

  -- B. Authorization Check: Staff Only
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only staff members can verify or moderate donor profiles.';
  END IF;

  -- C. Validate Destination Status
  IF p_new_status NOT IN ('pending', 'verified', 'suspended', 'rejected') THEN
    RAISE EXCEPTION 'Invalid donor verification status: "%".', p_new_status;
  END IF;

  -- D. Lock target donor row
  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = p_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor profile not found: %', p_donor_id;
  END IF;

  -- E. State Machine Transition Validation
  IF v_donor.verification_status = p_new_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_donor.verification_status,
      'message', 'Donor status is already ' || p_new_status
    );
  END IF;

  -- Special Role Restriction: Reinstating rejected donor requires Admin/SuperAdmin
  IF v_donor.verification_status = 'rejected' AND p_new_status = 'verified' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Reinstating a rejected donor requires Administrator privileges.';
  END IF;

  -- F. Set Transaction Marker
  PERFORM set_config('app.in_donor_verification', 'true', true);

  -- G. Update Donor Record
  UPDATE public.donors
  SET verification_status = p_new_status,
      admin_notes = COALESCE(p_admin_notes, admin_notes),
      updated_at = v_now
  WHERE id = v_donor.id;

  -- H. Dispatch Notification
  IF p_new_status = 'verified' THEN
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
      'notif-dnr-ver-' || v_donor.id || '-' || extract(epoch from v_now)::bigint,
      v_donor.user_id,
      'রক্তদাতা প্রোফাইল যাচাইকৃত',
      'অভিনন্দন! আপনার রক্তদাতা প্রোফাইলটি সফলভাবে যাচাই করা হয়েছে। মানবিক সহায়তায় পাশে থাকার জন্য ধন্যবাদ।',
      'system',
      '/profile',
      false,
      v_now
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- I. Record Structured Audit Log
  PERFORM public.record_audit_log(
    'DONOR_STATUS_CHANGED',
    'Donor',
    v_donor.id,
    jsonb_build_object(
      'donor_id', v_donor.id,
      'previous_status', v_donor.verification_status,
      'new_status', p_new_status,
      'admin_notes', p_admin_notes,
      'updated_by', v_caller_uid::text
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'donor_id', v_donor.id,
    'status', p_new_status,
    'message', 'Donor profile status updated successfully.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.verify_donor_profile(TEXT, TEXT, TEXT) TO authenticated;

-- 3. Batch Expiration Maintenance RPC (Trusted Execution Only)
CREATE OR REPLACE FUNCTION public.expire_overdue_blood_requests(
  p_batch_limit INTEGER DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_breq RECORD;
  v_expired_count INTEGER := 0;
  v_expired_ids TEXT[] := ARRAY[]::TEXT[];
  v_now TIMESTAMPTZ := NOW();
  v_lock_acquired BOOLEAN;
BEGIN
  -- A. Clamp batch limit strictly between 1 and 100 (default 50)
  IF p_batch_limit IS NULL OR p_batch_limit < 1 THEN
    p_batch_limit := 50;
  ELSIF p_batch_limit > 100 THEN
    p_batch_limit := 100;
  END IF;

  -- B. Authorization Check: Caller MUST be authorized staff OR executed in trusted backend worker context (service_role / postgres)
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only authorized staff or maintenance jobs can execute request expiration.';
  END IF;

  -- C. Advisory Transaction Lock to prevent concurrent overlapping executions
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext('expire_overdue_blood_requests'));
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'expired_count', 0,
      'expired_ids', ARRAY[]::TEXT[],
      'message', 'Another blood request expiration maintenance job is currently executing.'
    );
  END IF;

  -- D. Set Transaction-Local Marker for Expiration (enforces canonical transition)
  PERFORM set_config('app.in_blood_request_expiration', 'true', true);

  -- E. Fetch and lock overdue requests with 2-day grace period (only active or matched)
  FOR v_breq IN
    SELECT id, request_id, user_id, patient_name, hospital
    FROM public.blood_requests
    WHERE status IN ('active', 'matched')
      AND required_date < (CURRENT_DATE - INTERVAL '2 days')
    ORDER BY required_date ASC
    LIMIT p_batch_limit
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Update status to expired
    UPDATE public.blood_requests
    SET status = 'expired',
        updated_at = v_now
    WHERE id = v_breq.id;

    v_expired_count := v_expired_count + 1;
    v_expired_ids := array_append(v_expired_ids, v_breq.id);

    -- Dispatch closure notification to requester (deterministic deduplication)
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
      'notif-exp-' || v_breq.id,
      v_breq.user_id,
      'রক্তের অনুরোধের মেয়াদ সমাপ্তি',
      'আপনার ' || v_breq.patient_name || ' রোগীর জন্য রক্তের অনুরোধটির নির্ধারিত সময় অতিক্রম করায় এটি সমাপ্ত ঘোষণা করা হয়েছে। প্রয়োজন হলে নতুন অনুরোধ তৈরি করুন।',
      'request',
      '/request/' || v_breq.id,
      false,
      v_now
    ) ON CONFLICT (id) DO NOTHING;

    -- Record Audit Trail (Zero Sensitive PII)
    PERFORM public.record_audit_log(
      'BLOOD_REQUEST_EXPIRED',
      'BloodRequest',
      v_breq.id,
      jsonb_build_object(
        'blood_request_id', v_breq.id,
        'request_id', v_breq.request_id,
        'expired_at', v_now,
        'expired_by', COALESCE(v_caller_uid::text, 'system_maintenance')
      )
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expired_count', v_expired_count,
    'expired_ids', v_expired_ids,
    'message', 'Overdue blood requests processed.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.expire_overdue_blood_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_blood_requests(INTEGER) TO service_role;

-- 4. Idempotent pg_cron Automated Hourly Job Registration
DO $cron_setup$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-blood-requests') THEN
    PERFORM cron.unschedule('expire-overdue-blood-requests');
  END IF;

  PERFORM cron.schedule(
    'expire-overdue-blood-requests',
    '0 * * * *',
    'SELECT public.expire_overdue_blood_requests(100);'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron registration skipped or encountered non-fatal error: %', SQLERRM;
END;
$cron_setup$;

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

-- ==============================================================================
-- PHASE 1E DATABASE OBJECTS: ADMINISTRATIVE OPERATIONS & FINANCIAL GOVERNANCE
-- ==============================================================================

-- 1. AUTHORITATIVE SQL PHONE NORMALIZATION HELPER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.normalize_bangladesh_phone(p_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  v_str TEXT;
  v_digits TEXT;
BEGIN
  IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
    RETURN NULL;
  END IF;

  v_str := TRIM(p_phone);

  -- 1. Convert Bengali numerals (০-৯) to ASCII (0-9)
  v_str := TRANSLATE(v_str, '০১২৩৪৫৬৭৮৯', '0123456789');

  -- 2. Strip all non-digit characters
  v_digits := REGEXP_REPLACE(v_str, '[^0-9]', '', 'g');

  -- 3. Normalize international and national prefixes
  IF LENGTH(v_digits) = 13 AND v_digits LIKE '880%' THEN
    v_digits := SUBSTRING(v_digits FROM 3);
  ELSIF LENGTH(v_digits) = 10 AND v_digits LIKE '1%' THEN
    v_digits := '0' || v_digits;
  END IF;

  -- 4. Validate exact 11 digits with valid Bangladesh mobile operator prefixes: 013, 014, 015, 016, 017, 018, 019
  IF v_digits ~ '^01[3-9][0-9]{8}$' THEN
    RETURN v_digits;
  ELSE
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp;

-- ==============================================================================
-- 2. UPDATE DONOR FIELD PROTECTION TRIGGER & IMPORT BATCH COLUMN
-- ==============================================================================

-- 2.1 Add explicit import_batch_id column to public.donors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'donors' AND column_name = 'import_batch_id'
  ) THEN
    ALTER TABLE public.donors ADD COLUMN import_batch_id TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_donors_import_batch_id
  ON public.donors(import_batch_id)
  WHERE import_batch_id IS NOT NULL;

-- 2.2 Update protect_donor_fields Trigger
CREATE OR REPLACE FUNCTION public.protect_donor_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- A. Enforce Immutable Identity Keys for ALL callers (including staff and admin)
  IF (NEW.id IS DISTINCT FROM OLD.id) OR
     (NEW.donor_id IS DISTINCT FROM OLD.donor_id) OR
     (NEW.user_id IS DISTINCT FROM OLD.user_id) OR
     (NEW.blood_group IS DISTINCT FROM OLD.blood_group) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of immutable donor identity fields is forbidden.';
  END IF;

  -- B. Protect Governance Fields: verification_status, admin_notes, and import_batch_id
  -- Modification is permitted ONLY via authoritative verification/import RPCs setting transaction markers
  IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status) OR
     (NEW.admin_notes IS DISTINCT FROM OLD.admin_notes) OR
     (NEW.import_batch_id IS DISTINCT FROM OLD.import_batch_id) THEN
    IF current_setting('app.in_donor_verification', true) IS DISTINCT FROM 'true' AND
       current_setting('app.in_donor_import', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Unauthorized: Direct modification of verification_status, admin_notes, or import_batch_id is forbidden. Mutations must occur via authoritative RPCs.';
    END IF;
  END IF;

  -- C. Protect Metric Fields: total_donations, last_donation_date, next_eligible_date
  -- Modification is permitted ONLY via authorized fulfillment/approval/manual entry RPCs
  IF (NEW.total_donations IS DISTINCT FROM OLD.total_donations) OR
     (NEW.last_donation_date IS DISTINCT FROM OLD.last_donation_date) OR
     (NEW.next_eligible_date IS DISTINCT FROM OLD.next_eligible_date) THEN
    IF current_setting('app.in_donation_fulfillment', true) IS DISTINCT FROM 'true' AND
       current_setting('app.in_donation_submission_approval', true) IS DISTINCT FROM 'true' AND
       current_setting('app.in_manual_donation_entry', true) IS DISTINCT FROM 'true' AND
       current_setting('app.in_donor_import', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'Unauthorized: Direct modification of donor metrics and eligibility dates is forbidden.';
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- ==============================================================================
-- 3. FINANCIAL GOVERNANCE CONSTRAINTS, INDEXES & TRIGGERS
-- ==============================================================================

-- 3.1 Table Constraints on fund_donations & fund_disbursements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fund_donations_amount'
  ) THEN
    ALTER TABLE public.fund_donations
      ADD CONSTRAINT chk_fund_donations_amount CHECK (amount > 0 AND amount <= 1000000.00);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_fund_disbursements_amount'
  ) THEN
    ALTER TABLE public.fund_disbursements
      ADD CONSTRAINT chk_fund_disbursements_amount CHECK (amount > 0 AND amount <= 5000000.00);
  END IF;
END $$;

-- 3.2 Transaction Deduplication Partial Unique Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_fund_donations_method_txid_active
  ON public.fund_donations(payment_method, UPPER(TRIM(transaction_id)))
  WHERE status IN ('pending', 'verified') AND transaction_id IS NOT NULL AND TRIM(transaction_id) != '';

-- 3.3 Protect Fund Donation Insert Trigger
CREATE OR REPLACE FUNCTION public.protect_fund_donation_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Enforce that new client submissions are strictly 'pending'
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Unauthorized: Fund donations must be submitted with pending status.'
      USING ERRCODE = '42501';
  END IF;

  -- Ensure verification fields cannot be pre-populated by client
  IF NEW.verified_by IS NOT NULL OR NEW.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: Verification metadata cannot be supplied upon donation submission.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_fund_donation_insert ON public.fund_donations;
CREATE TRIGGER trg_protect_fund_donation_insert
  BEFORE INSERT ON public.fund_donations
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_fund_donation_insert();

-- 3.4 Authoritative Fund Verification RPC: verify_fund_donation()
CREATE OR REPLACE FUNCTION public.verify_fund_donation(
  p_donation_id TEXT,
  p_action TEXT, -- 'verify' or 'reject'
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_fnd RECORD;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Forbidden: Staff authorization required to verify fund donations.';
  END IF;

  IF p_action NOT IN ('verify', 'reject') THEN
    RAISE EXCEPTION 'Invalid action: p_action must be "verify" or "reject".';
  END IF;

  IF p_action = 'reject' AND (p_notes IS NULL OR TRIM(p_notes) = '') THEN
    RAISE EXCEPTION 'Invalid request: Rejection reason is required.';
  END IF;

  SELECT * INTO v_fnd
  FROM public.fund_donations
  WHERE id = p_donation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fund donation not found with id: %', p_donation_id;
  END IF;

  IF v_fnd.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Invalid state: Fund donation has already been reviewed (current status: %).', v_fnd.status;
  END IF;

  IF p_action = 'verify' THEN
    UPDATE public.fund_donations
    SET
      status = 'verified',
      verified_by = v_caller_uid::text,
      verified_at = v_now,
      message = CASE
        WHEN p_notes IS NOT NULL AND TRIM(p_notes) != '' THEN
          COALESCE(message || E'\n[যাচাই নোট: ' || p_notes || ']', p_notes)
        ELSE message
      END
    WHERE id = p_donation_id;

    -- Minimized audit data (zero raw phone/email/account PII)
    PERFORM public.record_audit_log(
      'FUND_DONATION_VERIFIED',
      'FundDonation',
      p_donation_id,
      jsonb_build_object(
        'donation_id', p_donation_id,
        'amount', v_fnd.amount,
        'payment_method', v_fnd.payment_method,
        'tx_masked', CASE WHEN v_fnd.transaction_id IS NOT NULL THEN SUBSTRING(v_fnd.transaction_id, 1, 4) || '****' ELSE NULL END,
        'verified_by', v_caller_uid::text,
        'verified_at', v_now,
        'notes', p_notes
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'verified',
      'message', 'তহবিল অনুদান সফলভাবে সত্যায়িত করা হয়েছে।'
    );
  ELSE
    UPDATE public.fund_donations
    SET
      status = 'rejected',
      verified_by = v_caller_uid::text,
      verified_at = v_now,
      message = COALESCE(message || E'\n[প্রত্যাখ্যানের কারণ: ' || p_notes || ']', '[প্রত্যাখ্যানের কারণ: ' || p_notes || ']')
    WHERE id = p_donation_id;

    -- Minimized audit data
    PERFORM public.record_audit_log(
      'FUND_DONATION_REJECTED',
      'FundDonation',
      p_donation_id,
      jsonb_build_object(
        'donation_id', p_donation_id,
        'amount', v_fnd.amount,
        'payment_method', v_fnd.payment_method,
        'rejected_by', v_caller_uid::text,
        'rejection_reason', p_notes,
        'verified_at', v_now
      )
    );

    RETURN jsonb_build_object(
      'success', true,
      'status', 'rejected',
      'message', 'তহবিল অনুদান প্রত্যাখ্যান করা হয়েছে।'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.verify_fund_donation(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_fund_donation(TEXT, TEXT, TEXT) TO authenticated;

-- 3.5 Public Transparency View & Raw Table RLS Isolation
CREATE OR REPLACE VIEW public.fund_donations_public AS
SELECT
  id,
  CASE
    WHEN is_anonymous = true THEN 'বেনামী দাতা'
    ELSE donor_name
  END AS donor_name,
  amount,
  payment_method,
  fund_cause,
  area,
  message,
  is_anonymous,
  status,
  organization_id,
  created_at,
  verified_at
FROM public.fund_donations
WHERE status = 'verified';

GRANT SELECT ON public.fund_donations_public TO anon, authenticated;

-- Raw table RLS: Strictly restrict raw SELECT to authenticated staff to protect PII
ALTER TABLE public.fund_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view fund donations" ON public.fund_donations;
DROP POLICY IF EXISTS "Public can view verified non-anonymous donations" ON public.fund_donations;
DROP POLICY IF EXISTS "Staff can view fund donations" ON public.fund_donations;

CREATE POLICY "Staff can view fund donations" ON public.fund_donations
  FOR SELECT TO authenticated
  USING (public.is_staff());

-- ==============================================================================
-- 4. BLOOD CAMP INTEGRITY CONSTRAINTS, INDEXES & TRIGGERS
-- ==============================================================================

-- 4.1 Single Source of Truth Synchronization for blood_camps.collected_units
CREATE OR REPLACE FUNCTION public.sync_camp_collected_units()
RETURNS TRIGGER AS $$
DECLARE
  v_old_camp_id TEXT;
  v_new_camp_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_camp_id := OLD.camp_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_camp_id := OLD.camp_id;
    v_new_camp_id := NEW.camp_id;
  ELSE
    v_new_camp_id := NEW.camp_id;
  END IF;

  IF v_old_camp_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('camp_collected_units_' || v_old_camp_id));
    UPDATE public.blood_camps
    SET collected_units = (
      SELECT COALESCE(SUM(units), 0)
      FROM public.donations
      WHERE camp_id = v_old_camp_id
    )
    WHERE id = v_old_camp_id;
  END IF;

  IF v_new_camp_id IS NOT NULL AND (v_old_camp_id IS NULL OR v_old_camp_id != v_new_camp_id) THEN
    PERFORM pg_advisory_xact_lock(hashtext('camp_collected_units_' || v_new_camp_id));
    UPDATE public.blood_camps
    SET collected_units = (
      SELECT COALESCE(SUM(units), 0)
      FROM public.donations
      WHERE camp_id = v_new_camp_id
    )
    WHERE id = v_new_camp_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_camp_collected_units ON public.donations;
CREATE TRIGGER trg_sync_camp_collected_units
  AFTER INSERT OR UPDATE OF camp_id, units OR DELETE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_camp_collected_units();

-- 4.2 Camp Metric Protection Trigger (Prevents Direct Accounting Drift)
CREATE OR REPLACE FUNCTION public.protect_camp_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Authoritatively recompute metrics from donations and registrations
  NEW.collected_units := (
    SELECT COALESCE(SUM(units), 0)
    FROM public.donations
    WHERE camp_id = NEW.id
  );

  NEW.registered_count := (
    SELECT COUNT(*)
    FROM public.camp_registrations
    WHERE camp_id = NEW.id AND status != 'cancelled'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_camp_metrics ON public.blood_camps;
CREATE TRIGGER trg_protect_camp_metrics
  BEFORE UPDATE ON public.blood_camps
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_camp_metrics();

-- 4.3 Camp Registrations Deduplication Index
CREATE UNIQUE INDEX IF NOT EXISTS idx_camp_registrations_camp_phone_active
  ON public.camp_registrations(camp_id, TRIM(phone))
  WHERE status != 'cancelled';

-- 4.4 Camp Registrations Count Synchronization Trigger (Handles OLD and NEW camps)
CREATE OR REPLACE FUNCTION public.sync_camp_registration_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_old_camp_id TEXT;
  v_new_camp_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_camp_id := OLD.camp_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_camp_id := OLD.camp_id;
    v_new_camp_id := NEW.camp_id;
  ELSE
    v_new_camp_id := NEW.camp_id;
  END IF;

  -- Recompute old camp if camp changed or registration deleted
  IF v_old_camp_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('camp_registered_count_' || v_old_camp_id));
    UPDATE public.blood_camps
    SET registered_count = (
      SELECT COUNT(*)
      FROM public.camp_registrations
      WHERE camp_id = v_old_camp_id AND status != 'cancelled'
    )
    WHERE id = v_old_camp_id;
  END IF;

  -- Recompute new camp if insert, or if camp changed on update
  IF v_new_camp_id IS NOT NULL AND (v_old_camp_id IS NULL OR v_old_camp_id != v_new_camp_id) THEN
    PERFORM pg_advisory_xact_lock(hashtext('camp_registered_count_' || v_new_camp_id));
    UPDATE public.blood_camps
    SET registered_count = (
      SELECT COUNT(*)
      FROM public.camp_registrations
      WHERE camp_id = v_new_camp_id AND status != 'cancelled'
    )
    WHERE id = v_new_camp_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_camp_registration_counts ON public.camp_registrations;
CREATE TRIGGER trg_sync_camp_registration_counts
  AFTER INSERT OR UPDATE OF status, camp_id OR DELETE ON public.camp_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_camp_registration_counts();

-- ==============================================================================
-- 5. AUTHORITATIVE MANUAL DONATION RECORDING: record_manual_donation()
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_manual_donation(
  p_donor_id TEXT,
  p_donation_date DATE,
  p_hospital TEXT,
  p_location TEXT DEFAULT NULL,
  p_blood_request_id TEXT DEFAULT NULL,
  p_donor_request_id TEXT DEFAULT NULL,
  p_camp_id TEXT DEFAULT NULL,
  p_units INTEGER DEFAULT 1,
  p_donation_type TEXT DEFAULT 'Whole Blood',
  p_notes TEXT DEFAULT NULL,
  p_fulfill_request BOOLEAN DEFAULT false
) RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_donor RECORD;
  v_breq RECORD;
  v_dreq RECORD;
  v_camp RECORD;
  v_donation_id TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_interval_days INTEGER := 90;
  v_next_date DATE;
  v_is_compatible BOOLEAN := false;
BEGIN
  -- 1. Authorization & Caller Authentication
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller authentication required.';
  END IF;

  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Forbidden: Staff authorization required to record manual donations.';
  END IF;

  -- 2. Input Validation
  IF p_donation_date IS NULL OR p_donation_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Invalid date: Donation date cannot be in the future (supplied: %).', p_donation_date;
  END IF;

  IF p_units IS NULL OR p_units < 1 OR p_units > 4 THEN
    RAISE EXCEPTION 'Invalid units: Donated units must be between 1 and 4 (supplied: %).', p_units;
  END IF;

  IF p_donation_type NOT IN ('Whole Blood', 'Platelets', 'Plasma', 'RBC') THEN
    RAISE EXCEPTION 'Invalid donation type: %', p_donation_type;
  END IF;

  IF p_hospital IS NULL OR TRIM(p_hospital) = '' THEN
    RAISE EXCEPTION 'Hospital / Donation Center name is required.';
  END IF;

  -- 3. Lock and derive canonical donor identity from public.donors
  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = p_donor_id OR donor_id = p_donor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical donor profile not found for id: %', p_donor_id;
  END IF;

  -- 4. Cross-System Date Deduplication Check
  IF EXISTS (
    SELECT 1 FROM public.donations
    WHERE donor_id = v_donor.id AND donation_date = p_donation_date
  ) THEN
    RAISE EXCEPTION 'Duplicate donation: A verified donation already exists for donor % on date %.', v_donor.donor_id, p_donation_date;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.donation_submissions
    WHERE donor_id = v_donor.id AND donation_date = p_donation_date AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'Conflict: A pending or approved donation submission already exists for donor % on date %.', v_donor.donor_id, p_donation_date;
  END IF;

  -- 5. Optional Camp Validation
  IF p_camp_id IS NOT NULL AND TRIM(p_camp_id) != '' THEN
    SELECT * INTO v_camp
    FROM public.blood_camps
    WHERE id = p_camp_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Blood camp not found with id: %', p_camp_id;
    END IF;
  END IF;

  -- 6. Optional Blood Request Link Validation & Compatibility
  IF p_blood_request_id IS NOT NULL AND TRIM(p_blood_request_id) != '' THEN
    SELECT * INTO v_breq
    FROM public.blood_requests
    WHERE id = p_blood_request_id OR request_id = p_blood_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Blood request not found with id: %', p_blood_request_id;
    END IF;

    -- Require active/verified/matched status
    IF v_breq.status NOT IN ('active', 'verified', 'matched') THEN
      RAISE EXCEPTION 'Precondition Failed: Cannot link manual donation to a % blood request (ID: %).', v_breq.status, v_breq.request_id;
    END IF;

    -- Check medical blood compatibility
    IF v_donor.blood_group = v_breq.blood_group THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'O-' THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'O+' AND v_breq.blood_group IN ('A+', 'B+', 'AB+', 'O+') THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'A-' AND v_breq.blood_group IN ('A-', 'A+', 'AB-', 'AB+') THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'A+' AND v_breq.blood_group IN ('A+', 'AB+') THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'B-' AND v_breq.blood_group IN ('B-', 'B+', 'AB-', 'AB+') THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'B+' AND v_breq.blood_group IN ('B+', 'AB+') THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'AB-' AND v_breq.blood_group IN ('AB-', 'AB+') THEN
      v_is_compatible := true;
    ELSIF v_donor.blood_group = 'AB+' AND v_breq.blood_group = 'AB+' THEN
      v_is_compatible := true;
    ELSE
      v_is_compatible := false;
    END IF;

    IF NOT v_is_compatible THEN
      RAISE EXCEPTION 'Incompatible blood groups: Donor (%) cannot donate to patient request (%).', v_donor.blood_group, v_breq.blood_group;
    END IF;
  END IF;

  -- 7. Optional Donor Request Link Validation (BLOCKER 2: Require 'accepted' state)
  IF p_donor_request_id IS NOT NULL AND TRIM(p_donor_request_id) != '' THEN
    SELECT * INTO v_dreq
    FROM public.donor_requests
    WHERE id = p_donor_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Donor request match not found with id: %', p_donor_request_id;
    END IF;

    IF v_dreq.donor_id != v_donor.id THEN
      RAISE EXCEPTION 'Mismatch: Donor request % belongs to a different donor.', p_donor_request_id;
    END IF;

    IF v_dreq.status IS DISTINCT FROM 'accepted' THEN
      RAISE EXCEPTION 'Precondition Failed: Linked donor request % must be in "accepted" status (current status: %).', p_donor_request_id, v_dreq.status;
    END IF;
  END IF;

  -- 8. Calculate next eligibility date based on gender
  IF LOWER(COALESCE(v_donor.gender, 'male')) = 'female' THEN
    v_interval_days := 120;
  ELSE
    v_interval_days := 90;
  END IF;
  v_next_date := p_donation_date + (v_interval_days || ' days')::INTERVAL;

  -- 9. Execute Authoritative Mutation with Transaction-Local GUC Marker
  PERFORM set_config('app.in_manual_donation_entry', 'true', true);

  v_donation_id := 'don-man-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 16);

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
    camp_id,
    verified_by,
    verification_date,
    notes,
    created_at,
    updated_at
  ) VALUES (
    v_donation_id,
    v_donor.id,
    v_donor.user_id,
    v_donor.full_name,
    v_donor.blood_group,
    COALESCE(v_breq.request_id, p_blood_request_id),
    COALESCE(v_breq.id, p_blood_request_id),
    v_dreq.id,
    p_donation_date,
    TRIM(p_hospital),
    COALESCE(TRIM(p_location), TRIM(p_hospital)),
    p_units,
    p_donation_type,
    CASE WHEN p_camp_id IS NOT NULL THEN 'camp' ELSE 'manual' END,
    p_camp_id,
    v_caller_uid::text,
    CURRENT_DATE,
    p_notes,
    v_now,
    v_now
  );

  -- 10. Atomically Update Canonical Donor Metrics
  UPDATE public.donors
  SET
    total_donations = COALESCE(total_donations, 0) + p_units,
    last_donation_date = GREATEST(COALESCE(last_donation_date, p_donation_date), p_donation_date),
    next_eligible_date = GREATEST(COALESCE(next_eligible_date, v_next_date), v_next_date),
    availability = false,
    updated_at = v_now
  WHERE id = v_donor.id;

  -- 11. Safe fulfillment integration with Phase 1C lifecycle rules (BLOCKER 1)
  IF v_breq.id IS NOT NULL AND p_fulfill_request = true THEN
    IF v_breq.status NOT IN ('active', 'matched') THEN
      RAISE EXCEPTION 'Precondition Failed: Cannot fulfill blood request % in status "%".', v_breq.request_id, v_breq.status;
    END IF;

    -- Set trusted transaction-local GUC marker required by protect_blood_request_fields
    PERFORM set_config('app.in_donation_fulfillment', 'true', true);

    UPDATE public.blood_requests
    SET
      status = 'fulfilled',
      verified_by = v_caller_uid::text,
      verified_at = v_now,
      updated_at = v_now
    WHERE id = v_breq.id;
  END IF;

  -- 12. Dispatch Donor Notification
  IF v_donor.user_id IS NOT NULL AND v_donor.user_id != '' THEN
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
      'notif-mandon-' || v_donation_id,
      v_donor.user_id,
      'রক্তদানের অফিশিয়াল রেকর্ড সংরক্ষিত হয়েছে',
      'আপনার ' || p_donation_date || ' তারিখের রক্তদানের অফিশিয়াল রেকর্ডটি (' || v_donor.blood_group || ', ' || p_hospital || ') সফলভাবে সিস্টেমে লিপিবদ্ধ করা হয়েছে। রক্তবন্ধন পরিবারের পক্ষ থেকে আপনাকে আন্তরিক ধন্যবাদ!',
      'donation',
      '/profile',
      false,
      v_now
    ) ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 13. Record Minimized Audit Trail
  PERFORM public.record_audit_log(
    'DONATION_MANUAL_RECORDED',
    'Donation',
    v_donation_id,
    jsonb_build_object(
      'donation_id', v_donation_id,
      'donor_id', v_donor.id,
      'donor_human_id', v_donor.donor_id,
      'blood_group', v_donor.blood_group,
      'donation_date', p_donation_date,
      'hospital', p_hospital,
      'units', p_units,
      'camp_id', p_camp_id,
      'blood_request_id', p_blood_request_id,
      'fulfilled_request', (v_breq.id IS NOT NULL AND p_fulfill_request = true),
      'recorded_by', v_caller_uid::text
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'donation_id', v_donation_id,
    'donor_id', v_donor.id,
    'donor_human_id', v_donor.donor_id,
    'total_donations', v_donor.total_donations + p_units,
    'next_eligible_date', v_next_date,
    'message', 'রক্তদান অফিশিয়ালভাবে লিপিবদ্ধ করা হয়েছে।'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.record_manual_donation(TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_manual_donation(TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, BOOLEAN) TO authenticated;

-- ==============================================================================
-- 6. DONOR IMPORT GOVERNANCE: BATCHES & ROLLBACK
-- ==============================================================================

-- 6.1 Donor Import Batches Table
CREATE TABLE IF NOT EXISTS public.donor_import_batches (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partially_completed', 'rolled_back', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.donor_import_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage donor import batches" ON public.donor_import_batches;
CREATE POLICY "Staff can manage donor import batches" ON public.donor_import_batches
  FOR ALL
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- 6.2 Authoritative Donor Batch Import RPC: admin_import_donors_batch()
CREATE OR REPLACE FUNCTION public.admin_import_donors_batch(
  p_file_name TEXT,
  p_donors JSONB
) RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_batch_id TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_donor_item JSONB;
  v_imported INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors INTEGER := 0;
  v_total INTEGER := 0;
  v_donor_id_seq INTEGER;
  v_clean_phone TEXT;
  v_blood_group TEXT;
  v_full_name TEXT;
  v_donor_primary_id TEXT;
  v_human_donor_id TEXT;
  v_loc_code TEXT;
  v_total_donations INTEGER;
  v_last_date DATE;
BEGIN
  -- 1. Authorization
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller authentication required.';
  END IF;

  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Forbidden: Staff authorization required for donor import.';
  END IF;

  IF p_donors IS NULL OR jsonb_array_length(p_donors) = 0 THEN
    RAISE EXCEPTION 'Empty payload: No donor records supplied for import.';
  END IF;

  v_total := jsonb_array_length(p_donors);
  v_batch_id := 'batch-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 16);

  -- 2. Insert Batch Header
  INSERT INTO public.donor_import_batches (
    id,
    file_name,
    total_rows,
    imported_count,
    skipped_count,
    error_count,
    created_by,
    created_at,
    status
  ) VALUES (
    v_batch_id,
    COALESCE(p_file_name, 'import.xlsx'),
    v_total,
    0,
    0,
    0,
    v_caller_uid::text,
    v_now,
    'completed'
  );

  -- 3. Set transaction-local marker to permit insertion and admin_notes
  PERFORM set_config('app.in_donor_import', 'true', true);

  -- 4. Process Donor Records
  FOR i IN 0..(v_total - 1) LOOP
    v_donor_item := p_donors->i;
    v_full_name := TRIM(COALESCE(v_donor_item->>'fullName', v_donor_item->>'full_name', ''));

    -- BLOCKER 3: Authoritative SQL Phone Normalization
    v_clean_phone := public.normalize_bangladesh_phone(COALESCE(v_donor_item->>'phone', ''));
    v_blood_group := UPPER(TRIM(COALESCE(v_donor_item->>'bloodGroup', v_donor_item->>'blood_group', '')));

    -- Basic check: Valid name, phone, and clinical blood group
    IF v_full_name = '' OR v_clean_phone IS NULL OR v_blood_group NOT IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') THEN
      v_errors := v_errors + 1;
      CONTINUE;
    END IF;

    -- Metric validation: totalDonations bound check
    v_total_donations := COALESCE((v_donor_item->>'totalDonations')::integer, (v_donor_item->>'total_donations')::integer, 0);
    IF v_total_donations < 0 OR v_total_donations > 500 THEN
      v_errors := v_errors + 1;
      CONTINUE;
    END IF;

    -- Metric validation: lastDonationDate bound check (cannot be in the future)
    IF (v_donor_item->>'lastDonationDate') IS NOT NULL AND TRIM(v_donor_item->>'lastDonationDate') != '' THEN
      BEGIN
        v_last_date := (v_donor_item->>'lastDonationDate')::date;
        IF v_last_date > CURRENT_DATE THEN
          v_errors := v_errors + 1;
          CONTINUE;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        v_errors := v_errors + 1;
        CONTINUE;
      END;
    ELSE
      v_last_date := NULL;
    END IF;

    -- Check duplicate phone in donors
    IF EXISTS (SELECT 1 FROM public.donors WHERE phone = v_clean_phone) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Generate unique IDs
    v_donor_primary_id := 'dnr-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 16);
    v_loc_code := UPPER(COALESCE(v_donor_item->>'upazilaCode', 'DHM'));
    v_human_donor_id := 'DNR-' || v_loc_code || '-' || LPAD(FLOOR(RANDOM() * 899999 + 100000)::text, 6, '0');

    -- Insert into public.donors with explicit import_batch_id
    INSERT INTO public.donors (
      id,
      donor_id,
      user_id,
      full_name,
      blood_group,
      phone,
      gender,
      division,
      district,
      upazila,
      area,
      exact_address,
      availability,
      emergency_available,
      verification_status,
      total_donations,
      last_donation_date,
      import_batch_id,
      admin_notes,
      created_at,
      updated_at
    ) VALUES (
      v_donor_primary_id,
      v_human_donor_id,
      v_donor_primary_id, -- Two-tier placeholder user_id
      v_full_name,
      v_blood_group,
      v_clean_phone,
      LOWER(COALESCE(v_donor_item->>'gender', 'male')),
      COALESCE(v_donor_item->>'division', 'Dhaka'),
      COALESCE(v_donor_item->>'district', 'ঢাকা'),
      COALESCE(v_donor_item->>'upazila', 'ধামরাই'),
      COALESCE(v_donor_item->>'area', 'ধামরাই সদর'),
      v_donor_item->>'exactAddress',
      COALESCE((v_donor_item->>'availability')::boolean, true),
      true,
      'unverified',
      v_total_donations,
      v_last_date,
      v_batch_id,
      COALESCE(v_donor_item->>'notes', ''),
      v_now,
      v_now
    );

    v_imported := v_imported + 1;
  END LOOP;

  -- 5. Update Batch Summary
  UPDATE public.donor_import_batches
  SET
    imported_count = v_imported,
    skipped_count = v_skipped,
    error_count = v_errors,
    status = CASE WHEN v_imported = 0 AND v_errors > 0 THEN 'failed' ELSE 'completed' END
  WHERE id = v_batch_id;

  -- 6. Minimized Audit Trail
  PERFORM public.record_audit_log(
    'DONOR_IMPORT_BATCH_EXECUTED',
    'DonorImportBatch',
    v_batch_id,
    jsonb_build_object(
      'batch_id', v_batch_id,
      'file_name', p_file_name,
      'total_rows', v_total,
      'imported_count', v_imported,
      'skipped_count', v_skipped,
      'error_count', v_errors,
      'imported_by', v_caller_uid::text
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', v_batch_id,
    'total_rows', v_total,
    'imported_count', v_imported,
    'skipped_count', v_skipped,
    'error_count', v_errors,
    'message', 'Donor batch import completed.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_import_donors_batch(TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_import_donors_batch(TEXT, JSONB) TO authenticated;

-- 6.3 Authoritative Donor Batch Rollback RPC: admin_rollback_import_batch()
CREATE OR REPLACE FUNCTION public.admin_rollback_import_batch(
  p_batch_id TEXT,
  p_reason TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
  v_batch RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_donor_ids TEXT[];
  v_has_donations BOOLEAN := false;
  v_has_submissions BOOLEAN := false;
  v_has_donor_requests BOOLEAN := false;
  v_deleted_count INTEGER := 0;
  v_quarantined_count INTEGER := 0;
BEGIN
  -- 1. Authorization
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller authentication required.';
  END IF;

  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Forbidden: Staff authorization required for batch rollback.';
  END IF;

  -- 2. Lock Batch Record
  SELECT * INTO v_batch
  FROM public.donor_import_batches
  WHERE id = p_batch_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Import batch not found with id: %', p_batch_id;
  END IF;

  IF v_batch.status = 'rolled_back' THEN
    RAISE EXCEPTION 'Batch % has already been rolled back.', p_batch_id;
  END IF;

  -- 3. Identify all donors associated with this batch deterministically by import_batch_id
  SELECT array_agg(id) INTO v_donor_ids
  FROM public.donors
  WHERE import_batch_id = p_batch_id;

  IF v_donor_ids IS NULL OR array_length(v_donor_ids, 1) = 0 THEN
    UPDATE public.donor_import_batches
    SET status = 'rolled_back'
    WHERE id = p_batch_id;

    RETURN jsonb_build_object(
      'success', true,
      'batch_id', p_batch_id,
      'deleted_count', 0,
      'quarantined_count', 0,
      'message', 'No donors found in batch to rollback.'
    );
  END IF;

  -- 4. Multi-Table Dependency Inspection
  SELECT EXISTS (
    SELECT 1 FROM public.donations WHERE donor_id = ANY(v_donor_ids)
  ) INTO v_has_donations;

  SELECT EXISTS (
    SELECT 1 FROM public.donation_submissions WHERE donor_id = ANY(v_donor_ids)
  ) INTO v_has_submissions;

  SELECT EXISTS (
    SELECT 1 FROM public.donor_requests WHERE donor_id = ANY(v_donor_ids)
  ) INTO v_has_donor_requests;

  -- 5. Execute Safe Rollback Strategy
  IF v_has_donations OR v_has_submissions OR v_has_donor_requests THEN
    -- Dependent historical data exists: DO NOT physically delete to protect foreign keys and historical integrity.
    -- Perform Logical Quarantine.
    PERFORM set_config('app.in_donor_import', 'true', true);

    UPDATE public.donors
    SET
      verification_status = 'suspended',
      availability = false,
      emergency_available = false,
      admin_notes = COALESCE(admin_notes || ' ', '') || '[BATCH ROLLED BACK: QUARANTINED due to active dependencies]',
      updated_at = v_now
    WHERE id = ANY(v_donor_ids);

    v_quarantined_count := array_length(v_donor_ids, 1);
  ELSE
    -- Zero historical dependencies: Safe physical deletion
    DELETE FROM public.donors
    WHERE id = ANY(v_donor_ids);

    v_deleted_count := array_length(v_donor_ids, 1);
  END IF;

  -- 6. Mark Batch Header as Rolled Back
  UPDATE public.donor_import_batches
  SET
    status = 'rolled_back',
    metadata = jsonb_build_object(
      'rolled_back_at', v_now,
      'rolled_back_by', v_caller_uid::text,
      'reason', p_reason,
      'deleted_count', v_deleted_count,
      'quarantined_count', v_quarantined_count
    )
  WHERE id = p_batch_id;

  -- 7. Audit Trail
  PERFORM public.record_audit_log(
    'DONOR_IMPORT_BATCH_ROLLED_BACK',
    'DonorImportBatch',
    p_batch_id,
    jsonb_build_object(
      'batch_id', p_batch_id,
      'rolled_back_by', v_caller_uid::text,
      'reason', p_reason,
      'deleted_count', v_deleted_count,
      'quarantined_count', v_quarantined_count
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'deleted_count', v_deleted_count,
    'quarantined_count', v_quarantined_count,
    'quarantine_applied', (v_quarantined_count > 0),
    'message', CASE
      WHEN v_quarantined_count > 0 THEN 'Batch quarantined: donors with active dependencies preserved as suspended.'
      ELSE 'Batch rolled back and deleted successfully.'
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.admin_rollback_import_batch(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rollback_import_batch(TEXT, TEXT) TO authenticated;
