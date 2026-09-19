-- ==============================================================================
-- ROKTOBONDHON PHASE 1F-A: AUTOMATED OVERDUE BLOOD REQUEST EXPIRATION
-- Migration: 20260916_phase1f_a_automated_expiration.sql
-- Description: Hardens and automates overdue blood request expiration maintenance:
--   1. Replaces public.expire_overdue_blood_requests() with 1-100 batch clamping,
--      advisory transaction lock, 2-day grace period, FOR UPDATE SKIP LOCKED,
--      deterministic notifications, and structured audit logs.
--   2. Enforces strict execution permission: REVOKE from PUBLIC/anon/authenticated,
--      GRANT exclusively to service_role.
--   3. Registers hourly pg_cron maintenance job 'expire-overdue-blood-requests'.
-- ==============================================================================

-- 1. Automated Overdue Blood Request Expiration Maintenance Function
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
  v_lock_acquired BOOLEAN;
BEGIN
  -- A. Clamp batch limit strictly between 1 and 100 (default 50)
  IF p_batch_limit IS NULL OR p_batch_limit < 1 THEN
    p_batch_limit := 50;
  ELSIF p_batch_limit > 100 THEN
    p_batch_limit := 100;
  END IF;

  -- B. Authorization Check: Caller MUST be authorized staff OR executed in trusted backend worker context (service_role / postgres)
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NOT NULL AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Only authorized staff or maintenance jobs can execute request expiration.';
  END IF;

  -- C. Advisory Transaction Lock to prevent concurrent overlapping executions
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext('expire_overdue_blood_requests'));
  IF NOT v_lock_acquired THEN
    RETURN jsonb_build_object(
      'success', false,
      'expired_count', 0,
      'expired_ids', ARRAY[]::TEXT[],
      'message', 'Another blood request expiration maintenance job is currently executing.'
    );
  END IF;

  -- D. Set Transaction-Local Marker for Expiration (enforces canonical transition)
  PERFORM set_config('app.in_blood_request_expiration', 'true', true);

  -- E. Fetch and lock overdue requests with 2-day grace period (only active or matched)
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

    -- Dispatch closure notification to requester (deterministic deduplication)
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

    -- Record Audit Trail (Zero Sensitive PII)
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

-- 2. Restrict Execution Privileges
REVOKE ALL ON FUNCTION public.expire_overdue_blood_requests(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_overdue_blood_requests(INTEGER) TO service_role;

-- 3. Idempotent pg_cron Automated Hourly Job Registration
DO $cron_setup$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-overdue-blood-requests') THEN
    PERFORM cron.unschedule('expire-overdue-blood-requests');
  END IF;

  PERFORM cron.schedule(
    'expire-overdue-blood-requests',
    '0 * * * *',
    'SELECT public.expire_overdue_blood_requests(100);'
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron registration skipped or encountered non-fatal error: %', SQLERRM;
END;
$cron_setup$;
