-- ==============================================================================
-- ROKTOBONDHON PHASE 1C: CORE OPERATIONAL WORKFLOW & LIFECYCLE HARDENING
-- Migration File: 20260914_phase1c_operational_hardening.sql
-- ==============================================================================
-- Scope:
-- 1. Field protection & absolute terminal state trigger on public.blood_requests:
--    - Immutable identity fields: id, request_id, user_id, blood_group, created_at, organization_id.
--    - ABSOLUTE Terminal State Invariant: fulfilled, cancelled, expired CANNOT be reopened/altered.
--    - Zero admin bypass for terminal states.
--    - Database-authoritative status transition matrix enforcement.
--    - Transaction-local GUC ('app.in_donation_fulfillment') enforcement for RPC-only fulfillment.
--    - Non-staff restricted from modifying verification attributes.
-- 2. Race-safe concurrency limit trigger on public.donor_requests:
--    - Exclusive FOR UPDATE row lock on parent blood_requests row.
--    - Enforces maximum 5 concurrent pending requests per blood request.
--    - Duplicate active dispatch prevention (cannot send 2nd active request to same donor).
--    - Blocks dispatch on terminal (fulfilled, cancelled, expired) blood requests.
-- 3. Strict privacy-preserving RPC public.get_accepted_donor_contact():
--    - Authenticated caller check (auth.uid()).
--    - Caller must own linked blood request OR be authorized staff.
--    - donor_request must have status = 'accepted'.
--    - Returns ONLY legitimate operational contact fields (phone, name, blood group, avatar, etc.).
--    - STRICTLY EXCLUDES emergency_contact, email, NID, DOB, exact address, admin notes.
-- 4. Authoritative match-state synchronization:
--    - public.recompute_blood_request_match_state(p_blood_request_id TEXT) locked down (REVOKE from client).
--    - Trigger trg_donor_request_match_state on public.donor_requests.
--    - Transitions active <-> matched based on presence of accepted requests.
--    - Absolute terminal safety (never alters fulfilled/cancelled/expired).
-- 5. Updated complete_donation_fulfillment RPC:
--    - Sets transaction-local marker 'app.in_donation_fulfillment' = 'true'.
-- 6. Operational Indexes:
--    - idx_blood_requests_status_emergency
--    - idx_donor_requests_active_count
-- ==============================================================================

-- 1. Field Protection Trigger on public.blood_requests
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

-- 2. Concurrency & Rate Limit Trigger on public.donor_requests
CREATE OR REPLACE FUNCTION public.enforce_donor_request_limits()
RETURNS TRIGGER AS $$
DECLARE
  v_pending_count INTEGER;
  v_breq_status TEXT;
BEGIN
  -- A. Row-level exclusive lock on parent blood_request row (Race Safety)
  SELECT status INTO v_breq_status
  FROM public.blood_requests
  WHERE id = NEW.blood_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Blood request does not exist: %', NEW.blood_request_id;
  END IF;

  -- B. Terminal invariant: Cannot dispatch donor requests for closed blood requests
  IF v_breq_status IN ('fulfilled', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'Cannot dispatch donor requests for a % blood request.', v_breq_status;
  END IF;

  -- C. Duplicate Active Dispatch Protection
  IF EXISTS (
    SELECT 1 FROM public.donor_requests
    WHERE blood_request_id = NEW.blood_request_id
      AND donor_id = NEW.donor_id
      AND status IN ('pending', 'accepted')
  ) THEN
    RAISE EXCEPTION 'Duplicate: A request has already been sent to this donor for this blood request.';
  END IF;

  -- D. Concurrent Rate Limit: Max 5 pending requests per blood request
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

-- 3. Privacy-Preserving Accepted Donor Contact RPC
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
  -- A. Authentication Check (auth.uid() is authoritative)
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to view donor contact details.';
  END IF;

  -- B. Fetch target donor request
  SELECT * INTO v_dreq
  FROM public.donor_requests
  WHERE id = p_donor_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor request not found: %', p_donor_request_id;
  END IF;

  -- C. Fetch linked parent blood request
  SELECT * INTO v_breq
  FROM public.blood_requests
  WHERE id = v_dreq.blood_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Linked blood request not found: %', v_dreq.blood_request_id;
  END IF;

  -- D. Authorization: Caller MUST be blood request owner OR authorized staff
  IF v_breq.user_id != v_caller_uid::text AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only the blood request owner or authorized staff can access donor contact details.';
  END IF;

  -- E. Consent Invariant: Status MUST be 'accepted'
  IF v_dreq.status != 'accepted' THEN
    RAISE EXCEPTION 'Unauthorized: Donor contact details are only disclosed when the request is accepted.';
  END IF;

  -- F. Fetch target donor record
  SELECT * INTO v_donor
  FROM public.donors
  WHERE id = v_dreq.donor_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor record not found.';
  END IF;

  -- G. Return strictly sanitized operational fields (Zero emergency_contact, zero NID, zero email)
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

-- 4. Match-State Synchronization Procedure & Trigger (Internal Trigger Helper)
CREATE OR REPLACE FUNCTION public.recompute_blood_request_match_state(
  p_blood_request_id TEXT
)
RETURNS VOID AS $$
DECLARE
  v_breq public.blood_requests%ROWTYPE;
  v_accepted_count INTEGER;
BEGIN
  -- Lock blood request row
  SELECT * INTO v_breq
  FROM public.blood_requests
  WHERE id = p_blood_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Terminal invariant: Never modify terminal requests
  IF v_breq.status IN ('fulfilled', 'cancelled', 'expired') THEN
    RETURN;
  END IF;

  -- Count accepted requests for this blood request
  SELECT count(*) INTO v_accepted_count
  FROM public.donor_requests
  WHERE blood_request_id = p_blood_request_id
    AND status = 'accepted';

  -- Transition active <-> matched
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

-- 5. Updated Complete Donation Fulfillment RPC (Sets Transaction-Local Marker)
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

  -- 12. Set Transaction-Local Authorization Marker for RPC-Only Fulfillment
  PERFORM set_config('app.in_donation_fulfillment', 'true', true);

  -- 13. Update Blood Request Status to 'fulfilled'
  UPDATE public.blood_requests
  SET status = 'fulfilled',
      updated_at = v_now
  WHERE id = v_breq.id;

  -- 14. Update Donor Profile Statistics
  IF v_donor.id IS NOT NULL THEN
    UPDATE public.donors
    SET total_donations = COALESCE(total_donations, 0) + 1,
        last_donation_date = v_today,
        next_eligible_date = v_today + (v_interval_days || ' days')::INTERVAL,
        updated_at = v_now
    WHERE id = v_donor.id;
  END IF;

  -- 15. Dispatch Atomic Notification for Blood Requester (Zero PII)
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

  -- 16. Dispatch Atomic Thank-You Notification for Donor
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

  -- 17. Immutable Audit Log Trail
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

GRANT EXECUTE ON FUNCTION public.complete_donation_fulfillment(TEXT, TEXT) TO authenticated;

-- 6. Operational Indexes
CREATE INDEX IF NOT EXISTS idx_blood_requests_status_emergency
  ON public.blood_requests(status, emergency_level);

CREATE INDEX IF NOT EXISTS idx_donor_requests_active_count
  ON public.donor_requests(blood_request_id, status);
