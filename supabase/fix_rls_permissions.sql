-- ==============================================================================
-- র ক্ত ব ন্ধ ন (ROKTOBONDHON) - SUPABASE 100% PERMISSIONS & RLS REPAIR SCRIPT
-- ==============================================================================
-- এই স্ক্রিপ্টটি Supabase SQL Editor এ রান করলে কন্ট্রোল প্যানেলের সমস্ত আপডেট
-- (System Config, হাসপাতাল, ডোনার, শাখা, পেমেন্ট মেথড, নোটিফিকেশন ইত্যাদি)
-- কোনো RLS ব্লকিং ছাড়া সরাসরি ডাটাবেজে সেভ ও সিঙ্ক হবে।
-- ==============================================================================

-- 1. Ensure system_config table exists
CREATE TABLE IF NOT EXISTS public.system_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Ensure branches table exists
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

-- 3. Temporarily disable and recreate clean permissive policies on all tables
DO $$ 
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'users', 'branches', 'donors', 'blood_requests', 'donor_requests',
    'donations', 'hospitals', 'blood_camps', 'camp_registrations',
    'fund_donations', 'fund_disbursements', 'payment_methods',
    'notifications', 'audit_logs', 'verification_logs', 'system_config'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    
    -- Drop existing restrictive policies if any
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS "Allow full access to public" ON public.%I;', tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Public can view %I" ON public.%I;', tbl, tbl);
      EXECUTE format('DROP POLICY IF EXISTS "Allow public all on %I" ON public.%I;', tbl, tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    -- Create unified open access policy for seamless client and admin operations
    EXECUTE format(
      'CREATE POLICY "Allow public all on %I" ON public.%I FOR ALL TO public USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;

-- 4. Grant table permissions to anon & authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;

-- ==============================================================================
-- DONE! সমস্ত টেবিলে রিড, রাইট, আপডেট ও ডিলিট পারমিশন সফলভাবে কার্যকর করা হয়েছে।
-- ==============================================================================
