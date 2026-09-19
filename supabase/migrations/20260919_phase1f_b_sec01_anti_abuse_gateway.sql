-- ==============================================================================
-- ROKTOBONDHON PHASE 1F-B: SEC-01 ANTI-ABUSE GATEWAY & DIRECT INSERT LOCKDOWN
-- Migration: 20260919_phase1f_b_sec01_anti_abuse_gateway.sql
-- Description:
--   1. Creates public.rate_limits table for atomic server-side sliding-window throttling.
--   2. Implements public.check_and_increment_rate_limit() atomic PostgreSQL RPC.
--   3. Restricts rate-limit execution exclusively to service_role (denies public/anon).
--   4. Locks down direct public/anon PostgREST INSERT on blood_requests, camp_registrations,
--      and fund_donations (requires service_role / gateway context or authorized staff).
-- ==============================================================================

-- 1. Atomic Rate Limits Storage Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  limiter_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key_window
  ON public.rate_limits (limiter_key, window_start);

CREATE INDEX IF NOT EXISTS idx_rate_limits_created_at
  ON public.rate_limits (created_at);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.rate_limits TO service_role;

-- 2. Atomic Sliding-Window Rate Limiter RPC
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_limiter_key TEXT,
  p_window_seconds INTEGER DEFAULT 600,
  p_max_requests INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
  v_retry_after INTEGER;
BEGIN
  -- Input Sanitization & Clamping
  IF p_limiter_key IS NULL OR TRIM(p_limiter_key) = '' THEN
    RAISE EXCEPTION 'Limiter key cannot be null or empty.';
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    p_window_seconds := 600;
  ELSIF p_window_seconds > 86400 THEN
    p_window_seconds := 86400; -- Max 24 hours window
  END IF;

  IF p_max_requests IS NULL OR p_max_requests < 1 THEN
    p_max_requests := 5;
  END IF;

  -- Fixed sliding-window boundary
  v_window_start := to_timestamp(floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds);

  -- Atomic Upsert
  INSERT INTO public.rate_limits (limiter_key, window_start, request_count, created_at)
  VALUES (p_limiter_key, v_window_start, 1, v_now)
  ON CONFLICT (limiter_key, window_start)
  DO UPDATE SET request_count = public.rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  -- Probabilistic cleanup of stale buckets (5% chance on execution)
  IF (random() < 0.05) THEN
    DELETE FROM public.rate_limits WHERE window_start < (v_now - INTERVAL '2 days');
  END IF;

  -- Boundary check
  IF v_count > p_max_requests THEN
    v_retry_after := CEIL(p_window_seconds - extract(epoch from (v_now - v_window_start)))::INTEGER;
    IF v_retry_after < 1 THEN
      v_retry_after := 1;
    END IF;

    RETURN jsonb_build_object(
      'allowed', false,
      'current_count', v_count,
      'max_allowed', p_max_requests,
      'window_seconds', p_window_seconds,
      'retry_after_seconds', v_retry_after,
      'message', 'Rate limit exceeded. Please try again later.'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'current_count', v_count,
    'max_allowed', p_max_requests,
    'window_seconds', p_window_seconds,
    'remaining', (p_max_requests - v_count),
    'message', 'Request allowed.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 3. Direct PostgREST INSERT Lockdown: blood_requests
DROP POLICY IF EXISTS "Public create blood requests" ON public.blood_requests;
DROP POLICY IF EXISTS "Gateway and staff create blood requests" ON public.blood_requests;

CREATE POLICY "Gateway and staff create blood requests" ON public.blood_requests
  FOR INSERT WITH CHECK (
    current_user IN ('postgres', 'service_role')
    OR public.is_staff()
  );

-- 4. Direct PostgREST INSERT Lockdown: camp_registrations
DROP POLICY IF EXISTS "Public can register for blood camps" ON public.camp_registrations;
DROP POLICY IF EXISTS "Gateway and staff register for blood camps" ON public.camp_registrations;

CREATE POLICY "Gateway and staff register for blood camps" ON public.camp_registrations
  FOR INSERT WITH CHECK (
    current_user IN ('postgres', 'service_role')
    OR public.is_staff()
  );

-- 5. Direct PostgREST INSERT Lockdown: fund_donations
DROP POLICY IF EXISTS "Public can submit fund donation proof" ON public.fund_donations;
DROP POLICY IF EXISTS "Gateway and staff submit fund donation" ON public.fund_donations;

CREATE POLICY "Gateway and staff submit fund donation" ON public.fund_donations
  FOR INSERT WITH CHECK (
    current_user IN ('postgres', 'service_role')
    OR public.is_staff()
  );
