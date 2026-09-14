-- ==============================================================================
-- ROKTOBONDHON PHASE 1E: ADMINISTRATIVE OPERATIONS & FINANCIAL GOVERNANCE
-- Migration File: 20260915_phase1e_admin_and_financial_hardening.sql
-- ==============================================================================
-- Scope:
-- 1. Helper Functions:
--    - public.normalize_bangladesh_phone(p_phone TEXT) SQL normalizer.
-- 2. Update protect_donor_fields trigger:
--    - Adds 'app.in_manual_donation_entry' and 'app.in_donor_import' transaction GUC markers.
--    - Protects import_batch_id from direct mutation outside 'app.in_donor_import'.
-- 3. Financial Governance:
--    - Constraints on fund_donations (amount > 0 AND amount <= 1000000.00).
--    - Constraints on fund_disbursements (amount > 0 AND amount <= 5000000.00).
--    - Partial unique index on fund_donations (payment_method, UPPER(TRIM(transaction_id))) for active rows.
--    - protect_fund_donation_insert trigger enforcing 'pending' status and NULL verification metadata.
--    - verify_fund_donation() authoritative RPC (staff only, state machine, audit log).
--    - fund_donations_public view redacting donor PII and protecting anonymous donors.
--    - Raw fund_donations table RLS isolation (staff only SELECT, public INSERT, zero PII leak).
-- 4. Blood Camp Integrity:
--    - sync_camp_collected_units trigger on public.donations (single source of truth).
--    - protect_camp_metrics trigger on public.blood_camps (overrides direct manipulation).
--    - Partial unique index on camp_registrations (camp_id, TRIM(phone)) for active registrations.
--    - sync_camp_registration_counts trigger on camp_registrations (handles OLD and NEW camps).
-- 5. Authoritative Manual Donation Recording:
--    - record_manual_donation() RPC (staff only, canonical lookup, blood request validation,
--      Phase 1C lifecycle integration, accepted donor_request enforcement, metric synchronization, audit log).
-- 6. Donor Import Governance:
--    - donor_import_batches table.
--    - Explicit import_batch_id column & index on public.donors.
--    - admin_import_donors_batch() RPC (authoritative SQL phone normalization & metric validation).
--    - admin_rollback_import_batch() RPC (dependency-safe quarantine/deletion via explicit FK).
-- ==============================================================================

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
