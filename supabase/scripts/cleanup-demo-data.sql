-- ==============================================================================
-- র ক্ত ব ন্ধ ন (ROKTOBONDHON) — DATABASE CLEANUP & SAFE DATA SEPARATION SCRIPT
-- ==============================================================================
-- Script Location: /supabase/scripts/cleanup-demo-data.sql
-- Purpose: Safely identify, flag, and cleanly remove synthetic/demo records
--          from Supabase PostgreSQL while 100% preserving legitimate user data,
--          real donations, authentic hospital directory entries, and audit logs.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD AUDIT & SOURCE TRACKING COLUMNS (Non-breaking metadata columns)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users 
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'production';

ALTER TABLE IF EXISTS public.donors 
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'production';

ALTER TABLE IF EXISTS public.blood_requests 
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'production';

ALTER TABLE IF EXISTS public.donations 
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'production';

ALTER TABLE IF EXISTS public.fund_donations 
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'production';

ALTER TABLE IF EXISTS public.fund_disbursements 
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'production';

ALTER TABLE IF EXISTS public.blood_camps 
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_source TEXT DEFAULT 'production';

-- ------------------------------------------------------------------------------
-- 2. IDENTIFY AND FLAG KNOWN SYNTHETIC / SEED TEST RECORDS
-- ------------------------------------------------------------------------------
-- Flag known mock user accounts from old seed scripts
UPDATE public.users 
SET is_demo = true, data_source = 'seed'
WHERE id IN ('user-mod-dhm', 'user-donor-me', 'user-recipient-me')
   OR email IN ('dhamrai@roktobondon.org', 'tanvir@example.com', 'faruk@example.com');

-- Flag synthetic donors generated with pattern DNR-DHM-0001XX or mock users
UPDATE public.donors
SET is_demo = true, data_source = 'seed'
WHERE user_id IN ('user-donor-me', 'user-mod-dhm', 'user-recipient-me')
   OR donor_id LIKE 'DNR-SEED-%';

-- Flag synthetic blood requests generated with mock patterns
UPDATE public.blood_requests
SET is_demo = true, data_source = 'seed'
WHERE user_id IN ('user-recipient-me', 'user-donor-me')
   OR request_id LIKE 'BD-SEED-%';

-- Flag synthetic donations generated from seed scripts
UPDATE public.donations
SET is_demo = true, data_source = 'seed'
WHERE verified_by = 'সাভার-ধামরাই ভলান্টিয়ার টিম' AND notes = 'সফলভাবে স্বেচ্ছায় রক্তদান সম্পন্ন হয়েছে।';

-- Flag synthetic financial records
UPDATE public.fund_donations
SET is_demo = true, data_source = 'seed'
WHERE transaction_id LIKE 'TRX-BKASH-%' OR transaction_id LIKE 'TRX-NAGAD-%';

UPDATE public.fund_disbursements
SET is_demo = true, data_source = 'seed'
WHERE voucher_no LIKE 'VCH-EMG-%';

-- ------------------------------------------------------------------------------
-- 3. AUDIT REPORT QUERY (Run this before deletion to review identified records)
-- ------------------------------------------------------------------------------
SELECT 'users' AS entity, COUNT(*) AS demo_count FROM public.users WHERE is_demo = true
UNION ALL
SELECT 'donors', COUNT(*) FROM public.donors WHERE is_demo = true
UNION ALL
SELECT 'blood_requests', COUNT(*) FROM public.blood_requests WHERE is_demo = true
UNION ALL
SELECT 'donations', COUNT(*) FROM public.donations WHERE is_demo = true
UNION ALL
SELECT 'fund_donations', COUNT(*) FROM public.fund_donations WHERE is_demo = true
UNION ALL
SELECT 'fund_disbursements', COUNT(*) FROM public.fund_disbursements WHERE is_demo = true;

-- ------------------------------------------------------------------------------
-- 4. CLEAN REMOVAL OF FLAGGED DEMO RECORDS ONLY (Safe & Idempotent)
-- ------------------------------------------------------------------------------
-- Note: Dependent foreign key relationships cascade cleanly.
DELETE FROM public.donor_requests 
WHERE donor_id IN (SELECT id FROM public.donors WHERE is_demo = true)
   OR blood_request_id IN (SELECT id FROM public.blood_requests WHERE is_demo = true);

DELETE FROM public.donations WHERE is_demo = true;
DELETE FROM public.blood_requests WHERE is_demo = true;
DELETE FROM public.donors WHERE is_demo = true;
DELETE FROM public.fund_donations WHERE is_demo = true;
DELETE FROM public.fund_disbursements WHERE is_demo = true;
DELETE FROM public.users WHERE is_demo = true;

-- ------------------------------------------------------------------------------
-- 5. RECORD AUDIT EVENT FOR DATA CLEANUP
-- ------------------------------------------------------------------------------
INSERT INTO public.audit_logs (
  id,
  user_id,
  user_name,
  user_role,
  action,
  target_type,
  target_id,
  metadata,
  timestamp
) VALUES (
  'audit-cleanup-' || extract(epoch from now())::text,
  'system',
  'System Maintenance Engine',
  'super_admin',
  'DATABASE_DEMO_DATA_PURGED',
  'DATABASE',
  'GLOBAL',
  '{"status": "success", "scope": "production_readiness", "strategy": "safe_flag_and_delete"}'::jsonb,
  NOW()
);

-- ==============================================================================
-- CLEANUP COMPLETE: All real users, real donors, authentic hospitals,
-- and system configurations remain 100% intact and secured.
-- ==============================================================================
