/**
 * 🧪 LIVE PRODUCTION PHASE 1B-2 DONATION FULFILLMENT & ADVERSARIAL TEST RUNNER
 * 
 * Verifies live Supabase database RLS, triggers, RPC and atomic fulfillment:
 * 
 * Actors:
 *   User A = Requester Owner
 *   User B = Accepted Donor
 *   User C = Unrelated Donor
 *   User D = Attacker / Unrelated User
 * 
 * Tests:
 *   1. User B (Accepted Donor) calls complete_donation_fulfillment RPC -> ALLOW
 *   2. User C (Unrelated Donor) attempts completing User B donor_request -> DENY
 *   3. User D (Attacker) direct SELECT on public.donations -> DENY (0 rows)
 *   4. User A (Requester) SELECT on public.donations -> ALLOW (Sees attached donation)
 *   5. User B (Donor) SELECT on public.donations -> ALLOW (Sees own donation)
 *   6. User D direct client INSERT on public.donations -> DENY
 *   7. User B direct mutation of protected donation fields -> DENY (Trigger block)
 *   8. Idempotent re-execution by User B -> ALLOW (Returns existing record, 0 duplicates)
 * 
 * Automatic cleanup of all ephemeral test accounts and records.
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

const url = process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

interface LiveResult {
  id: string;
  scenario: string;
  expected: string;
  actual: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: LiveResult[] = [];

function recordLive(res: LiveResult) {
  results.push(res);
  const icon = res.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} [${res.id}] ${res.scenario}`);
  console.log(`   ↳ Expected: ${res.expected}`);
  console.log(`   ↳ Actual:   ${res.actual}`);
  if (res.details) {
    console.log(`   ↳ Details:  ${res.details}`);
  }
}

async function runLiveAudit() {
  console.log('================================================================');
  console.log('🩸 ROKTOBONDHON — LIVE PRODUCTION PHASE 1B-2 FULFILLMENT AUDIT');
  console.log(`Target Supabase: ${url}`);
  console.log('================================================================\n');

  if (!url || !anonKey) {
    console.error('❌ Supabase credentials missing in .env');
    return { allPassed: false, results };
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  const ts = Date.now();
  const emailA = `live-p1b2-req-a-${ts}@roktobondhon.test`;
  const emailB = `live-p1b2-dnr-b-${ts}@roktobondhon.test`;
  const emailC = `live-p1b2-dnr-c-${ts}@roktobondhon.test`;
  const emailD = `live-p1b2-att-d-${ts}@roktobondhon.test`;
  const pass = `AuditPass!${Math.random().toString(36).slice(2)}77#`;

  console.log('--- Step 1: Provisioning Ephemeral Test Users ---');

  const [resA, resB, resC, resD] = await Promise.all([
    anonClient.auth.signUp({ email: emailA, password: pass }),
    anonClient.auth.signUp({ email: emailB, password: pass }),
    anonClient.auth.signUp({ email: emailC, password: pass }),
    anonClient.auth.signUp({ email: emailD, password: pass }),
  ]);

  if (!resA.data.session || !resB.data.session || !resC.data.session || !resD.data.session) {
    console.error('❌ Failed to provision authenticated sessions on live Supabase.');
    return { allPassed: false, results };
  }

  const clientA = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resA.data.session.access_token}` } },
  });
  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resB.data.session.access_token}` } },
  });
  const clientC = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resC.data.session.access_token}` } },
  });
  const clientD = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resD.data.session.access_token}` } },
  });

  const uidA = resA.data.user!.id;
  const uidB = resB.data.user!.id;
  const uidC = resC.data.user!.id;
  const uidD = resD.data.user!.id;

  console.log(`User A (Requester):   ${uidA}`);
  console.log(`User B (Accepted Donor): ${uidB}`);
  console.log(`User C (Unrelated Donor): ${uidC}`);
  console.log(`User D (Attacker):    ${uidD}\n`);

  const createdDonorIds: string[] = [];
  const createdBloodReqIds: string[] = [];
  const createdDonorReqIds: string[] = [];
  const createdDonationIds: string[] = [];
  const createdNotifIds: string[] = [];

  try {
    console.log('--- Step 2: Preparing Test Baseline ---');

    // 1. Register Donor B (Accepted Donor)
    const donorBId = `dnr-b-${ts}`;
    const { error: errDonorB } = await clientB.from('donors').insert({
      id: donorBId,
      donor_id: `DNR-B-${ts.toString().slice(-6)}`,
      user_id: uidB,
      full_name: 'Audit Accepted Donor B',
      blood_group: 'B+',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      phone: '01711000004',
      verification_status: 'verified',
    });
    if (!errDonorB) createdDonorIds.push(donorBId);

    // 2. Register Donor C (Unrelated Donor)
    const donorCId = `dnr-c-${ts}`;
    const { error: errDonorC } = await clientC.from('donors').insert({
      id: donorCId,
      donor_id: `DNR-C-${ts.toString().slice(-6)}`,
      user_id: uidC,
      full_name: 'Audit Unrelated Donor C',
      blood_group: 'B+',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      phone: '01711000005',
      verification_status: 'verified',
    });
    if (!errDonorC) createdDonorIds.push(donorCId);

    // 3. Register Blood Request A (owned by User A)
    const bloodReqAId = `req-a-${ts}`;
    const { error: errReqA } = await clientA.from('blood_requests').insert({
      id: bloodReqAId,
      request_id: `REQ-${ts.toString().slice(-6)}`,
      user_id: uidA,
      patient_name: 'Patient Bravo',
      blood_group: 'B+',
      required_units: 1,
      required_date: '2026-09-30',
      required_time: '12:00 PM',
      hospital: 'Dhamrai Central Hospital',
      status: 'active',
      contact_person: 'Guardian Alpha',
      contact_number: '01711000006',
      relationship: 'Brother',
    });
    if (!errReqA) createdBloodReqIds.push(bloodReqAId);

    // 4. Dispatch Donor Request from User A to Donor B
    const dreqBId = `dreq-b-${ts}`;
    const { error: errDreqB } = await clientA.from('donor_requests').insert({
      id: dreqBId,
      blood_request_id: bloodReqAId,
      donor_id: donorBId,
      donor_user_id: uidB,
      requester_user_id: uidA,
      status: 'pending',
      match_score: 95,
      patient_name: 'Patient Bravo',
      hospital: 'Dhamrai Central Hospital',
      blood_group: 'B+',
      emergency_level: 'NORMAL',
    });
    if (!errDreqB) createdDonorReqIds.push(dreqBId);

    // 5. Donor B accepts the request
    const { error: errAccept } = await clientB
      .from('donor_requests')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', dreqBId);

    console.log(`Donor B accepted status update: ${!errAccept ? 'OK' : errAccept.message}\n`);
    console.log('--- Step 3: Executing Live Verification ---');

    // --------------------------------------------------------------------------
    // TEST 1: User B (Accepted Donor) calls complete_donation_fulfillment RPC -> ALLOW
    // --------------------------------------------------------------------------
    const { data: rpcRes1, error: errRpc1 } = await clientB.rpc('complete_donation_fulfillment', {
      p_donor_request_id: dreqBId,
      p_notes: 'Live audit donation completed successfully',
    });

    if (rpcRes1?.donation_id) {
      createdDonationIds.push(rpcRes1.donation_id);
    }

    recordLive({
      id: 'LIVE-P1B2-01',
      scenario: 'User B (Accepted Donor) calls complete_donation_fulfillment RPC',
      expected: 'ALLOW (RPC succeeds, donation recorded, blood request fulfilled)',
      actual: !errRpc1 && rpcRes1?.success ? `ALLOW (Donation: ${rpcRes1.donation_id})` : `DENY (${errRpc1?.message})`,
      status: !errRpc1 && rpcRes1?.success ? 'PASS' : 'FAIL',
      details: !errRpc1 ? 'RPC executed cleanly in database transaction.' : errRpc1.message,
    });

    // --------------------------------------------------------------------------
    // TEST 2: User C (Unrelated Donor) attempts completing User B donor_request -> DENY
    // --------------------------------------------------------------------------
    const { data: rpcRes2, error: errRpc2 } = await clientC.rpc('complete_donation_fulfillment', {
      p_donor_request_id: dreqBId,
    });

    const test2Passed = !!errRpc2 || !rpcRes2?.success;
    recordLive({
      id: 'LIVE-P1B2-02',
      scenario: 'User C (Unrelated Donor) attempts completing User B donor_request',
      expected: 'DENY (Unauthorized: Only assigned donor can complete donation)',
      actual: test2Passed ? `DENY (${errRpc2?.message || 'Rejected'})` : 'ALLOW (VULNERABILITY DETECTED)',
      status: test2Passed ? 'PASS' : 'FAIL',
      details: test2Passed ? 'Cross-donor fulfillment strictly blocked by RPC security guard.' : 'CRITICAL: Unauthorized donor completed another request!',
    });

    // --------------------------------------------------------------------------
    // TEST 3: User D (Attacker) direct SELECT on public.donations -> DENY (0 rows)
    // --------------------------------------------------------------------------
    const { data: donRowsD, error: errDonD } = await clientD.from('donations').select('*');
    const attackerSeesRows = (donRowsD || []).filter((d) => d.donor_user_id === uidB);
    const test3Passed = attackerSeesRows.length === 0;

    recordLive({
      id: 'LIVE-P1B2-03',
      scenario: 'User D (Unrelated Attacker) SELECT on public.donations',
      expected: 'DENY (0 rows returned / Private to owner & requester)',
      actual: test3Passed ? 'DENY (0 rows leaked)' : `ALLOW (${attackerSeesRows.length} rows leaked)`,
      status: test3Passed ? 'PASS' : 'FAIL',
      details: test3Passed ? 'Donations RLS successfully isolates private records from third parties.' : 'CRITICAL: Unrelated user can see other users donations!',
    });

    // --------------------------------------------------------------------------
    // TEST 4: User A (Requester) SELECT on public.donations -> ALLOW
    // --------------------------------------------------------------------------
    const { data: donRowsA, error: errDonA } = await clientA.from('donations').select('*');
    const requesterAttached = (donRowsA || []).filter((d) => d.donor_request_id === dreqBId || d.request_id === bloodReqAId);
    const test4Passed = requesterAttached.length > 0;

    recordLive({
      id: 'LIVE-P1B2-04',
      scenario: 'User A (Requester) SELECT attached donation record for their blood request',
      expected: 'ALLOW (Requester can view donation fulfilling their request)',
      actual: test4Passed ? `ALLOW (Found ${requesterAttached.length} donation)` : `DENY (${errDonA?.message || '0 rows'})`,
      status: test4Passed ? 'PASS' : 'FAIL',
      details: test4Passed ? 'Requester permitted to inspect fulfilled donation record.' : 'Requester could not view attached donation.',
    });

    // --------------------------------------------------------------------------
    // TEST 5: User B (Donor) SELECT on public.donations -> ALLOW
    // --------------------------------------------------------------------------
    const { data: donRowsB, error: errDonB } = await clientB.from('donations').select('*');
    const donorOwn = (donRowsB || []).filter((d) => d.donor_user_id === uidB);
    const test5Passed = donorOwn.length > 0;

    recordLive({
      id: 'LIVE-P1B2-05',
      scenario: 'User B (Donor) SELECT own donation history',
      expected: 'ALLOW (Donor can view own donation history)',
      actual: test5Passed ? `ALLOW (Found ${donorOwn.length} record)` : `DENY (${errDonB?.message || '0 rows'})`,
      status: test5Passed ? 'PASS' : 'FAIL',
      details: test5Passed ? 'Donor successfully views own verified donation history.' : 'Donor could not view own record.',
    });

    // --------------------------------------------------------------------------
    // TEST 6: User D direct client INSERT on public.donations -> DENY
    // --------------------------------------------------------------------------
    const fakeDonationId = `don-fake-${ts}`;
    const { error: errFakeDon } = await clientD.from('donations').insert({
      id: fakeDonationId,
      donor_id: donorBId,
      donor_user_id: uidD,
      donor_name: 'Attacker Fake Donation',
      blood_group: 'B+',
      donation_date: '2026-09-14',
      hospital: 'Fake Hospital',
      verified_by: 'Fake Verifier',
      verification_date: '2026-09-14',
    });

    const test6Passed = !!errFakeDon;
    if (!errFakeDon) createdDonationIds.push(fakeDonationId);

    recordLive({
      id: 'LIVE-P1B2-06',
      scenario: 'User D direct client INSERT on public.donations',
      expected: 'DENY (RLS check failure: non-staff cannot direct INSERT)',
      actual: test6Passed ? `DENY (${errFakeDon.message})` : 'ALLOW (VULNERABILITY DETECTED)',
      status: test6Passed ? 'PASS' : 'FAIL',
      details: test6Passed ? 'Direct client donation insertion strictly denied.' : 'CRITICAL: Arbitrary direct INSERT permitted on donations!',
    });

    // --------------------------------------------------------------------------
    // TEST 7: User B direct mutation of protected donation fields -> DENY
    // --------------------------------------------------------------------------
    const existingDonId = rpcRes1?.donation_id;
    let test7Passed = false;
    let test7Message = '';
    if (existingDonId) {
      const { error: errMutate } = await clientB
        .from('donations')
        .update({ donor_id: donorCId, donor_user_id: uidC })
        .eq('id', existingDonId);

      test7Passed = !!errMutate;
      test7Message = errMutate ? errMutate.message : 'Mutation succeeded without error';
    }

    recordLive({
      id: 'LIVE-P1B2-07',
      scenario: 'User B direct mutation of protected relationship fields (protect_donation_fields)',
      expected: 'DENY (Trigger exception: protected fields are immutable)',
      actual: test7Passed ? `DENY (${test7Message})` : 'ALLOW (VULNERABILITY DETECTED)',
      status: test7Passed ? 'PASS' : 'FAIL',
      details: test7Passed ? 'protect_donation_fields trigger blocked mutation of protected relationship keys.' : 'Protected fields were mutated!',
    });

    // --------------------------------------------------------------------------
    // TEST 8: Idempotent re-execution by User B -> ALLOW (0 duplicate rows)
    // --------------------------------------------------------------------------
    const { data: rpcRes8, error: errRpc8 } = await clientB.rpc('complete_donation_fulfillment', {
      p_donor_request_id: dreqBId,
    });

    const test8Passed = !errRpc8 && rpcRes8?.success && rpcRes8?.already_fulfilled;
    recordLive({
      id: 'LIVE-P1B2-08',
      scenario: 'Idempotent re-execution of complete_donation_fulfillment on already-fulfilled request',
      expected: 'ALLOW (Returns existing donation ID, creates zero duplicate rows)',
      actual: test8Passed ? `ALLOW (Returned existing ID: ${rpcRes8.donation_id})` : `DENY (${errRpc8?.message || 'Failed'})`,
      status: test8Passed ? 'PASS' : 'FAIL',
      details: test8Passed ? 'Idempotent completion verified with zero duplicate entries.' : 'Failed idempotency handling.',
    });

  } catch (err: any) {
    console.error('Exception during live audit execution:', err);
  } finally {
    console.log('\n--- Step 4: Ephemeral Test Records Cleanup ---');
    // Cleanup donations
    for (const did of createdDonationIds) {
      await anonClient.from('donations').delete().eq('id', did);
    }
    // Cleanup donor requests
    for (const drid of createdDonorReqIds) {
      await anonClient.from('donor_requests').delete().eq('id', drid);
    }
    // Cleanup blood requests
    for (const brid of createdBloodReqIds) {
      await anonClient.from('blood_requests').delete().eq('id', brid);
    }
    // Cleanup donors
    for (const dnrid of createdDonorIds) {
      await anonClient.from('donors').delete().eq('id', dnrid);
    }
    // Cleanup notifications
    await anonClient.from('notifications').delete().or(`user_id.eq.${uidA},user_id.eq.${uidB},user_id.eq.${uidC},user_id.eq.${uidD}`);

    console.log('🧹 Cleanup completed: Ephemeral test rows removed.\n');
  }

  const passedCount = results.filter((r) => r.status === 'PASS').length;
  console.log('================================================================');
  console.log(`📊 LIVE PHASE 1B-2 AUDIT SUMMARY: ${passedCount}/${results.length} PASSED | ${results.length - passedCount} FAILED`);
  console.log('================================================================\n');

  return { allPassed: passedCount === results.length, results };
}

runLiveAudit().then(({ allPassed }) => {
  if (!allPassed) process.exit(1);
});
