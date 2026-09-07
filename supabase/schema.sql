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
  donation_date DATE NOT NULL,
  hospital TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  donation_type TEXT NOT NULL DEFAULT 'Whole Blood' CHECK (donation_type IN ('Whole Blood', 'Platelets', 'Plasma', 'RBC')),
  verified_by TEXT NOT NULL,
  verification_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- SUPABASE AUTH SYNCHRONIZATION TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
    COALESCE(NEW.raw_user_meta_data->>'role', 'donor'),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution hook on auth.users (if auth schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp DESC);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS (Multi-Attribute Resolution)
-- ==============================================================================
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

CREATE POLICY "Users can read profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid()::text = id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id OR public.is_admin())
  WITH CHECK (auth.uid()::text = id OR public.is_admin());

CREATE POLICY "Admins can delete user profiles" ON public.users
  FOR DELETE USING (public.is_admin());

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

CREATE POLICY "Public can view verified donors" ON public.donors
  FOR SELECT USING (verification_status = 'verified' OR user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Authenticated users can create donor record" ON public.donors
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR public.is_staff());

CREATE POLICY "Donors can update own record" ON public.donors
  FOR UPDATE USING (auth.uid()::text = user_id OR public.is_staff())
  WITH CHECK (auth.uid()::text = user_id OR public.is_staff());

CREATE POLICY "Admins can delete donor records" ON public.donors
  FOR DELETE USING (public.is_admin());

-- 4. Blood Requests Policies
DROP POLICY IF EXISTS "Public can view blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users can create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Users/Admins can update blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can view active blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Public can create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Requesters and staff can update blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Admins can delete blood requests" ON public.blood_requests;

CREATE POLICY "Public can view active blood requests" ON public.blood_requests
  FOR SELECT USING (status IN ('active', 'verified', 'matched', 'fulfilled') OR user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Public can create blood requests" ON public.blood_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Requesters and staff can update blood requests" ON public.blood_requests
  FOR UPDATE USING (user_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Admins can delete blood requests" ON public.blood_requests
  FOR DELETE USING (public.is_admin());

-- 5. Donor Requests (Matching) Policies
DROP POLICY IF EXISTS "Users can view donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can insert donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can update donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can view relevant donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users and system can create donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Donors can respond to their requests" ON public.donor_requests;

CREATE POLICY "Users can view relevant donor requests" ON public.donor_requests
  FOR SELECT USING (donor_user_id = auth.uid()::text OR requester_user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Users and system can create donor requests" ON public.donor_requests
  FOR INSERT WITH CHECK (requester_user_id = auth.uid()::text OR public.is_staff());

CREATE POLICY "Donors can respond to their requests" ON public.donor_requests
  FOR UPDATE USING (donor_user_id = auth.uid()::text OR public.is_staff())
  WITH CHECK (donor_user_id = auth.uid()::text OR public.is_staff());

-- 6. Donations Policies
DROP POLICY IF EXISTS "Public can view donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can insert donations" ON public.donations;
DROP POLICY IF EXISTS "Public can view donation impact logs" ON public.donations;
DROP POLICY IF EXISTS "Staff can insert verified donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON public.donations;

CREATE POLICY "Public can view donation impact logs" ON public.donations
  FOR SELECT USING (true);

CREATE POLICY "Staff can insert verified donations" ON public.donations
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Admins can update donations" ON public.donations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete donations" ON public.donations
  FOR DELETE USING (public.is_admin());

-- 7. Hospitals Directory Policies
DROP POLICY IF EXISTS "Public can view hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins/Public can insert hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can update hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Admins can delete hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Public can view verified hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff and community can submit hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Staff can update hospitals" ON public.hospitals;

CREATE POLICY "Public can view verified hospitals" ON public.hospitals
  FOR SELECT USING (verification_status = 'verified' OR public.is_staff());

CREATE POLICY "Staff and community can submit hospitals" ON public.hospitals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update hospitals" ON public.hospitals
  FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Admins can delete hospitals" ON public.hospitals
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

-- 13. Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can send notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notifications;

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

CREATE POLICY "Staff can view audit trail" ON public.audit_logs
  FOR SELECT USING (public.is_staff());

CREATE POLICY "System can record audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

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
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload avatar images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view organization assets" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload organization assets" ON storage.objects;

CREATE POLICY "Public can view avatar images" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public can upload avatar images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Public can view organization assets" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "Staff can upload organization assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets');

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

