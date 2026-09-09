-- ==============================================================================
-- ROKTOBONDHON - PRODUCTION-SAFE TWO-TIER AUTHENTICATION & DONOR MANAGEMENT HARDENING
-- Migration: 20260909_two_tier_auth_architecture.sql
-- ==============================================================================
-- Architecture:
-- 1. Tier 1: Staff / Portal Users
--    auth.users -> public.users.id = auth.users.id
--    Roles: super_admin, admin, moderator, volunteer. Access: Admin Portal according to RBAC.
--
-- 2. Tier 2: Ordinary Donors
--    auth.users -> public.donors.user_id = auth.users.id
--    Ordinary donors DO NOT have or require a public.users row.
--    Ordinary donors can NEVER be treated as staff.
--
-- 3. Staff Can Also Be Donors:
--    A staff account may optionally have BOTH public.users AND public.donors referencing
--    the same auth.users.id.
--
-- 4. Donation History & Count Synchronization:
--    - Optional donation dates (supports NULL donation_date).
--    - Automatic database trigger synchronization of donors.total_donations & donors.last_donation_date.
--    - Historical donations are preserved even if a donor profile is deleted.
--
-- 5. Secure Server-Side Privileged Operations:
--    - Trusted record_audit_log() RPC for immutable, non-forgeable audit entries.
--    - Trusted verify_donor() atomic RPC for status updates + immutable verification logs.
--    - Trusted admin_delete_donor() RPC for Super Admin & Admin donor deletion.
--    - Field protection triggers on donors, users, and donor_requests.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Canonical UUID-Only Authorization Functions (Strict auth.uid() = public.users.id)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
    AND u.role IN ('super_admin', 'admin', 'moderator', 'volunteer')
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
    AND u.role IN ('super_admin', 'admin')
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()::text
    AND u.role = 'super_admin'
    AND u.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 2. Trusted Server-Side Audit Log Creation (Prevents Forgery & Preserves Immutability)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_audit_log(
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_uid TEXT := auth.uid()::text;
  v_user_name TEXT := 'Anonymous';
  v_user_role TEXT := 'donor';
  v_log_id TEXT := 'audit-' || floor(random() * 10000000)::text;
BEGIN
  -- Authenticate & resolve actual actor info strictly from database tables
  IF v_uid IS NOT NULL THEN
    SELECT full_name, role INTO v_user_name, v_user_role
    FROM public.users
    WHERE id = v_uid;

    IF v_user_name IS NULL THEN
      SELECT full_name INTO v_user_name
      FROM public.donors
      WHERE user_id = v_uid;

      v_user_name := COALESCE(v_user_name, 'Authenticated Donor');
      v_user_role := 'donor';
    END IF;
  ELSE
    v_uid := 'system';
    v_user_name := 'System';
    v_user_role := 'system';
  END IF;

  INSERT INTO public.audit_logs (
    id, user_id, user_name, user_role, action, target_type, target_id, metadata, timestamp
  ) VALUES (
    v_log_id, v_uid, v_user_name, v_user_role, p_action, p_target_type, p_target_id, p_metadata, NOW()
  );

  RETURN jsonb_build_object('success', true, 'log_id', v_log_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.record_audit_log(TEXT, TEXT, TEXT, JSONB) TO authenticated, anon;

-- ------------------------------------------------------------------------------
-- 3. Relax public.donations Schema & Preserve Historical Donations
-- ------------------------------------------------------------------------------
ALTER TABLE public.donations ALTER COLUMN donation_date DROP NOT NULL;
ALTER TABLE public.donations ALTER COLUMN hospital DROP NOT NULL;
ALTER TABLE public.donations ALTER COLUMN verification_date DROP NOT NULL;
ALTER TABLE public.donations ALTER COLUMN verified_by DROP NOT NULL;

-- Remove hard cascade on donations so donor deletion never destroys historical donation records
ALTER TABLE public.donations DROP CONSTRAINT IF EXISTS donations_donor_id_fkey;

-- ------------------------------------------------------------------------------
-- 4. Automatic Trigger to Synchronize donors.total_donations and donors.last_donation_date
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_donor_donation_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_donor_id TEXT;
  v_count INTEGER;
  v_last_date DATE;
BEGIN
  v_donor_id := COALESCE(NEW.donor_id, OLD.donor_id);

  IF v_donor_id IS NOT NULL THEN
    -- Total count includes all donation records (even where donation_date IS NULL)
    SELECT count(*), max(donation_date)
    INTO v_count, v_last_date
    FROM public.donations
    WHERE donor_id = v_donor_id;

    -- Update donor profile cache
    UPDATE public.donors
    SET total_donations = COALESCE(v_count, 0),
        last_donation_date = v_last_date,
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
-- 5. Atomic & Secure Donor Verification RPC Function
-- ------------------------------------------------------------------------------
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

  -- Insert immutable verification log entry (generated ONLY via this trusted RPC)
  INSERT INTO public.verification_logs (
    id, donor_id, verified_by, status, notes, timestamp
  ) VALUES (
    v_log_id, v_donor.id, v_verifier_name, p_status, p_notes, v_now
  );

  -- Atomic Notification Generation for Donor (Only notifies donor of verification outcome)
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
    jsonb_build_object('donor_id', v_donor.donor_id, 'new_status', p_status, 'notes', p_notes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'donor_id', v_donor.id,
    'human_id', v_donor.donor_id,
    'status', p_status,
    'verified_by', v_verifier_name,
    'verified_at', v_now,
    'log_id', v_log_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.verify_donor(TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. Server-Side Donor Deletion RPC Function (Guarding Staff Dual Role & History)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_donor(p_donor_id TEXT)
RETURNS JSONB AS $$
DECLARE
  v_donor RECORD;
  v_is_staff BOOLEAN := FALSE;
  v_caller_role TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only Super Admin and Admin can delete donors.';
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid()::text;

  SELECT * INTO v_donor FROM public.donors WHERE id = p_donor_id OR donor_id = p_donor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donor not found: %', p_donor_id;
  END IF;

  -- Check if donor is also a staff member in public.users
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = v_donor.user_id) INTO v_is_staff;

  -- Prevent admin from deleting super_admin donor record
  IF v_caller_role = 'admin' AND v_is_staff THEN
    IF EXISTS (SELECT 1 FROM public.users WHERE id = v_donor.user_id AND role = 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: Admins cannot delete Super Admin donor profiles.';
    END IF;
  END IF;

  -- Preserve historical donation records by unlinking user_id rather than deleting rows
  UPDATE public.donations 
  SET donor_user_id = 'unlinked_deleted_donor' 
  WHERE donor_id = v_donor.id OR donor_id = v_donor.donor_id;

  -- Delete donor record from public.donors (cascades to donor_requests)
  DELETE FROM public.donors WHERE id = v_donor.id;

  -- Record deletion in public.audit_logs via trusted function
  PERFORM public.record_audit_log(
    CASE WHEN v_is_staff THEN 'DELETE_DONOR_PROFILE' ELSE 'DELETE_DONOR_ACCOUNT' END,
    'Donor',
    v_donor.id,
    jsonb_build_object(
      'donor_id', v_donor.donor_id,
      'donor_name', v_donor.full_name,
      'user_id', v_donor.user_id,
      'is_staff', v_is_staff,
      'donations_preserved', true
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'donor_id', v_donor.id,
    'human_id', v_donor.donor_id,
    'user_id', v_donor.user_id,
    'is_staff', v_is_staff
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.admin_delete_donor(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_donor(TEXT) FROM anon;

-- ------------------------------------------------------------------------------
-- 7. Hardened public.users RLS Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile or staff view all" ON public.users;
DROP POLICY IF EXISTS "Staff and users can view profiles" ON public.users;
DROP POLICY IF EXISTS "Public users view" ON public.users;
DROP POLICY IF EXISTS "Staff can view users or user view self" ON public.users;

CREATE POLICY "Staff can view users or user view self" ON public.users
  FOR SELECT USING (
    auth.uid()::text = id 
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Staff and users can insert profiles" ON public.users;
DROP POLICY IF EXISTS "Admins and service_role can insert portal users" ON public.users;

CREATE POLICY "Admins and service_role can insert portal users" ON public.users
  FOR INSERT WITH CHECK (
    public.is_admin() 
    OR current_user = 'service_role'
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile or admin update" ON public.users;

CREATE POLICY "Users can update own profile or admin update" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = id 
    OR public.is_admin()
  ) WITH CHECK (
    auth.uid()::text = id 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins can delete user profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users" ON public.users
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 8. Security Trigger on public.users (Privilege Escalation Prevention)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.organization_id IS DISTINCT FROM OLD.organization_id) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: Only administrators can modify user role, status, or organization.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_user_roles ON public.users;
CREATE TRIGGER trg_protect_user_roles
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_roles();

-- ------------------------------------------------------------------------------
-- 9. Security Trigger on public.donors (Protect System-Controlled Fields)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_donor_security_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_staff() OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF (NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of donor ID is forbidden.';
  END IF;

  IF (NEW.donor_id IS DISTINCT FROM OLD.donor_id) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of human donor ID is forbidden.';
  END IF;

  IF (NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of user_id is forbidden.';
  END IF;

  IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status) OR
     (NEW.verified_by IS DISTINCT FROM OLD.verified_by) OR
     (NEW.verified_at IS DISTINCT FROM OLD.verified_at) THEN
    RAISE EXCEPTION 'Unauthorized: Only staff can modify verification status.';
  END IF;

  IF (NEW.total_donations IS DISTINCT FROM OLD.total_donations) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of total donations count is forbidden.';
  END IF;

  IF (NEW.organization_id IS DISTINCT FROM OLD.organization_id) OR
     (NEW.branch_id IS DISTINCT FROM OLD.branch_id) THEN
    RAISE EXCEPTION 'Unauthorized: Modification of organization/branch is forbidden.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_protect_donor_verification ON public.donors;
DROP TRIGGER IF EXISTS trg_protect_donor_security_fields ON public.donors;
CREATE TRIGGER trg_protect_donor_security_fields
  BEFORE UPDATE ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donor_security_fields();

-- ------------------------------------------------------------------------------
-- 10. Hardened public.donors RLS Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.donors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on donors" ON public.donors;
DROP POLICY IF EXISTS "Public can view donors" ON public.donors;
DROP POLICY IF EXISTS "Public can view verified donors" ON public.donors;
DROP POLICY IF EXISTS "Donors select policy" ON public.donors;
DROP POLICY IF EXISTS "Donors can view own or staff view all" ON public.donors;

CREATE POLICY "Donors can view own or staff view all" ON public.donors
  FOR SELECT USING (
    auth.uid()::text = user_id 
    OR public.is_staff() 
    OR verification_status = 'verified'
  );

DROP POLICY IF EXISTS "Public can register as donor" ON public.donors;
DROP POLICY IF EXISTS "Authenticated users can create donor record" ON public.donors;
DROP POLICY IF EXISTS "Donors can insert own record" ON public.donors;

CREATE POLICY "Donors can insert own record" ON public.donors
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id 
    OR public.is_staff() 
    OR current_user = 'service_role'
  );

DROP POLICY IF EXISTS "Donors/Admins can update donor records" ON public.donors;
DROP POLICY IF EXISTS "Donors can update own record" ON public.donors;

CREATE POLICY "Donors can update own record" ON public.donors
  FOR UPDATE USING (
    auth.uid()::text = user_id 
    OR public.is_staff()
  ) WITH CHECK (
    auth.uid()::text = user_id 
    OR public.is_staff()
  );

DROP POLICY IF EXISTS "Admins can delete donor records" ON public.donors;
DROP POLICY IF EXISTS "Admins can delete donors" ON public.donors;
CREATE POLICY "Admins can delete donors" ON public.donors
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 11. Hardened public.donations RLS Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can insert donations" ON public.donations;
DROP POLICY IF EXISTS "Public can view donation impact logs" ON public.donations;
DROP POLICY IF EXISTS "Staff can insert verified donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can update donations" ON public.donations;
DROP POLICY IF EXISTS "Admins can delete donations" ON public.donations;
DROP POLICY IF EXISTS "Donors can view own donations or staff view all" ON public.donations;

CREATE POLICY "Donors can view own donations or staff view all" ON public.donations
  FOR SELECT USING (
    donor_user_id = auth.uid()::text
    OR public.is_staff()
  );

CREATE POLICY "Staff can insert verified donations" ON public.donations
  FOR INSERT WITH CHECK (public.is_staff());

CREATE POLICY "Admins can update donations" ON public.donations
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete donations" ON public.donations
  FOR DELETE USING (public.is_admin());

-- ------------------------------------------------------------------------------
-- 12. Security Trigger on public.donor_requests (Strict Response-Only Protection)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_donor_request_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If executed by staff or superuser, allow full update
  IF public.is_staff() OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  -- For ordinary donors (donor_user_id = auth.uid()):
  -- Ensure that ONLY status, decline_reason, and responded_at can be modified
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

  -- Validate allowed response status
  IF NEW.status NOT IN ('pending', 'accepted', 'maybe', 'declined') THEN
    RAISE EXCEPTION 'Invalid status for donor request response: %', NEW.status;
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

-- ------------------------------------------------------------------------------
-- 13. Hardened public.donor_requests RLS Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.donor_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can insert donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can update donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can view relevant donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users and system can create donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Donors can respond to their requests" ON public.donor_requests;

CREATE POLICY "Users can view relevant donor requests" ON public.donor_requests
  FOR SELECT USING (
    donor_user_id = auth.uid()::text 
    OR requester_user_id = auth.uid()::text 
    OR public.is_staff()
  );

CREATE POLICY "Users and system can create donor requests" ON public.donor_requests
  FOR INSERT WITH CHECK (
    requester_user_id = auth.uid()::text 
    OR public.is_staff()
  );

CREATE POLICY "Donors can respond to their requests" ON public.donor_requests
  FOR UPDATE USING (
    donor_user_id = auth.uid()::text 
    OR public.is_staff()
  )
  WITH CHECK (
    donor_user_id = auth.uid()::text 
    OR public.is_staff()
  );

-- ------------------------------------------------------------------------------
-- 14. Hardened public.verification_logs RLS Policies (Immutable Audit Trail)
-- ------------------------------------------------------------------------------
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Admins can insert verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Staff can view verification logs" ON public.verification_logs;
DROP POLICY IF EXISTS "Staff can record verification logs" ON public.verification_logs;

-- Direct client INSERT is removed; logs are written exclusively via verify_donor() RPC
CREATE POLICY "Staff can view verification logs" ON public.verification_logs
  FOR SELECT USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 15. Hardened public.audit_logs RLS Policies (Immutable Security Logs)
-- ------------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff can view audit trail" ON public.audit_logs;
DROP POLICY IF EXISTS "System can record audit logs" ON public.audit_logs;

-- Direct client INSERT is removed; logs are written exclusively via record_audit_log() RPC
CREATE POLICY "Staff can view audit trail" ON public.audit_logs
  FOR SELECT USING (public.is_staff());

-- ------------------------------------------------------------------------------
-- 16. Safe Public Donor View / Search (Exposes only safe public fields)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.donors_public_search AS
SELECT
  d.id,
  d.donor_id,
  d.full_name,
  d.photo_url,
  d.blood_group,
  d.division,
  d.district,
  d.upazila,
  d.area,
  d.location_label,
  d.availability,
  d.emergency_available,
  d.last_donation_date,
  d.total_donations,
  d.verification_status,
  d.organization_id,
  d.branch_id,
  d.gender,
  CASE 
    WHEN (d.privacy->>'showPhone')::boolean = true THEN d.phone
    ELSE ''
  END AS phone,
  d.created_at
FROM public.donors d
WHERE d.verification_status = 'verified';

GRANT SELECT ON public.donors_public_search TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 17. Donor Registration Notification Trigger (Notifies Donor & Active Reviewers)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_donor_registration()
RETURNS TRIGGER AS $$
DECLARE
  v_staff RECORD;
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

  -- 2. Notify all active Super Admin, Admin, and Moderator staff members (Volunteers excluded)
  FOR v_staff IN 
    SELECT id FROM public.users 
    WHERE role IN ('super_admin', 'admin', 'moderator') 
    AND status = 'active'
    AND id != COALESCE(NEW.user_id, '') -- Avoid self-notification if a staff member registers as donor
  LOOP
    INSERT INTO public.notifications (
      id, user_id, title, message, type, link, is_read, created_at
    ) VALUES (
      'notif-' || floor(random() * 10000000)::text,
      v_staff.id,
      'নতুন রক্তদাতা যাচাইয়ের জন্য অপেক্ষমাণ',
      'নতুন রক্তদাতা ' || COALESCE(NEW.full_name, 'নামহীন') || ' (আইডি: ' || COALESCE(NEW.donor_id, NEW.id) || ') নিবন্ধিত হয়েছেন। অনুগ্রহ করে প্রোফাইলটি যাচাই করুন।',
      'verification',
      '/admin?tab=donors',
      false,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_donor_registration_notification ON public.donors;
CREATE TRIGGER trg_donor_registration_notification
  AFTER INSERT ON public.donors
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_donor_registration();

-- ------------------------------------------------------------------------------
-- 18. Hardened public.notifications RLS Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff can send notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications or admin delete" ON public.notifications;

CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid()::text 
    OR user_id = 'all' 
    OR public.is_staff()
  );

CREATE POLICY "Staff can send notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    public.is_staff()
    OR current_user = 'service_role'
  );

CREATE POLICY "Users can mark notifications as read" ON public.notifications
  FOR UPDATE USING (
    user_id = auth.uid()::text 
    OR public.is_staff()
  ) WITH CHECK (
    user_id = auth.uid()::text 
    OR public.is_staff()
  );

CREATE POLICY "Users can delete own notifications or admin delete" ON public.notifications
  FOR DELETE USING (
    user_id = auth.uid()::text 
    OR public.is_admin()
  );

