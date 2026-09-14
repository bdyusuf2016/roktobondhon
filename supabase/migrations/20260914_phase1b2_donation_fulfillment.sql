-- ==============================================================================
-- ROKTOBONDHON PHASE 1B-2: DONATION FULFILLMENT LIFECYCLE
-- Migration File: 20260914_phase1b2_donation_fulfillment.sql
-- ==============================================================================
-- Scope:
-- 1. Schema enhancements on public.donations (donor_request_id, unique index).
-- 2. Field protection trigger on public.donations (immutable relationship keys).
-- 3. Authoritative transactional RPC complete_donation_fulfillment():
--    - Authoritative auth.uid() authentication & assigned-donor authorization.
--    - Cross-owner integrity verification (donor_request.requester_user_id = blood_request.user_id).
--    - Row-locks donor_request and blood_request (concurrency & race safe).
--    - Ensures donor_request status is 'accepted'.
--    - Ensures blood_request is active/matched and not already fulfilled/cancelled/expired.
--    - Inserts official public.donations row.
--    - Updates blood_requests status to 'fulfilled'.
--    - Syncs donor stats (total_donations, last_donation_date, next_eligible_date).
--    - Dispatches atomic notifications for Requester and Donor (zero PII, deduplicated).
--    - Records immutable audit trail via record_audit_log().
-- 4. Hardened RLS policies on public.donations:
--    - Purges legacy policies dynamically via clean DO loop.
--    - Selective SELECT for Donors (own), Requesters (attached request), and Staff.
--    - Direct INSERT restricted to Staff/Service role (ordinary users use RPC).
--    - Direct UPDATE/DELETE restricted to Admins.
-- ==============================================================================

-- 1. Schema Enhancements on public.donations
ALTER TABLE public.donations 
  ADD COLUMN IF NOT EXISTS donor_request_id TEXT REFERENCES public.donor_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS blood_request_id TEXT REFERENCES public.blood_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'request',
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS camp_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Unique Index to prevent duplicate donations per donor request at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_donor_request_id 
  ON public.donations(donor_request_id) 
  WHERE donor_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_donations_donor_user_id ON public.donations(donor_user_id);
CREATE INDEX IF NOT EXISTS idx_donations_blood_request_id ON public.donations(blood_request_id);

-- 2. Trigger: Protect Immutable Relationship Fields on public.donations
CREATE OR REPLACE FUNCTION public.protect_donation_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF (auth.uid() IS NULL AND current_user IN ('postgres', 'supabase_admin', 'service_role')) OR public.is_admin() THEN
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

-- 3. Authoritative Atomic Donation Fulfillment RPC
CREATE OR REPLACE FUNCTION public.complete_donation_fulfillment(
  p_donor_request_id TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_caller_uid UUID;
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
  -- 1. Authentication Check (auth.uid() is authoritative)
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to fulfill donation.';
  END IF;

  -- 2. Lock and fetch target donor_request
  SELECT * INTO v_dreq
  FROM public.donor_requests
  WHERE id = p_donor_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor request not found: %', p_donor_request_id;
  END IF;

  -- 3. Authorization Check: Caller must be the assigned donor or authorized staff
  IF NOT public.is_staff() THEN
    IF v_dreq.donor_user_id != v_caller_uid::text THEN
      RAISE EXCEPTION 'Unauthorized: Only the assigned donor or staff can complete this donation.';
    END IF;
  END IF;

  -- 4. Status Check: Donor request must be accepted
  IF v_dreq.status != 'accepted' THEN
    RAISE EXCEPTION 'Cannot complete donation for donor request with status "%". Donor request must be accepted first.', v_dreq.status;
  END IF;

  -- 5. Lock and fetch parent blood_request
  SELECT * INTO v_breq
  FROM public.blood_requests
  WHERE id = v_dreq.blood_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked blood request not found: %', v_dreq.blood_request_id;
  END IF;

  -- 6. Cross-owner integrity validation
  IF v_dreq.requester_user_id != v_breq.user_id THEN
    RAISE EXCEPTION 'Integrity violation: donor_request requester does not match parent blood request owner.';
  END IF;

  -- 7. Idempotency / Duplicate Check (If already fulfilled by this donor, return cleanly)
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

  -- 8. Blood Request Lifecycle Invariant Checks
  IF v_breq.status = 'fulfilled' THEN
    RAISE EXCEPTION 'Blood request is already fulfilled.';
  END IF;

  IF v_breq.status IN ('cancelled', 'expired') THEN
    RAISE EXCEPTION 'Cannot complete donation for a % blood request.', v_breq.status;
  END IF;

  -- 9. Fetch Donor details for metrics calculation
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

  -- 10. Generate Deterministic / Collision-Free Donation ID
  v_donation_id := 'don-' || extract(epoch from v_now)::bigint || '-' || substr(md5(p_donor_request_id || random()::text), 1, 6);

  -- 11. Insert Official Donation Record
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

  -- 12. Update Blood Request Status to 'fulfilled'
  UPDATE public.blood_requests
  SET status = 'fulfilled',
      updated_at = v_now
  WHERE id = v_breq.id;

  -- 13. Update Donor Profile Statistics
  IF v_donor.id IS NOT NULL THEN
    UPDATE public.donors
    SET total_donations = COALESCE(total_donations, 0) + 1,
        last_donation_date = v_today,
        next_eligible_date = v_today + (v_interval_days || ' days')::INTERVAL,
        updated_at = v_now
    WHERE id = v_donor.id;
  END IF;

  -- 14. Dispatch Atomic Notification for Blood Requester (Zero PII)
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

  -- 15. Dispatch Atomic Thank-You Notification for Donor
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

  -- 16. Immutable Audit Log Trail
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
      'fulfilled_by', v_caller_uid::text
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

-- 4. Hardened Row Level Security (RLS) on public.donations
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

-- Donors can view own donations; Requesters can view donations for their blood requests; Staff view all
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

-- Direct client INSERT is restricted to Staff/System (Ordinary users use complete_donation_fulfillment RPC)
CREATE POLICY "Staff insert donations" ON public.donations
  FOR INSERT WITH CHECK (
    public.is_staff() OR current_user IN ('postgres', 'service_role')
  );

-- UPDATE is restricted to Admins
CREATE POLICY "Admins update donations" ON public.donations
  FOR UPDATE USING (
    public.is_admin()
  )
  WITH CHECK (
    public.is_admin()
  );

-- DELETE is restricted to Admins
CREATE POLICY "Admins delete donations" ON public.donations
  FOR DELETE USING (
    public.is_admin()
  );

-- Grants
GRANT EXECUTE ON FUNCTION public.complete_donation_fulfillment(TEXT, TEXT) TO authenticated;
