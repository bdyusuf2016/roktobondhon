-- ==============================================================================
-- ROKTOBONDHON — PHASE 1A SECURITY REMEDIATION MIGRATION
-- ==============================================================================
-- Finding SEC-P1A-01 (P2 Medium):
--   Enforce strict blood request ownership & active state verification on
--   public.donor_requests INSERT operations. Prevents cross-owner injection.
--
-- Finding SEC-P1A-02 (P3 Low):
--   Synchronize protect_donor_request_fields() trigger and trigger binding
--   with correct auth.uid() IS NULL definer check.
-- ==============================================================================

-- 1. Synchronize protect_donor_request_fields() Trigger Function
CREATE OR REPLACE FUNCTION public.protect_donor_request_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow backend service/admin ONLY if not an authenticated client session
  IF (current_user IN ('postgres', 'supabase_admin', 'service_role') AND auth.uid() IS NULL) OR public.is_staff() THEN
    RETURN NEW;
  END IF;

  -- Strictly block ordinary users from modifying protected fields
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

-- Ensure trigger is active
DROP TRIGGER IF EXISTS trg_protect_donor_request_fields ON public.donor_requests;
CREATE TRIGGER trg_protect_donor_request_fields
  BEFORE UPDATE ON public.donor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_donor_request_fields();

-- 2. Drop ALL legacy/permissive policies on donor_requests
ALTER TABLE public.donor_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public all on donor_requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can view donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can insert donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can update donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users and system can create donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Users can view relevant donor requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Donors can respond to their requests" ON public.donor_requests;
DROP POLICY IF EXISTS "Requesters and staff create donor requests" ON public.donor_requests;

-- 3. Apply strict, hardened policies
CREATE POLICY "Users can view relevant donor requests" ON public.donor_requests
  FOR SELECT USING (
    donor_user_id = auth.uid()::text 
    OR requester_user_id = auth.uid()::text 
    OR public.is_staff()
  );

CREATE POLICY "Requesters and staff create donor requests" ON public.donor_requests
  FOR INSERT WITH CHECK (
    public.is_staff()
    OR (
      requester_user_id = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM public.blood_requests br
        WHERE br.id = blood_request_id
        AND br.user_id = auth.uid()::text
        AND br.status IN ('active', 'pending', 'matched', 'verified')
      )
    )
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
