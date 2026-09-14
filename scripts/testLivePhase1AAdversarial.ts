/**
 * 🧪 LIVE PRODUCTION ADVERSARIAL AUTHORIZATION TEST SUITE
 * 
 * Verifies live Supabase database RLS & trigger enforcement:
 * 
 * Actors:
 *   User A = blood request owner (requester)
 *   User B = different authenticated user (attacker)
 *   User C = target donor
 *   User D = different donor (attacker)
 * 
 * Tests:
 *   1. A creates donor request against A's own blood request → ALLOW
 *   2. B attempts donor request using A's blood_request_id while claiming requester_user_id=B → DENY
 *   3. B calls with requester_user_id=A (spoofing) → DENY
 *   4. C responds to donor request assigned to C → ALLOW
 *   5. D attempts to respond to C's donor request → DENY / 0 rows
 *   6. C attempts to modify protected fields:
 *      (blood_request_id, donor_id, donor_user_id, requester_user_id, match_score, patient_name, hospital)
 *      → DENY / Trigger exception
 *   7. C makes legitimate response status changes (accepted, maybe, declined) → ALLOW
 *   8. Invalid status rejection → DENY
 * 
 * Includes automatic cleanup of all ephemeral test records.
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

export async function runLivePhase1AAdversarial() {
  console.log('================================================================');
  console.log('🛡️ ROKTOBONDHON — LIVE PRODUCTION ADVERSARIAL SECURITY AUDIT');
  console.log(`Target Supabase: ${url}`);
  console.log('================================================================\n');

  if (!url || !anonKey) {
    console.error('❌ Supabase URL or Anon Key missing in environment.');
    return { allPassed: false, liveResults };
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  const ts = Date.now();
  const emailA = `live-audit-req-a-${ts}@roktobondhon.test`;
  const emailB = `live-audit-att-b-${ts}@roktobondhon.test`;
  const emailC = `live-audit-dnr-c-${ts}@roktobondhon.test`;
  const emailD = `live-audit-dnr-d-${ts}@roktobondhon.test`;
  const pass = `AuditPass!${Math.random().toString(36).slice(2)}99#`;

  console.log('--- Step 1: Provisioning Fresh Ephemeral Auth Accounts ---');

  const [resA, resB, resC, resD] = await Promise.all([
    anonClient.auth.signUp({ email: emailA, password: pass }),
    anonClient.auth.signUp({ email: emailB, password: pass }),
    anonClient.auth.signUp({ email: emailC, password: pass }),
    anonClient.auth.signUp({ email: emailD, password: pass }),
  ]);

  if (!resA.data.session || !resB.data.session || !resC.data.session || !resD.data.session) {
    console.error('❌ Failed to provision authenticated sessions on live Supabase.');
    return { allPassed: false, liveResults };
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

  console.log(`User A (Requester Owner): ${uidA}`);
  console.log(`User B (Attacker):         ${uidB}`);
  console.log(`User C (Target Donor):     ${uidC}`);
  console.log(`User D (Cross Donor):      ${uidD}\n`);

  const createdDonorIds: string[] = [];
  const createdBloodReqIds: string[] = [];
  const createdDonorReqIds: string[] = [];

  try {
    console.log('--- Step 2: Preparing Test Baseline Records ---');
    // Register Donor C
    const donorCId = `dnr-c-${ts}`;
    const { error: errDonorC } = await clientC.from('donors').insert({
      id: donorCId,
      donor_id: `DNR-${ts.toString().slice(-6)}`,
      user_id: uidC,
      full_name: 'Audit Target Donor C',
      blood_group: 'A+',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      phone: '01711000003',
      verification_status: 'verified',
    });
    if (!errDonorC) createdDonorIds.push(donorCId);

    // Register Blood Request A (owned by User A)
    const bloodReqAId = `req-a-${ts}`;
    const { error: errReqA } = await clientA.from('blood_requests').insert({
      id: bloodReqAId,
      request_id: `REQ-${ts.toString().slice(-6)}`,
      user_id: uidA,
      patient_name: 'Patient Alpha',
      blood_group: 'A+',
      required_units: 1,
      required_date: '2026-09-30',
      required_time: '11:00 AM',
      hospital: 'Dhamrai Central Hospital',
      status: 'active',
      contact_person: 'Contact Alpha',
      contact_number: '01711000001',
      relationship: 'Self',
    });
    if (!errReqA) createdBloodReqIds.push(bloodReqAId);

    console.log('--- Step 3: Executing Live Adversarial Tests ---\n');

    // --------------------------------------------------------------------------
    // TEST 1: User A creates donor request against A's own blood request → ALLOW
    // --------------------------------------------------------------------------
    const dreq1Id = `dreq-1-${ts}`;
    const { data: d1, error: err1 } = await clientA.from('donor_requests').insert({
      id: dreq1Id,
      blood_request_id: bloodReqAId,
      donor_id: donorCId,
      donor_user_id: uidC,
      requester_user_id: uidA,
      status: 'pending',
      match_score: 95,
      patient_name: 'Patient Alpha',
      hospital: 'Dhamrai Central Hospital',
      blood_group: 'A+',
      emergency_level: 'URGENT',
    }).select();

    if (!err1) createdDonorReqIds.push(dreq1Id);

    recordLive({
      id: 'LIVE-01',
      scenario: 'User A creates donor request for own blood request',
      expected: 'ALLOW (Insert succeeds)',
      actual: err1 ? `DENIED (${err1.message})` : 'ALLOW (Success)',
      status: !err1 ? 'PASS' : 'FAIL',
      details: err1 ? err1.message : 'Legitimate owner successfully dispatched donor contact request.',
    });

    // --------------------------------------------------------------------------
    // TEST 2: User B attempts donor request using A's blood_request_id with requester_user_id=B → DENY
    // --------------------------------------------------------------------------
    const dreq2Id = `dreq-2-${ts}`;
    const { data: d2, error: err2 } = await clientB.from('donor_requests').insert({
      id: dreq2Id,
      blood_request_id: bloodReqAId,
      donor_id: donorCId,
      donor_user_id: uidC,
      requester_user_id: uidB,
      status: 'pending',
      match_score: 90,
      patient_name: 'Injected Alpha',
      hospital: 'Fake Hospital',
      blood_group: 'A+',
      emergency_level: 'URGENT',
    }).select();

    if (!err2 && d2 && d2.length > 0) createdDonorReqIds.push(dreq2Id);

    const test2Passed = !!err2 || (!d2 || d2.length === 0);
    recordLive({
      id: 'LIVE-02',
      scenario: 'User B creates donor request referencing User A blood request (Cross-Owner Injection)',
      expected: 'DENY (0 rows inserted / RLS violation)',
      actual: err2 ? `DENY (${err2.message})` : (!d2 || d2.length === 0 ? 'DENY (0 rows)' : 'ALLOW (VULNERABILITY DETECTED)'),
      status: test2Passed ? 'PASS' : 'FAIL',
      details: test2Passed ? 'Non-owner User B prevented from attaching request to User A blood request.' : 'CRITICAL VULNERABILITY: Cross-owner injection permitted!',
    });

    // --------------------------------------------------------------------------
    // TEST 3: User B attempts donor request spoofing requester_user_id = uidA → DENY
    // --------------------------------------------------------------------------
    const dreq3Id = `dreq-3-${ts}`;
    const { data: d3, error: err3 } = await clientB.from('donor_requests').insert({
      id: dreq3Id,
      blood_request_id: bloodReqAId,
      donor_id: donorCId,
      donor_user_id: uidC,
      requester_user_id: uidA, // Spoofed requester identity
      status: 'pending',
      match_score: 90,
      patient_name: 'Patient Alpha',
      hospital: 'Dhamrai Central Hospital',
      blood_group: 'A+',
      emergency_level: 'URGENT',
    }).select();

    if (!err3 && d3 && d3.length > 0) createdDonorReqIds.push(dreq3Id);

    const test3Passed = !!err3 || (!d3 || d3.length === 0);
    recordLive({
      id: 'LIVE-03',
      scenario: 'User B attempts requester identity spoofing (requester_user_id = User A)',
      expected: 'DENY (RLS check failure)',
      actual: err3 ? `DENY (${err3.message})` : (!d3 || d3.length === 0 ? 'DENY (0 rows)' : 'ALLOW (VULNERABILITY DETECTED)'),
      status: test3Passed ? 'PASS' : 'FAIL',
      details: test3Passed ? 'User B cannot impersonate User A as requester.' : 'CRITICAL VULNERABILITY: Identity spoofing succeeded!',
    });

    // --------------------------------------------------------------------------
    // TEST 4: User C responds to donor request assigned to C → ALLOW
    // --------------------------------------------------------------------------
    const { data: d4, error: err4 } = await clientC.from('donor_requests')
      .update({ status: 'accepted' })
      .eq('id', dreq1Id)
      .select();

    const test4Passed = !err4 && (d4 && d4.length > 0 && d4[0].status === 'accepted');
    recordLive({
      id: 'LIVE-04',
      scenario: 'Target Donor C responds to own donor request',
      expected: 'ALLOW (Status updated to accepted)',
      actual: test4Passed ? 'ALLOW (accepted)' : (err4 ? `DENY (${err4.message})` : '0 rows updated'),
      status: test4Passed ? 'PASS' : 'FAIL',
      details: test4Passed ? 'Target donor successfully responded to legitimate request.' : (err4?.message || 'Update failed.'),
    });

    // --------------------------------------------------------------------------
    // TEST 5: User D attempts to respond to User C donor request → DENY / 0 rows
    // --------------------------------------------------------------------------
    const { data: d5, error: err5 } = await clientD.from('donor_requests')
      .update({ status: 'declined' })
      .eq('id', dreq1Id)
      .select();

    const test5Passed = (err5 !== null) || (!d5 || d5.length === 0);
    recordLive({
      id: 'LIVE-05',
      scenario: 'Cross-donor User D attempts to modify User C donor request',
      expected: 'DENY (0 rows modified / RLS block)',
      actual: test5Passed ? 'DENY (0 rows modified)' : 'ALLOW (VULNERABILITY DETECTED)',
      status: test5Passed ? 'PASS' : 'FAIL',
      details: test5Passed ? 'Cross-donor modification completely isolated and rejected.' : 'CRITICAL VULNERABILITY: User D modified User C request!',
    });

    // --------------------------------------------------------------------------
    // TEST 6: User C attempts to modify protected fields → DENY / Trigger exception
    // (blood_request_id, donor_id, donor_user_id, requester_user_id, match_score, patient_name, hospital)
    // --------------------------------------------------------------------------
    const { data: d6, error: err6 } = await clientC.from('donor_requests')
      .update({
        match_score: 10,
        hospital: 'Tampered Hospital Name',
        patient_name: 'Hacked Patient',
      })
      .eq('id', dreq1Id)
      .select();

    const test6Passed = !!err6 && err6.message.includes('Unauthorized: Modification of protected request fields is forbidden.');
    recordLive({
      id: 'LIVE-06',
      scenario: 'Donor C attempts to mutate protected fields (match_score, hospital, patient_name)',
      expected: 'DENY (protect_donor_request_fields trigger exception)',
      actual: test6Passed ? `DENY (${err6.message})` : (err6 ? `DENY (${err6.message})` : 'ALLOW (MUTATION PERMITTED)'),
      status: test6Passed ? 'PASS' : 'FAIL',
      details: test6Passed ? 'Trigger protect_donor_request_fields() strictly aborted column tampering.' : (err6 ? `Trigger error: ${err6.message}` : 'CRITICAL: Protected fields mutated!'),
    });

    // --------------------------------------------------------------------------
    // TEST 7: User C makes legitimate response status changes (maybe, declined) → ALLOW
    // --------------------------------------------------------------------------
    const { data: d7Maybe, error: err7Maybe } = await clientC.from('donor_requests')
      .update({ status: 'maybe' })
      .eq('id', dreq1Id)
      .select();

    const { data: d7Declined, error: err7Declined } = await clientC.from('donor_requests')
      .update({ status: 'declined', decline_reason: 'Not available currently' })
      .eq('id', dreq1Id)
      .select();

    const test7Passed = !err7Maybe && !err7Declined && (d7Declined && d7Declined[0]?.status === 'declined');
    recordLive({
      id: 'LIVE-07',
      scenario: 'Donor C transitions status through legal response states (maybe, declined)',
      expected: 'ALLOW (Legal status transitions succeed)',
      actual: test7Passed ? 'ALLOW (maybe & declined accepted)' : 'DENIED',
      status: test7Passed ? 'PASS' : 'FAIL',
      details: test7Passed ? 'Legal status transitions (accepted, maybe, declined) execute cleanly.' : 'Failed legal transition.',
    });

    // --------------------------------------------------------------------------
    // TEST 8: Invalid status must be rejected → DENY
    // --------------------------------------------------------------------------
    const { data: d8, error: err8 } = await clientC.from('donor_requests')
      .update({ status: 'malicious_arbitrary_status' })
      .eq('id', dreq1Id)
      .select();

    const test8Passed = !!err8 && (err8.message.includes('Invalid status') || err8.message.includes('check constraint') || err8.message.includes('violates'));
    recordLive({
      id: 'LIVE-08',
      scenario: 'Donor C attempts to supply invalid response status',
      expected: 'DENY (Validation trigger / Check constraint block)',
      actual: test8Passed ? `DENY (${err8.message})` : 'ALLOW (VULNERABILITY DETECTED)',
      status: test8Passed ? 'PASS' : 'FAIL',
      details: test8Passed ? 'Invalid status rejected by database constraint/trigger.' : 'Invalid status was accepted!',
    });

    // --------------------------------------------------------------------------
    // TEST 9: Creation on Closed / Inactive Blood Request States → DENY
    // --------------------------------------------------------------------------
    const closedReqId = `req-closed-${ts}`;
    await clientA.from('blood_requests').insert({
      id: closedReqId,
      request_id: `REQ-CL-${ts.toString().slice(-5)}`,
      user_id: uidA,
      patient_name: 'Patient Closed',
      blood_group: 'A+',
      hospital: 'Dhamrai Hospital',
      status: 'cancelled', // Closed state
      contact_person: 'Contact Alpha',
      contact_number: '01711000001',
      relationship: 'Self',
    });
    createdBloodReqIds.push(closedReqId);

    const dreqClosedId = `dreq-cl-${ts}`;
    const { data: dClosed, error: errClosed } = await clientA.from('donor_requests').insert({
      id: dreqClosedId,
      blood_request_id: closedReqId,
      donor_id: donorCId,
      donor_user_id: uidC,
      requester_user_id: uidA,
      status: 'pending',
      match_score: 80,
      patient_name: 'Patient Closed',
      hospital: 'Dhamrai Hospital',
      blood_group: 'A+',
    }).select();

    if (!errClosed && dClosed && dClosed.length > 0) createdDonorReqIds.push(dreqClosedId);

    const test9Passed = !!errClosed || (!dClosed || dClosed.length === 0);
    recordLive({
      id: 'LIVE-09',
      scenario: 'Creation of donor_request on cancelled / closed blood request',
      expected: 'DENY (RLS state check br.status IN allowed)',
      actual: test9Passed ? `DENY (${errClosed?.message || '0 rows inserted'})` : 'ALLOW (VULNERABILITY DETECTED)',
      status: test9Passed ? 'PASS' : 'FAIL',
      details: test9Passed ? 'Closed/cancelled blood request rejected by RLS policy.' : 'CRITICAL: Donor request created for cancelled request!',
    });

  } finally {
    console.log('\n--- Step 4: Ephemeral Test Records Cleanup ---');
    for (const dreqId of createdDonorReqIds) {
      await clientA.from('donor_requests').delete().eq('id', dreqId);
    }
    for (const reqId of createdBloodReqIds) {
      await clientA.from('blood_requests').delete().eq('id', reqId);
    }
    for (const dnrId of createdDonorIds) {
      await clientC.from('donors').delete().eq('id', dnrId);
    }
    console.log('🧹 Cleanup completed: Ephemeral test rows removed.');
  }

  const passed = liveResults.filter((r) => r.status === 'PASS').length;
  const failed = liveResults.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`📊 LIVE DATABASE AUDIT SUMMARY: ${passed}/${liveResults.length} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  return {
    allPassed: failed === 0,
    liveResults,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLivePhase1AAdversarial().then(({ allPassed }) => {
    process.exit(allPassed ? 0 : 1);
  });
}
import { fileURLToPath } from 'url';
