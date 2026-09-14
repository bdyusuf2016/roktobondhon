-- ==============================================================================
-- ROKTOBONDHON PHASE 1D: DONOR HARDENING, SUBMISSIONS & EXPIRATION
-- Migration File: 20260914_phase1d_donor_hardening_and_submissions.sql
-- ==============================================================================
-- Scope:
-- 1. Field protection trigger on public.donors (protect_donor_fields):
--    - Immutable identity fields: id, donor_id, user_id, blood_group, created_at.
--    - Direct donor/staff mutation DENIED: verification_status, admin_notes, total_donations, last_donation_date, next_eligible_date.
--    - Trusted mutations permitted exclusively via transaction-local markers:
--      * app.in_donor_verification
--      * app.in_donation_submission_approval
--      * app.in_donation_fulfillment
--    - Normal profile fields remain directly editable by donor/staff per RLS.
-- 2. Offline donation submissions table (public.donation_submissions) & RLS:
--    - Preserves two-tier auth (donor_user_id does not FK to public.users).
--    - Informational snapshots for donor_name and blood_group.
--    - Unique compound index on (donor_id, donation_date) for active submissions.
--    - verify_donation_submission_ownership trigger enforcing submission.donor_id -> donors.id -> donors.user_id = auth.uid().
-- 3. Unique index on public.donations(donor_id, donation_date) for cross-system date deduplication.
-- 4. Authoritative review RPC: public.review_donation_submission():
--    - Atomic approval with cross-system date duplicate check.
--    - Derives canonical donor identity and blood group from locked public.donors record.
--    - Sets app.in_donation_submission_approval marker.
--    - Atomically updates donations, donors, submissions, notifications, and audit log.
-- 5. Authoritative donor moderation RPC: public.verify_donor_profile():
--    - Enforces approved verification state machine.
--    - Sets app.in_donor_verification marker.
--    - Records structured audit logs and notifies donor.
-- 6. Batch expiration maintenance RPC: public.expire_overdue_blood_requests():
--    - 2-day grace period (required_date < CURRENT_DATE - 2 days).
--    - Sets app.in_blood_request_expiration marker.
--    - Execution revoked from PUBLIC, anon, and authenticated.
-- ==============================================================================

-- 1. Field Protection Trigger on public.donors
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

-- 2. Create public.donation_submissions Table
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

-- Deduplicate any duplicate pending/approved submissions before index creation
DELETE FROM public.donation_submissions a
USING public.donation_submissions b
WHERE a.ctid < b.ctid
  AND a.donor_id = b.donor_id
  AND a.donation_date = b.donation_date
  AND a.status IN ('pending', 'approved')
  AND b.status IN ('pending', 'approved');

-- Unique index preventing duplicate pending/approved submissions for same donor on same date
CREATE UNIQUE INDEX IF NOT EXISTS idx_donation_submissions_donor_date
  ON public.donation_submissions(donor_id, donation_date)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_donation_submissions_status_date
  ON public.donation_submissions(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_donation_submissions_user
  ON public.donation_submissions(donor_user_id, status);

-- Deduplicate any duplicate donations before index creation
DELETE FROM public.donations a
USING public.donations b
WHERE a.ctid < b.ctid
  AND a.donor_id = b.donor_id
  AND a.donation_date = b.donation_date;

-- 3. Cross-System Deduplication Index on public.donations
CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_donor_date
  ON public.donations(donor_id, donation_date);

-- 4. Ownership Verification Trigger on public.donation_submissions
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

  -- Ensure authoritative donor_user_id
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

-- 5. RLS Policies on public.donation_submissions
ALTER TABLE public.donation_submissions ENABLE ROW LEVEL SECURITY;

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

-- Direct client updates are hard-blocked; reviews execute via review_donation_submission RPC
CREATE POLICY "Block direct client update on donation submissions" ON public.donation_submissions
  FOR UPDATE USING (false);

CREATE POLICY "Admins delete donation submissions" ON public.donation_submissions
  FOR DELETE USING (public.is_admin());

-- 6. Authoritative Review Donation Submission RPC
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
  -- A. Authentication Check (auth.uid() is authoritative)
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

  -- D. Lock target submission row (Deterministic Lock Step 1)
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

  -- F. Lock target donor row (Deterministic Lock Step 2)
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
      v_donor.blood_group, -- Canonical clinical key
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

-- 7. Authoritative Donor Moderation RPC
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

-- 8. Batch Expiration Maintenance RPC (Trusted Execution Only)
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
BEGIN
  -- A. Authorization Check: Caller MUST be authorized staff OR executed in trusted backend worker context
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only authorized staff or maintenance jobs can execute request expiration.';
  END IF;

  -- B. Set Transaction-Local Marker for Expiration
  PERFORM set_config('app.in_blood_request_expiration', 'true', true);

  -- C. Fetch and lock overdue requests with 2-day grace period
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

    -- Dispatch closure notification to requester
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

    -- Record Audit Trail
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

-- Revoke execution from PUBLIC, anon, and authenticated to prevent arbitrary client execution
REVOKE ALL ON FUNCTION public.expire_overdue_blood_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_blood_requests(INTEGER) TO service_role;
