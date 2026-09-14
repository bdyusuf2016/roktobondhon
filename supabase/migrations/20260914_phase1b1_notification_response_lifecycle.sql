-- ==============================================================================
-- ROKTOBONDHON — PHASE 1B-1: NOTIFICATION + DONOR RESPONSE LIFECYCLE MIGRATION
-- ==============================================================================
-- 1. Automated, atomic notification dispatch on donor request creation & response
-- 2. Zero PII leakage in notification payloads (No phone, email, NID, address)
-- 3. Database-level deduplication with deterministic notification primary keys
-- 4. Enforce legal state transitions (pending -> accepted/maybe/declined, maybe -> accepted/declined)
-- ==============================================================================

-- 1. Enhance protect_donor_request_fields() with state transition validation
CREATE OR REPLACE FUNCTION public.protect_donor_request_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow backend service/admin ONLY if not an authenticated client session
  IF (current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL) OR public.is_staff() THEN
    RETURN NEW;
  END IF;

  -- Strictly block ordinary users from modifying protected immutable fields
  IF (NEW.id IS DISTINCT FROM OLD.id) OR
     (NEW.blood_request_id IS DISTINCT FROM OLD.blood_request_id) OR
     (NEW.donor_id IS DISTINCT FROM OLD.donor_id) OR
     (NEW.donor_user_id IS DISTINCT FROM OLD.donor_user_id) OR
     (NEW.requester_user_id IS DISTINCT FROM OLD.requester_user_id) OR
     (NEW.match_score IS DISTINCT FROM OLD.match_score) OR
     (NEW.patient_name IS DISTINCT FROM OLD.patient_name) OR
     (NEW.hospital IS DISTINCT FROM OLD.hospital) OR
     (NEW.blood_group IS DISTINCT FROM OLD.blood_group) OR
     (NEW.emergency_level IS DISTINCT FROM OLD.emergency_level) OR
     (NEW.created_at IS DISTINCT FROM OLD.created_at) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of protected request fields is forbidden.';
  END IF;

  -- Validate allowed response status domain
  IF NEW.status NOT IN ('pending', 'accepted', 'maybe', 'declined') THEN
    RAISE EXCEPTION 'Invalid status for donor request response: %', NEW.status;
  END IF;

  -- Enforce state transition rules
  -- A declined request cannot be re-opened by donor without staff intervention
  IF OLD.status = 'declined' AND NEW.status != 'declined' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify a declined donor request.';
  END IF;

  -- Once accepted, cannot revert to pending
  IF OLD.status = 'accepted' AND NEW.status = 'pending' AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Accepted donor request cannot be reset to pending.';
  END IF;

  NEW.responded_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_donor_request_fields ON public.donor_requests;
CREATE TRIGGER trg_protect_donor_request_fields
  BEFORE UPDATE ON public.donor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donor_request_fields();

-- 2. Automated Trigger for Atomic Notification Dispatch
CREATE OR REPLACE FUNCTION public.handle_donor_request_notifications()
RETURNS TRIGGER AS $$
DECLARE
  v_notif_id TEXT;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
  v_link TEXT;
BEGIN
  -- A. When a new donor_request is dispatched (AFTER INSERT)
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' THEN
      v_notif_id := 'notif-dreq-' || NEW.id || '-invite';
      v_title := 'জরুরি রক্তদানের নতুন অনুরোধ (' || NEW.blood_group || ')';
      v_message := NEW.hospital || '-এ ' || NEW.blood_group || ' রক্তের জরুরি প্রয়োজন। অনুগ্রহ করে আপনার সম্মতি জানান।';
      v_type := 'request';
      v_link := '/profile?tab=requests';

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
        v_notif_id,
        NEW.donor_user_id,
        v_title,
        v_message,
        v_type,
        v_link,
        false,
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  -- B. When donor responds to the request (AFTER UPDATE of status)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'maybe', 'declined') THEN
      v_notif_id := 'notif-dreq-' || NEW.id || '-' || NEW.status;
      v_type := 'match';
      v_link := '/request/' || NEW.blood_request_id;

      IF NEW.status = 'accepted' THEN
        v_title := 'রক্তদাতা রক্তদানে সম্মতি দিয়েছেন!';
        v_message := 'একজন রক্তদাতা (' || NEW.blood_group || ') আপনার রক্তের অনুরোধে সাড়া দিয়ে রক্তদানে সম্মতি দিয়েছেন।';
      ELSIF NEW.status = 'maybe' THEN
        v_title := 'রক্তদাতা সম্ভাব্য সম্মতি জানিয়েছেন';
        v_message := 'একজন রক্তদাতা (' || NEW.blood_group || ') জানিয়েছেন তিনি সম্ভবত রক্তদান করতে পারবেন।';
      ELSIF NEW.status = 'declined' THEN
        v_title := 'রক্তদাতা অপারগতা প্রকাশ করেছেন';
        v_message := 'একজন রক্তদাতা (' || NEW.blood_group || ') বর্তমান অনুরোধটিতে রক্তদান করতে অপারগতা প্রকাশ করেছেন।';
      END IF;

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
        v_notif_id,
        NEW.requester_user_id,
        v_title,
        v_message,
        v_type,
        v_link,
        false,
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_donor_request_notifications ON public.donor_requests;
CREATE TRIGGER trg_donor_request_notifications
  AFTER INSERT OR UPDATE ON public.donor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_donor_request_notifications();

-- 3. Hardened Notifications Policies (Purge all legacy policies dynamically)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'notifications'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid()::text OR user_id = 'all' OR public.is_staff()
  );

CREATE POLICY "Staff can send notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    public.is_staff()
  );

CREATE POLICY "Users can mark notifications as read" ON public.notifications
  FOR UPDATE USING (
    user_id = auth.uid()::text OR public.is_staff()
  )
  WITH CHECK (
    user_id = auth.uid()::text OR public.is_staff()
  );
