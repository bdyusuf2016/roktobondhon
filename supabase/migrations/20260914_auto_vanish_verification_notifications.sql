-- ==============================================================================
-- RoktoBondhon: Auto-Vanish Verification Notifications & Single Staff Queue
-- Migration File: 20260914_auto_vanish_verification_notifications.sql
-- Description:
-- 1. Updates notify_donor_registration() to insert 1 consolidated notification
--    for staff (user_id = 'staff') instead of looping over all staff members (which created 3 duplicates).
-- 2. Updates verify_donor() RPC to automatically delete (vanish) all reviewer
--    verification notifications when a donor is approved/verified, rejected, or suspended.
-- 3. Cleans up existing obsolete verification notifications for already-resolved donors.
-- ==============================================================================

-- 1. Update notify_donor_registration trigger function
DROP TRIGGER IF EXISTS trg_donor_registration_notification ON public.donors;
DROP TRIGGER IF EXISTS trg_notify_donor_registration ON public.donors;
DROP FUNCTION IF EXISTS public.notify_donor_registration() CASCADE;

CREATE OR REPLACE FUNCTION public.notify_donor_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Notify the registering donor (Pending Verification)
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      id, user_id, title, message, type, link, is_read, created_at
    ) VALUES (
      'notif-' || floor(random() * 10000000)::text,
      NEW.user_id,
      'রক্তদাতা প্রোফাইল যাচাইকরণ প্রক্রিয়াধীন',
      'আপনার রক্তদাতা প্রোফাইল সফলভাবে সংরক্ষিত হয়েছে। কালামপুর রক্ত দান পরিবারের তথ্য যাচাইয়ের পর আপনার প্রোফাইলটি সক্রিয় ও পাবলিক তালিকায় প্রদর্শিত হবে।',
      'verification',
      '/profile',
      false,
      NOW()
    );
  END IF;

  -- 2. Notify active staff reviewers via ONE consolidated notification (user_id = 'staff')
  -- This replaces the previous loop over all staff members which generated 3 duplicate notifications.
  INSERT INTO public.notifications (
    id, user_id, title, message, type, link, is_read, created_at
  ) VALUES (
    'notif-' || floor(random() * 10000000)::text,
    'staff',
    'নতুন রক্তদাতা যাচাইয়ের জন্য অপেক্ষমাণ',
    'নতুন রক্তদাতা ' || COALESCE(NEW.full_name, 'নামহীন') || ' (আইডি: ' || COALESCE(NEW.donor_id, NEW.id) || ') নিবন্ধিত হয়েছেন। অনুগ্রহ করে প্রোফাইলটি যাচাই করুন।',
    'verification',
    '/admin?tab=donors&subtab=pending&donorId=' || NEW.id,
    false,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-attach trigger
CREATE TRIGGER trg_donor_registration_notification
  AFTER INSERT ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_donor_registration();

-- 2. Update verify_donor RPC with Auto-Vanish logic
-- Drop existing function signatures first to avoid 42P13 error
DROP FUNCTION IF EXISTS public.verify_donor(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.verify_donor(text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.verify_donor(
  p_donor_id TEXT,
  p_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_donor RECORD;
  v_verifier_id TEXT := auth.uid()::text;
  v_verifier_name TEXT := 'Admin';
  v_log_id TEXT := 'vlog-' || floor(random() * 10000000)::text;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Strict authorization: caller must be active staff
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only authorized staff members can verify donors.';
  END IF;

  -- Validate allowed status
  IF p_status NOT IN ('unverified', 'pending', 'verified', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'Invalid verification status: %', p_status;
  END IF;

  -- Resolve actual verifier name from public.users
  SELECT full_name INTO v_verifier_name FROM public.users WHERE id = v_verifier_id;
  v_verifier_name := COALESCE(v_verifier_name, 'Authorized Staff');

  -- Find target donor
  SELECT * INTO v_donor FROM public.donors WHERE id = p_donor_id OR donor_id = p_donor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor not found: %', p_donor_id;
  END IF;

  -- Idempotency check: if already in target status, return cleanly
  IF v_donor.verification_status = p_status THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_verified', true,
      'donor_id', v_donor.id,
      'human_id', v_donor.donor_id,
      'status', p_status,
      'verified_by', v_donor.verified_by,
      'verified_at', v_donor.verified_at
    );
  END IF;

  -- Update donor status atomically
  UPDATE public.donors
  SET verification_status = p_status,
      verified_by = v_verifier_name,
      verified_at = CASE WHEN p_status = 'verified' THEN v_now ELSE verified_at END,
      admin_notes = COALESCE(p_notes, admin_notes),
      updated_at = v_now
  WHERE id = v_donor.id;

  -- Insert immutable verification log entry
  INSERT INTO public.verification_logs (
    id, donor_id, verified_by, status, notes, timestamp
  ) VALUES (
    v_log_id, v_donor.id, v_verifier_name, p_status, p_notes, v_now
  );

  -- ============================================================================
  -- AUTO-VANISH: Automatically delete all reviewer notifications for this donor
  -- Once resolved (verified, rejected, or suspended), no reviewer needs to see it!
  -- ============================================================================
  DELETE FROM public.notifications
  WHERE type = 'verification'
    AND (user_id = 'staff' OR link LIKE '%admin%' OR title LIKE '%অপেক্ষমাণ%')
    AND (
      message LIKE '%' || COALESCE(v_donor.donor_id, '') || '%'
      OR message LIKE '%' || v_donor.id || '%'
      OR link LIKE '%' || v_donor.id || '%'
    );

  -- Atomic Notification Generation for Donor Outcome (congratulations or explanation)
  IF v_donor.user_id IS NOT NULL THEN
    DECLARE
      v_notif_title TEXT;
      v_notif_msg TEXT;
    BEGIN
      IF p_status = 'verified' THEN
        v_notif_title := 'অভিনন্দন! আপনার রক্তদাতা প্রোফাইল ভেরিফাইড হয়েছে';
        v_notif_msg := 'কালামপুর রক্ত দান পরিবার আপনার রক্তদাতা প্রোফাইলটি সফলভাবে যাচাই ও ভেরিফাইড করেছে। এখন থেকে আপনি সরাসরি জরুরি রক্তদানের অনুরোধ পাবেন।';
      ELSIF p_status = 'rejected' THEN
        v_notif_title := 'রক্তদাতা প্রোফাইল আবেদন স্থগিত বা প্রত্যাখ্যাত';
        v_notif_msg := COALESCE('তথ্য অমিল বা অসম্পূর্ণতার কারণে আপনার আবেদনটি স্থগিত করা হয়েছে। কারণ: ' || p_notes, 'তথ্য অমিল বা অসম্পূর্ণতার কারণে আপনার আবেদনটি গ্রহণ করা সম্ভব হয়নি।');
      ELSIF p_status = 'suspended' THEN
        v_notif_title := 'রক্তদাতা প্রোফাইল সাময়িকভাবে স্থগিত';
        v_notif_msg := COALESCE('আপনার রক্তদাতা প্রোফাইলটি সাময়িকভাবে স্থগিত করা হয়েছে। কারণ: ' || p_notes, 'আপনার রক্তদাতা প্রোফাইলটি সাময়িকভাবে স্থগিত করা হয়েছে।');
      ELSE
        v_notif_title := 'রক্তদাতা প্রোফাইল পুনর্যাচাই প্রক্রিয়াধীন';
        v_notif_msg := 'আপনার রক্তদাতা প্রোফাইলটি পুনরায় যাচাইকরণের জন্য অপেক্ষমান রাখা হয়েছে।';
      END IF;

      INSERT INTO public.notifications (
        id, user_id, title, message, type, link, is_read, created_at
      ) VALUES (
        'notif-' || floor(random() * 10000000)::text,
        v_donor.user_id,
        v_notif_title,
        v_notif_msg,
        'verification',
        '/profile',
        false,
        v_now
      );
    END;
  END IF;

  -- Record audit log
  PERFORM public.record_audit_log(
    'DONOR_VERIFICATION_' || upper(p_status),
    'Donor',
    v_donor.id,
    jsonb_build_object(
      'donor_id', v_donor.id,
      'human_id', v_donor.donor_id,
      'status', p_status,
      'verifier', v_verifier_name,
      'notes', p_notes
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'donor_id', v_donor.id,
    'human_id', v_donor.donor_id,
    'status', p_status,
    'verified_by', v_verifier_name,
    'verified_at', v_now
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Cleanup existing resolved verification notifications
DELETE FROM public.notifications n
WHERE n.type = 'verification'
  AND (n.user_id = 'staff' OR n.link LIKE '%admin%' OR n.title LIKE '%অপেক্ষমাণ%')
  AND EXISTS (
    SELECT 1 FROM public.donors d
    WHERE d.verification_status != 'pending'
      AND (
        n.message LIKE '%' || d.donor_id || '%'
        OR n.message LIKE '%' || d.id || '%'
        OR n.link LIKE '%' || d.id || '%'
      )
  );
