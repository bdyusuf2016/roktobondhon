// Supabase Edge Function: anti-abuse-gateway
// High-Security Anti-Abuse Gateway for RoktoBondhon Public Write Surfaces
// Protects: blood_requests, camp_registrations, and fund_donations
// Features: Cloudflare Turnstile Verification, Authoritative Edge IP Only, Server-Side Validation, Atomic Sliding-Window Throttling

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cf-connecting-ip',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_PAYLOAD_BYTES = 65536; // 64 KB maximum payload size

const ALLOWED_ACTIONS = [
  'create_blood_request',
  'register_camp',
  'submit_fund_donation',
] as const;

type GatewayAction = typeof ALLOWED_ACTIONS[number];

interface GatewayPayload {
  action: GatewayAction;
  turnstileToken: string;
  data: Record<string, any>;
}

// ---------------------------------------------------------------------------
// 1. Trusted IP Extraction
// ---------------------------------------------------------------------------
// CRITICAL SECURITY ENFORCEMENT:
// Uses Cloudflare CF-Connecting-IP header ONLY.
// Client-supplied X-Forwarded-For and X-Real-IP are strictly IGNORED to prevent header spoofing.
// If CF-Connecting-IP is absent (e.g. non-Cloudflare/direct request), falls back to constant '0.0.0.0'.
// Attackers cannot rotate arbitrary headers to bypass rate limits.
export function extractTrustedIp(req: Request): string {
  const cfIp = req.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim().length > 0) {
    const trimmed = cfIp.trim();
    // Validate IPv4 or IPv6 structure to avoid header injection
    if (/^[\da-fA-F.:]{3,45}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return '0.0.0.0';
}

// ---------------------------------------------------------------------------
// 2. Validation & Sanitization Helpers
// ---------------------------------------------------------------------------
const VALID_BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const VALID_EMERGENCY_LEVELS = new Set(['NORMAL', 'URGENT', 'CRITICAL']);
const VALID_PAYMENT_METHODS = new Set(['bKash', 'Nagad', 'Rocket', 'Bank', 'Cash']);
const VALID_FUND_CAUSES = new Set(['general', 'patient_support', 'camp_fund', 'emergency']);

function isSafeString(val: unknown, minLen = 1, maxLen = 255): val is string {
  return typeof val === 'string' && val.trim().length >= minLen && val.trim().length <= maxLen;
}

function normalizeBangladeshPhone(phone: unknown): string | null {
  if (typeof phone !== 'string') return null;
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  // Match 013-019 11 digits
  if (digitsOnly.length === 11 && /^01[3-9]\d{8}$/.test(digitsOnly)) {
    return digitsOnly;
  }
  // Match 8801... 13 digits
  if (digitsOnly.length === 13 && digitsOnly.startsWith('8801') && /^8801[3-9]\d{8}$/.test(digitsOnly)) {
    return digitsOnly.substring(2);
  }
  return null;
}

function isValidDateString(dateStr: unknown): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function sanitizeEntityId(id: unknown, prefix = 'id'): string {
  if (typeof id === 'string' && /^[a-zA-Z0-9_-]{6,64}$/.test(id)) {
    return id;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

// ---------------------------------------------------------------------------
// 3. Server-Side Cloudflare Turnstile Verification
// ---------------------------------------------------------------------------
async function verifyTurnstile(token: string, remoteIp: string): Promise<{ success: boolean; errorCodes?: string[] }> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, errorCodes: ['missing-input-response'] };
  }

  const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY') || '1x0000000000000000000000000000000AA';

  // Cloudflare test tokens & dev simulation support
  if (secretKey === '1x0000000000000000000000000000000AA') {
    if (token === 'XXXX.DUMMY.TOKEN.FAIL' || token === 'invalid-test-token') {
      return { success: false, errorCodes: ['invalid-input-response'] };
    }
    if (token === 'XXXX.DUMMY.TOKEN.EXPIRED' || token === 'expired-test-token') {
      return { success: false, errorCodes: ['timeout-or-duplicate'] };
    }
    return { success: true };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    formData.append('remoteip', remoteIp);

    const siteverifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!siteverifyRes.ok) {
      return { success: false, errorCodes: [`http-status-${siteverifyRes.status}`] };
    }

    const result = await siteverifyRes.json();
    return {
      success: Boolean(result.success),
      errorCodes: result['error-codes'] || [],
    };
  } catch (_err) {
    return { success: false, errorCodes: ['network-error'] };
  }
}

// ---------------------------------------------------------------------------
// 4. Main Request Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // A. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // B. Enforce POST method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST is accepted.', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // C. Payload size check (Max 64KB)
  const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return new Response(
      JSON.stringify({ error: 'Payload size exceeds 64KB limit.', code: 'PAYLOAD_TOO_LARGE' }),
      { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // D. Extract Authoritative IP (Cloudflare edge only)
    const trustedIp = extractTrustedIp(req);
    const body: GatewayPayload = await req.json();

    // E. Validate action whitelist
    if (!body.action || !ALLOWED_ACTIONS.includes(body.action)) {
      return new Response(
        JSON.stringify({ error: `Unsupported or missing action: ${body.action}`, code: 'UNSUPPORTED_ACTION' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // F. Enforce Turnstile Token Verification
    if (!body.turnstileToken || typeof body.turnstileToken !== 'string' || body.turnstileToken.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Turnstile verification token is required.', code: 'MISSING_TURNSTILE_TOKEN' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const turnstileResult = await verifyTurnstile(body.turnstileToken, trustedIp);
    if (!turnstileResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Security challenge failed or token is expired/invalid.',
          code: 'TURNSTILE_FAILED',
          details: turnstileResult.errorCodes,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // G. Ensure data payload is a valid object
    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload structure.', code: 'INVALID_PAYLOAD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // H. Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error: credentials missing.', code: 'SERVER_CONFIG_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    // I. Server-Side Sliding-Window Rate Limiting Check
    let limiterKey = `ip:${body.action}:${trustedIp}`;
    let windowSeconds = 600; // 10 minutes
    let maxRequests = 5;

    if (body.action === 'create_blood_request') {
      windowSeconds = 600;
      maxRequests = 3; // 3 requests per 10 min per IP
    } else if (body.action === 'register_camp') {
      windowSeconds = 600;
      maxRequests = 5; // 5 registrations per 10 min per IP
    } else if (body.action === 'submit_fund_donation') {
      windowSeconds = 600;
      maxRequests = 5; // 5 donations per 10 min per IP
    }

    const { data: limitData, error: limitErr } = await supabaseAdmin.rpc('check_and_increment_rate_limit', {
      p_limiter_key: limiterKey,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (limitErr) {
      console.warn('Rate limit RPC notice:', limitErr.message);
    } else if (limitData && limitData.allowed === false) {
      const retryAfter = limitData.retry_after_seconds || 60;
      return new Response(
        JSON.stringify({
          error: 'অত্যধিক সংখ্যক অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর পুনরায় চেষ্টা করুন।',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: retryAfter,
          currentCount: limitData.current_count,
          maxAllowed: limitData.max_allowed,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // J. Secondary rate-limit for blood request by contact phone (max 5 / day)
    const raw = body.data;
    if (body.action === 'create_blood_request' && raw?.contactNumber) {
      const cleanPhone = normalizeBangladeshPhone(raw.contactNumber);
      if (cleanPhone) {
        const phoneKey = `phone:blood_req:${cleanPhone}`;
        const { data: phoneLimit } = await supabaseAdmin.rpc('check_and_increment_rate_limit', {
          p_limiter_key: phoneKey,
          p_window_seconds: 86400,
          p_max_requests: 5,
        });
        if (phoneLimit && phoneLimit.allowed === false) {
          return new Response(
            JSON.stringify({
              error: 'এই ফোন নম্বর থেকে আজকের জন্য নির্ধারিত সর্বোচ্চ রক্তের অনুরোধ পৌঁছে গেছে।',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfterSeconds: phoneLimit.retry_after_seconds || 3600,
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // -------------------------------------------------------------------------
    // K. Action Execution with Strict Server-Side Validation & Sanitization
    // -------------------------------------------------------------------------

    // 1. ACTION: create_blood_request
    if (body.action === 'create_blood_request') {
      // Validate Required Fields & Types
      if (!isSafeString(raw.patientName, 1, 100)) {
        return new Response(JSON.stringify({ error: 'রোগীর নাম আবশ্যক (১-১০০ অক্ষর)।', code: 'INVALID_PATIENT_NAME' }), { status: 400, headers: corsHeaders });
      }
      if (!VALID_BLOOD_GROUPS.has(raw.bloodGroup)) {
        return new Response(JSON.stringify({ error: 'সঠিক রক্তের গ্রুপ নির্বাচন করুন।', code: 'INVALID_BLOOD_GROUP' }), { status: 400, headers: corsHeaders });
      }
      const units = Number(raw.requiredUnits);
      if (!Number.isInteger(units) || units < 1 || units > 20) {
        return new Response(JSON.stringify({ error: 'রক্তের পরিমাণ ১ থেকে ২০ ব্যাগের মধ্যে হতে হবে।', code: 'INVALID_REQUIRED_UNITS' }), { status: 400, headers: corsHeaders });
      }
      if (!isValidDateString(raw.requiredDate)) {
        return new Response(JSON.stringify({ error: 'সঠিক তারিখ প্রদান করুন (YYYY-MM-DD)।', code: 'INVALID_REQUIRED_DATE' }), { status: 400, headers: corsHeaders });
      }
      if (!isSafeString(raw.hospital, 1, 150)) {
        return new Response(JSON.stringify({ error: 'হাসপাতালের নাম আবশ্যক (১-১৫০ অক্ষর)।', code: 'INVALID_HOSPITAL' }), { status: 400, headers: corsHeaders });
      }
      if (!isSafeString(raw.division, 1, 50) || !isSafeString(raw.district, 1, 50) || !isSafeString(raw.upazila, 1, 50) || !isSafeString(raw.area, 1, 100)) {
        return new Response(JSON.stringify({ error: 'ঠিকানা (বিভাগ, জেলা, উপজেলা, এলাকা) সঠিকভাবে পূরণ করুন।', code: 'INVALID_LOCATION' }), { status: 400, headers: corsHeaders });
      }
      if (!isSafeString(raw.contactPerson, 1, 100)) {
        return new Response(JSON.stringify({ error: 'যোগাযোগকারীর নাম আবশ্যক।', code: 'INVALID_CONTACT_PERSON' }), { status: 400, headers: corsHeaders });
      }
      const validPhone = normalizeBangladeshPhone(raw.contactNumber);
      if (!validPhone) {
        return new Response(JSON.stringify({ error: '১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নম্বর লিখুন।', code: 'INVALID_CONTACT_NUMBER' }), { status: 400, headers: corsHeaders });
      }
      if (!isSafeString(raw.relationship, 1, 50)) {
        return new Response(JSON.stringify({ error: 'রোগীর সাথে সম্পর্ক উল্লেখ করুন।', code: 'INVALID_RELATIONSHIP' }), { status: 400, headers: corsHeaders });
      }

      const emergencyLevel = VALID_EMERGENCY_LEVELS.has(raw.emergencyLevel) ? raw.emergencyLevel : 'NORMAL';
      const notes = isSafeString(raw.notes, 1, 500) ? raw.notes.trim() : null;

      // HARD PRIVILEGE BOUNDARIES:
      // Client CANNOT set status, isVerified, or privileged markers.
      const safeId = sanitizeEntityId(raw.id, 'req');
      const safeReqId = isSafeString(raw.requestId, 6, 30) ? raw.requestId.trim() : `REQ-${Date.now().toString().slice(-6)}`;
      const safeUserId = isSafeString(raw.userId, 1, 64) ? raw.userId.trim() : 'public-requester';

      const { data: insertedData, error: insertError } = await supabaseAdmin
        .from('blood_requests')
        .insert({
          id: safeId,
          request_id: safeReqId,
          user_id: safeUserId,
          patient_name: raw.patientName.trim(),
          blood_group: raw.bloodGroup,
          required_units: units,
          required_date: raw.requiredDate,
          required_time: isSafeString(raw.requiredTime, 1, 30) ? raw.requiredTime.trim() : 'সকাল ১০:০০',
          hospital: raw.hospital.trim(),
          division: raw.division.trim(),
          district: raw.district.trim(),
          upazila: raw.upazila.trim(),
          area: raw.area.trim(),
          contact_person: raw.contactPerson.trim(),
          contact_number: validPhone,
          relationship: raw.relationship.trim(),
          emergency_level: emergencyLevel,
          notes: notes,
          status: 'active',           // FORCED: client cannot set fulfilled/cancelled/expired
          is_verified: false,         // FORCED: client cannot self-verify
          organization_id: 'org-roktobondon',
          expires_at: new Date(Date.now() + 48 * 3600000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id, request_id, status')
        .single();

      if (insertError) {
        return new Response(
          JSON.stringify({ error: insertError.message, code: 'DATABASE_ERROR' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Blood request created successfully.', data: insertedData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. ACTION: register_camp
    if (body.action === 'register_camp') {
      if (!isSafeString(raw.campId, 2, 64)) {
        return new Response(JSON.stringify({ error: 'সঠিক ক্যাম্প আইডি আবশ্যক।', code: 'INVALID_CAMP_ID' }), { status: 400, headers: corsHeaders });
      }
      if (!isSafeString(raw.donorName, 1, 100)) {
        return new Response(JSON.stringify({ error: 'রক্তদাতার নাম আবশ্যক (১-১০০ অক্ষর)।', code: 'INVALID_DONOR_NAME' }), { status: 400, headers: corsHeaders });
      }
      const validPhone = normalizeBangladeshPhone(raw.phone);
      if (!validPhone) {
        return new Response(JSON.stringify({ error: '১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নম্বর লিখুন।', code: 'INVALID_PHONE' }), { status: 400, headers: corsHeaders });
      }
      if (!VALID_BLOOD_GROUPS.has(raw.bloodGroup)) {
        return new Response(JSON.stringify({ error: 'সঠিক রক্তের গ্রুপ নির্বাচন করুন।', code: 'INVALID_BLOOD_GROUP' }), { status: 400, headers: corsHeaders });
      }

      const safeId = sanitizeEntityId(raw.id, 'reg');
      const safeUserId = isSafeString(raw.userId, 1, 64) ? raw.userId.trim() : null;

      const { data: regData, error: regError } = await supabaseAdmin
        .from('camp_registrations')
        .insert({
          id: safeId,
          camp_id: raw.campId.trim(),
          donor_name: raw.donorName.trim(),
          phone: validPhone,
          blood_group: raw.bloodGroup,
          user_id: safeUserId,
          status: 'registered',      // FORCED: client cannot set completed/attended
          created_at: new Date().toISOString(),
        })
        .select('id, camp_id, status')
        .single();

      if (regError) {
        return new Response(
          JSON.stringify({ error: regError.message, code: 'DATABASE_ERROR' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Camp registration submitted.', data: regData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. ACTION: submit_fund_donation
    if (body.action === 'submit_fund_donation') {
      if (!isSafeString(raw.donorName, 1, 100)) {
        return new Response(JSON.stringify({ error: 'অনুদানকারীর নাম আবশ্যক (১-১০০ অক্ষর)।', code: 'INVALID_DONOR_NAME' }), { status: 400, headers: corsHeaders });
      }
      const validPhone = normalizeBangladeshPhone(raw.donorPhone);
      if (!validPhone) {
        return new Response(JSON.stringify({ error: '১১ ডিজিটের সঠিক বাংলাদেশী মোবাইল নম্বর লিখুন।', code: 'INVALID_PHONE' }), { status: 400, headers: corsHeaders });
      }

      // Financial Validation: Phase 1E constraint (10 BDT <= amount <= 1,000,000 BDT)
      const amount = Number(raw.amount);
      if (!Number.isFinite(amount) || Number.isNaN(amount) || amount < 10 || amount > 1000000) {
        return new Response(
          JSON.stringify({ error: 'অনুদানের পরিমাণ অবশ্যই ১০ টাকা থেকে ১০,০০,০০০ টাকার মধ্যে হতে হবে।', code: 'INVALID_AMOUNT' }),
          { status: 400, headers: corsHeaders }
        );
      }

      if (!VALID_PAYMENT_METHODS.has(raw.paymentMethod)) {
        return new Response(JSON.stringify({ error: 'সঠিক পেমেন্ট মেথড নির্বাচন করুন (bKash/Nagad/Rocket/Bank/Cash)।', code: 'INVALID_PAYMENT_METHOD' }), { status: 400, headers: corsHeaders });
      }

      if (!isSafeString(raw.transactionId, 4, 50)) {
        return new Response(JSON.stringify({ error: 'সঠিক লেনদেন/ট্রানজেকশন আইডি লিখুন (৪-৫০ অক্ষর)।', code: 'INVALID_TRANSACTION_ID' }), { status: 400, headers: corsHeaders });
      }

      const fundCause = VALID_FUND_CAUSES.has(raw.fundCause) ? raw.fundCause : 'general';
      const safeId = sanitizeEntityId(raw.id, 'fnd');
      const safeTxId = raw.transactionId.trim().toUpperCase();

      const { data: fndData, error: fndError } = await supabaseAdmin
        .from('fund_donations')
        .insert({
          id: safeId,
          donor_name: raw.donorName.trim(),
          donor_phone: validPhone,
          donor_email: isSafeString(raw.donorEmail, 3, 100) ? raw.donorEmail.trim() : null,
          amount: Math.round(amount * 100) / 100, // 2 decimal precision
          payment_method: raw.paymentMethod,
          transaction_id: safeTxId,
          account_number: isSafeString(raw.accountNumber, 3, 30) ? raw.accountNumber.trim() : null,
          fund_cause: fundCause,
          area: isSafeString(raw.area, 1, 100) ? raw.area.trim() : null,
          message: isSafeString(raw.message, 1, 500) ? raw.message.trim() : null,
          is_anonymous: Boolean(raw.isAnonymous),
          status: 'pending',        // FORCED: client cannot set approved/verified
          organization_id: 'org-roktobondon',
          created_at: new Date().toISOString(),
        })
        .select('id, amount, status')
        .single();

      if (fndError) {
        return new Response(
          JSON.stringify({ error: fndError.message, code: 'DATABASE_ERROR' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Fund donation proof submitted.', data: fndData }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Unhandled action execution.', code: 'UNHANDLED_ACTION' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal gateway error.', code: 'GATEWAY_EXCEPTION' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
