-- ==============================================================================
-- ROKTOBONDHON - DONATION MANAGEMENT & HISTORICAL METRICS MIGRATION
-- Migration: 20260909_donation_management.sql
-- ==============================================================================
-- Features:
-- 1. Extend public.donations table:
--    - source: 'manual' | 'camp' | 'request' | 'imported' | 'other'
--    - blood_request_id: Optional link to public.blood_requests
--    - camp_id: Optional link to public.blood_camps
--    - location: Text description of location / hospital facility
--    - created_at / updated_at timestamps
--
-- 2. Extend public.donors table:
--    - historical_donation_count: Stores paper-based baseline count without fabricating rows
--
-- 3. Update sync_donor_donation_metrics() trigger:
--    - Reconciles total_donations = COALESCE(historical_donation_count, 0) + (COUNT of digital public.donations)
--    - Derives last_donation_date = GREATEST(MAX(donations.donation_date), donors.last_donation_date)
--
-- 4. Hardened RLS and audit logging for donations.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema Extensions for public.donations
-- ------------------------------------------------------------------------------
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS blood_request_id TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS camp_id TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_donations_donor_id ON public.donations(donor_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_user_id ON public.donations(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donations_donation_date ON public.donations(donation_date);
CREATE INDEX IF NOT EXISTS idx_donations_source ON public.donations(source);
CREATE INDEX IF NOT EXISTS idx_donations_blood_request_id ON public.donations(blood_request_id);

-- ------------------------------------------------------------------------------
-- 2. Schema Extensions for public.donors
-- ------------------------------------------------------------------------------
ALTER TABLE public.donors ADD COLUMN IF NOT EXISTS historical_donation_count INTEGER DEFAULT 0;

-- ------------------------------------------------------------------------------
-- 3. Robust Trigger for Synchronizing Donor Total Donations & Last Donation Date
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_donor_donation_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_donor_id TEXT;
  v_digital_count INTEGER := 0;
  v_digital_last_date DATE;
  v_existing_last_date DATE;
  v_historical_count INTEGER := 0;
BEGIN
  v_donor_id := COALESCE(NEW.donor_id, OLD.donor_id);

  IF v_donor_id IS NOT NULL THEN
    -- 1. Get count and max date from digital donation rows
    SELECT count(*), max(donation_date)
    INTO v_digital_count, v_digital_last_date
    FROM public.donations
    WHERE donor_id = v_donor_id;

    -- 2. Get current historical baseline from donor record
    SELECT COALESCE(historical_donation_count, 0), last_donation_date
    INTO v_historical_count, v_existing_last_date
    FROM public.donors
    WHERE id = v_donor_id OR donor_id = v_donor_id
    LIMIT 1;

    -- 3. Compute final last donation date (preferring latest digital date if available)
    IF v_digital_last_date IS NOT NULL THEN
      IF v_existing_last_date IS NOT NULL THEN
        v_existing_last_date := GREATEST(v_digital_last_date, v_existing_last_date);
      ELSE
        v_existing_last_date := v_digital_last_date;
      END IF;
    END IF;

    -- 4. Update donor profile with reconciled total and latest donation date
    UPDATE public.donors
    SET total_donations = COALESCE(v_historical_count, 0) + COALESCE(v_digital_count, 0),
        last_donation_date = v_existing_last_date,
        updated_at = NOW()
    WHERE id = v_donor_id OR donor_id = v_donor_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_sync_donor_donation_metrics ON public.donations;
CREATE TRIGGER trg_sync_donor_donation_metrics
  AFTER INSERT OR UPDATE OR DELETE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_donor_donation_metrics();

-- ------------------------------------------------------------------------------
-- 4. Hardened RLS Policies on public.donations
-- ------------------------------------------------------------------------------
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own donations or staff view all" ON public.donations;
DROP POLICY IF EXISTS "Staff can insert donations" ON public.donations;
DROP POLICY IF EXISTS "Admins and moderators can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON public.donations;

CREATE POLICY "Users can view own donations or staff view all" ON public.donations
  FOR SELECT USING (
    public.is_staff() 
    OR (auth.uid() IS NOT NULL AND donor_user_id = auth.uid()::text)
  );

CREATE POLICY "Staff can insert donations" ON public.donations
  FOR INSERT WITH CHECK (
    public.is_staff() OR current_user = 'service_role'
  );

CREATE POLICY "Admins and moderators can update donations" ON public.donations
  FOR UPDATE USING (
    (public.is_staff() AND (SELECT role FROM public.users WHERE id = auth.uid()::text) IN ('super_admin', 'admin', 'moderator'))
    OR current_user = 'service_role'
  );

CREATE POLICY "Admins can delete donations" ON public.donations
  FOR DELETE USING (
    public.is_admin() OR current_user = 'service_role'
  );
