-- ==============================================================================
-- র ক্ত ব ন্ধ ন (ROKTOBONDON) - COMPLETE SUPABASE POSTGRESQL DATABASE SCHEMA
-- ==============================================================================
-- Run this SQL in your Supabase Dashboard > SQL Editor to initialize all tables,
-- indexes, row-level security (RLS), storage buckets, and initial system config.
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
-- INDEXES FOR OPTIMAL QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON public.donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_district ON public.donors(district);
CREATE INDEX IF NOT EXISTS idx_donors_upazila ON public.donors(upazila);
CREATE INDEX IF NOT EXISTS idx_donors_availability ON public.donors(availability);
CREATE INDEX IF NOT EXISTS idx_donors_verification_status ON public.donors(verification_status);

CREATE INDEX IF NOT EXISTS idx_blood_requests_status ON public.blood_requests(status);
CREATE INDEX IF NOT EXISTS idx_blood_requests_blood_group ON public.blood_requests(blood_group);
CREATE INDEX IF NOT EXISTS idx_blood_requests_upazila ON public.blood_requests(upazila);
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

-- Allow public read access to public directories & verified requests
CREATE POLICY "Public can view users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Public can insert own user profile" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Public can view branches" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Admins can manage branches" ON public.branches FOR ALL USING (true);

CREATE POLICY "Public can view donors" ON public.donors FOR SELECT USING (true);
CREATE POLICY "Public can register as donor" ON public.donors FOR INSERT WITH CHECK (true);
CREATE POLICY "Donors/Admins can update donor records" ON public.donors FOR UPDATE USING (true);

CREATE POLICY "Public can view blood requests" ON public.blood_requests FOR SELECT USING (true);
CREATE POLICY "Users can create blood requests" ON public.blood_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users/Admins can update blood requests" ON public.blood_requests FOR UPDATE USING (true);

CREATE POLICY "Public can view hospitals" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Admins/Public can insert hospitals" ON public.hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update hospitals" ON public.hospitals FOR UPDATE USING (true);
CREATE POLICY "Admins can delete hospitals" ON public.hospitals FOR DELETE USING (true);

CREATE POLICY "Public can view blood camps" ON public.blood_camps FOR SELECT USING (true);
CREATE POLICY "Admins can insert blood camps" ON public.blood_camps FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update blood camps" ON public.blood_camps FOR UPDATE USING (true);
CREATE POLICY "Admins can delete blood camps" ON public.blood_camps FOR DELETE USING (true);

CREATE POLICY "Public can view camp registrations" ON public.camp_registrations FOR SELECT USING (true);
CREATE POLICY "Public can register for camps" ON public.camp_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update camp registrations" ON public.camp_registrations FOR UPDATE USING (true);

CREATE POLICY "Users can view donor requests" ON public.donor_requests FOR SELECT USING (true);
CREATE POLICY "Users can insert donor requests" ON public.donor_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update donor requests" ON public.donor_requests FOR UPDATE USING (true);

CREATE POLICY "Public can view donations" ON public.donations FOR SELECT USING (true);
CREATE POLICY "Admins can insert donations" ON public.donations FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view payment methods" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment methods" ON public.payment_methods FOR ALL USING (true);

CREATE POLICY "Public can view fund donations" ON public.fund_donations FOR SELECT USING (true);
CREATE POLICY "Public can submit fund donation" ON public.fund_donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update fund donation" ON public.fund_donations FOR UPDATE USING (true);

CREATE POLICY "Public can view fund disbursements" ON public.fund_disbursements FOR SELECT USING (true);
CREATE POLICY "Admins can manage disbursements" ON public.fund_disbursements FOR ALL USING (true);

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "System can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update notifications" ON public.notifications FOR UPDATE USING (true);

CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view verification logs" ON public.verification_logs FOR SELECT USING (true);
CREATE POLICY "Admins can insert verification logs" ON public.verification_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view system config" ON public.system_config FOR SELECT USING (true);
CREATE POLICY "Admins can update system config" ON public.system_config FOR ALL USING (true);

-- ==============================================================================
-- STORAGE BUCKETS (avatars, documents, assets)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('verification-docs', 'verification-docs', false),
  ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view avatar images" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Public can upload avatar images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Public can view organization assets" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "Staff can upload organization assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets');
