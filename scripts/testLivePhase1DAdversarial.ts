/**
 * 🧪 LIVE PRODUCTION PHASE 1D DONOR HARDENING, SUBMISSIONS & EXPIRATION TEST RUNNER
 *
 * Verifies live Supabase database RLS, triggers, RPCs, and lifecycle hardening:
 *
 * Actors:
 *   User A = Donor Owner (Legitimate Donor)
 *   User B = Attacker / Unrelated Authenticated User
 *   User Staff = Staff / Moderator User (or simulated staff)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

interface LiveTestResult {
  id: string;
  scenario: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const liveResults: LiveTestResult[] = [];

function recordLive(res: LiveTestResult) {
  liveResults.push(res);
  const icon = res.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${res.id}] ${res.scenario}`);
  console.log(`   ↳ Expected: ${res.expected}`);
  console.log(`   ↳ Actual:   ${res.actual}`);
  if (res.details) {
    console.log(`   ↳ Details:  ${res.details}`);
  }
}

async function runLivePhase1DSuite() {
  console.log('================================================================');
  console.log('🛡️ ROKTOBONDHON — LIVE PRODUCTION PHASE 1D OPERATIONAL & SECURITY AUDIT');
  console.log(`Target Supabase: ${SUPABASE_URL}`);
  console.log('================================================================\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ts = Date.now();
  const emailA = `p1d_dnr_a_${ts}@roktobondon.test`;
  const emailB = `p1d_att_b_${ts}@roktobondon.test`;
  const pass = `LiveAudit!${Math.random().toString(36).slice(2)}99#`;

  console.log('--- Step 1: Provisioning Ephemeral Test Users ---');
  const [resA, resB] = await Promise.all([
    anonClient.auth.signUp({ email: emailA, password: pass }),
    anonClient.auth.signUp({ email: emailB, password: pass }),
  ]);

  if (!resA.data.session || !resB.data.session) {
    console.error('❌ Failed to provision authenticated sessions on live Supabase.');
    process.exit(1);
  }

  const uidA = resA.data.user!.id;
  const uidB = resB.data.user!.id;

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resA.data.session.access_token}` } },
  });
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resB.data.session.access_token}` } },
  });

  console.log(`User A (Donor Owner): ${uidA}`);
  console.log(`User B (Attacker):    ${uidB}\n`);

  const createdSubIds: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Setup Donor Profile for User A
    // -------------------------------------------------------------------------
    console.log('--- Step 2: Registering Donor Profile for User A ---');
    const donorDocId = crypto.randomUUID();
    const donorIdHuman = `TEST-DNR-${ts.toString().slice(-4)}`;
    const { data: donorA, error: donorAErr } = await clientA
      .from('donors')
      .insert({
        id: donorDocId,
        donor_id: donorIdHuman,
        user_id: uidA,
        full_name: 'টেস্ট রক্তদাতা এ',
        blood_group: 'O+',
        division: 'Dhaka',
        district: 'ঢাকা',
        upazila: 'ধামরাই',
        area: 'ধামরাই সদর',
        phone: `017${ts.toString().slice(-8)}`,
        availability: true,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (donorAErr || !donorA) {
      console.error('❌ Failed to create donor profile for User A:', donorAErr);
      process.exit(1);
    }
    const donorUuidA = donorA.id;
    console.log(`Donor A Created: UUID=${donorUuidA}, HumanID=${donorIdHuman}\n`);

    // -------------------------------------------------------------------------
    // Test 1: Donor ID / Blood Group Immutability
    // -------------------------------------------------------------------------
    console.log('--- Test Suite 1: Donor Field Protection Trigger ---');
    {
      const { error } = await clientA
        .from('donors')
        .update({ blood_group: 'AB-' })
        .eq('id', donorUuidA);

      recordLive({
        id: 'LIVE-P1D-01',
        scenario: 'Donor Owner attempts to mutate blood_group directly',
        expected: 'DENIED by protect_donor_fields trigger',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error && error.message.includes('immutable') ? 'PASS' : 'FAIL',
        details: error?.message || 'Update succeeded unexpectedly',
      });
    }

    {
      const { error } = await clientA
        .from('donors')
        .update({ donor_id: `${donorIdHuman}-MODIFIED` })
        .eq('id', donorUuidA);

      recordLive({
        id: 'LIVE-P1D-02',
        scenario: 'Donor Owner attempts to mutate donor_id directly',
        expected: 'DENIED by protect_donor_fields trigger',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error && error.message.includes('immutable') ? 'PASS' : 'FAIL',
        details: error?.message || 'Update succeeded unexpectedly',
      });
    }

    {
      const { error } = await clientA
        .from('donors')
        .update({ verification_status: 'verified' })
        .eq('id', donorUuidA);

      recordLive({
        id: 'LIVE-P1D-03',
        scenario: 'Donor Owner attempts to self-verify by mutating verification_status directly',
        expected: 'DENIED by protect_donor_fields trigger',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error && (error.message.includes('verification_status') || error.message.includes('Unauthorized')) ? 'PASS' : 'FAIL',
        details: error?.message || 'Self-verification succeeded unexpectedly',
      });
    }

    {
      const { error } = await clientA
        .from('donors')
        .update({ total_donations: 99, last_donation_date: '2026-09-14' })
        .eq('id', donorUuidA);

      recordLive({
        id: 'LIVE-P1D-04',
        scenario: 'Donor Owner attempts to forge total_donations metric directly',
        expected: 'DENIED by protect_donor_fields trigger',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error && (error.message.includes('donor metrics') || error.message.includes('metrics') || error.message.includes('total_donations') || error.message.includes('forbidden')) ? 'PASS' : 'FAIL',
        details: error?.message || 'Metric forgery succeeded unexpectedly',
      });
    }

    // -------------------------------------------------------------------------
    // Test 2: Donation Submission Ownership & RLS
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 2: Donation Submissions RLS & Trigger ---');

    {
      // Attacker B attempts to submit donation report for Donor A
      const subAttackerId = crypto.randomUUID();
      createdSubIds.push(subAttackerId);
      const { error } = await clientB
        .from('donation_submissions')
        .insert({
          id: subAttackerId,
          donor_id: donorUuidA,
          donor_user_id: uidB,
          donor_name: 'Attacker Impersonation',
          blood_group: 'O+',
          donation_date: '2026-08-01',
          hospital: 'ধামরাই হাসপাতাল',
          units: 1,
          donation_type: 'Whole Blood',
        });

      recordLive({
        id: 'LIVE-P1D-05',
        scenario: 'Attacker B attempts to submit donation report for Donor A profile',
        expected: 'DENIED by verify_donation_submission_ownership trigger or RLS',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error ? 'PASS' : 'FAIL',
        details: error?.message || 'Cross-donor submission accepted',
      });
    }

    let submissionIdA: string = '';
    {
      // Legitimate Owner A submits donation report
      const subDocId = crypto.randomUUID();
      createdSubIds.push(subDocId);
      const { data: subData, error } = await clientA
        .from('donation_submissions')
        .insert({
          id: subDocId,
          donor_id: donorUuidA,
          donor_user_id: uidA,
          donor_name: 'টেস্ট রক্তদাতা এ',
          blood_group: 'O+',
          donation_date: '2026-08-01',
          hospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
          units: 1,
          donation_type: 'Whole Blood',
        })
        .select()
        .single();

      submissionIdA = subData?.id || '';
      recordLive({
        id: 'LIVE-P1D-06',
        scenario: 'Legitimate Donor A submits offline donation report for own profile',
        expected: 'ALLOWED (status: pending)',
        actual: error ? `DENIED: ${error.message}` : `ALLOWED (id: ${submissionIdA})`,
        status: !error && subData?.status === 'pending' ? 'PASS' : 'FAIL',
        details: error?.message || `Created submission ${submissionIdA}`,
      });
    }

    {
      // Duplicate same-date submission for Donor A
      const subDupId = crypto.randomUUID();
      createdSubIds.push(subDupId);
      const { error } = await clientA
        .from('donation_submissions')
        .insert({
          id: subDupId,
          donor_id: donorUuidA,
          donor_user_id: uidA,
          donor_name: 'টেস্ট রক্তদাতা এ',
          blood_group: 'O+',
          donation_date: '2026-08-01',
          hospital: 'ধামরাই হাসপাতাল ২',
          units: 1,
          donation_type: 'Whole Blood',
        });

      recordLive({
        id: 'LIVE-P1D-07',
        scenario: 'Donor A submits duplicate submission on the exact same date (2026-08-01)',
        expected: 'DENIED by unique constraint on active submissions',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error ? 'PASS' : 'FAIL',
        details: error?.message || 'Duplicate submission allowed',
      });
    }

    {
      // Attacker B attempts to read Donor A's private donation submissions
      const { data, error } = await clientB
        .from('donation_submissions')
        .select('*')
        .eq('id', submissionIdA);

      const canRead = data && data.length > 0;
      recordLive({
        id: 'LIVE-P1D-08',
        scenario: 'Attacker B attempts to query Donor A private donation submission',
        expected: 'DENIED / 0 rows returned by RLS',
        actual: canRead ? 'DATA LEAKED' : 'BLOCKED (0 rows)',
        status: !canRead ? 'PASS' : 'FAIL',
        details: canRead ? `Leaked: ${JSON.stringify(data)}` : 'Secure',
      });
    }

    // -------------------------------------------------------------------------
    // Test 3: Review & Verification RPCs Security Gate
    // -------------------------------------------------------------------------
    console.log('\n--- Test Suite 3: RPC Security Gates & Maintenance Revocations ---');
    {
      // Attacker B attempts to review Donor A's submission
      const { data, error } = await clientB.rpc('review_donation_submission', {
        p_submission_id: submissionIdA,
        p_status: 'approved',
        p_review_notes: 'Attacker approval',
      });

      recordLive({
        id: 'LIVE-P1D-09',
        scenario: 'Non-staff Attacker B attempts to execute review_donation_submission',
        expected: 'DENIED (Unauthorized)',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error && (error.message.includes('Unauthorized') || error.message.includes('staff')) ? 'PASS' : 'FAIL',
        details: error?.message || 'Non-staff approved submission',
      });
    }

    {
      // Attacker B attempts to call verify_donor_profile
      const { data, error } = await clientB.rpc('verify_donor_profile', {
        p_donor_id: donorUuidA,
        p_new_status: 'verified',
      });

      recordLive({
        id: 'LIVE-P1D-10',
        scenario: 'Non-staff Attacker B attempts to execute verify_donor_profile',
        expected: 'DENIED (Unauthorized)',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error && (error.message.includes('Unauthorized') || error.message.includes('staff')) ? 'PASS' : 'FAIL',
        details: error?.message || 'Non-staff verified donor profile',
      });
    }

    {
      // Public / Authenticated caller attempts to execute expire_overdue_blood_requests
      const { data, error } = await clientA.rpc('expire_overdue_blood_requests', {
        p_batch_limit: 10,
      });

      recordLive({
        id: 'LIVE-P1D-11',
        scenario: 'Authenticated client executes expire_overdue_blood_requests',
        expected: 'DENIED (Permission Denied / Revoked)',
        actual: error ? `DENIED: ${error.message}` : 'ALLOWED (VULNERABILITY)',
        status: error && (error.message.includes('permission denied') || error.message.includes('function') || error.message.includes('does not exist')) ? 'PASS' : 'FAIL',
        details: error?.message || 'Maintenance RPC executable by authenticated clients',
      });
    }

  } finally {
    // -------------------------------------------------------------------------
    // Cleanup Ephemeral Test Users
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Cleaning Up Ephemeral Data ---');
    try {
      if (createdSubIds && createdSubIds.length > 0) {
        await clientA.from('donation_submissions').delete().in('id', createdSubIds);
        await clientB.from('donation_submissions').delete().in('id', createdSubIds);
      }
      await clientA.from('donation_submissions').delete().eq('donor_user_id', uidA);
      await clientB.from('donation_submissions').delete().eq('donor_user_id', uidB);
      await clientA.from('donors').delete().eq('user_id', uidA);
      await clientB.from('donors').delete().eq('user_id', uidB);
    } catch (e) {
      console.warn('Cleanup warning:', e);
    }
  }

  console.log('\n================================================================');
  const passCount = liveResults.filter((r) => r.status === 'PASS').length;
  const totalCount = liveResults.length;
  console.log(`LIVE AUDIT RESULTS: ${passCount}/${totalCount} PASSED`);
  console.log('================================================================');

  if (passCount !== totalCount) {
    console.error('❌ Live Adversarial Security Audit Failed!');
    process.exit(1);
  } else {
    console.log('✅ Live Adversarial Security Audit Passed Successfully!');
  }
}

runLivePhase1DSuite().catch((err) => {
  console.error('Fatal error running live audit suite:', err);
  process.exit(1);
});
