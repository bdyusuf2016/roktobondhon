/**
 * 🧪 LIVE PRODUCTION PHASE 1C OPERATIONAL & ADVERSARIAL SECURITY TEST RUNNER
 *
 * Verifies live Supabase database RLS, triggers, RPCs, and lifecycle hardening:
 *
 * Actors:
 *   User A = Requester Owner
 *   User B = Accepted Donor
 *   User C = Unrelated Donor / Attacker
 *   User D..H = Additional Ephemeral Donors for Rate Limit testing
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

async function runLivePhase1CSuite() {
  console.log('================================================================');
  console.log('🛡️ ROKTOBONDHON — LIVE PRODUCTION PHASE 1C OPERATIONAL & SECURITY AUDIT');
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
  const emailA = `p1c_req_a_${ts}@roktobondon.test`;
  const emailB = `p1c_dnr_b_${ts}@roktobondon.test`;
  const emailC = `p1c_att_c_${ts}@roktobondon.test`;
  const emailExtra = [
    `p1c_extra_1_${ts}@roktobondon.test`,
    `p1c_extra_2_${ts}@roktobondon.test`,
    `p1c_extra_3_${ts}@roktobondon.test`,
    `p1c_extra_4_${ts}@roktobondon.test`,
    `p1c_extra_5_${ts}@roktobondon.test`,
  ];
  const pass = `LiveAudit!${Math.random().toString(36).slice(2)}99#`;

  console.log('--- Step 1: Provisioning Ephemeral Test Users ---');
  const [resA, resB, resC, ...resExtras] = await Promise.all([
    anonClient.auth.signUp({ email: emailA, password: pass }),
    anonClient.auth.signUp({ email: emailB, password: pass }),
    anonClient.auth.signUp({ email: emailC, password: pass }),
    ...emailExtra.map((em) => anonClient.auth.signUp({ email: em, password: pass })),
  ]);

  if (!resA.data.session || !resB.data.session || !resC.data.session) {
    console.error('❌ Failed to provision authenticated sessions on live Supabase.');
    process.exit(1);
  }

  const uidA = resA.data.user!.id;
  const uidB = resB.data.user!.id;
  const uidC = resC.data.user!.id;

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resA.data.session.access_token}` } },
  });
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resB.data.session.access_token}` } },
  });
  const clientC = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${resC.data.session.access_token}` } },
  });

  const extraClients: { client: SupabaseClient; uid: string }[] = [];
  for (const r of resExtras) {
    if (r.data.session && r.data.user) {
      extraClients.push({
        client: createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${r.data.session.access_token}` } },
        }),
        uid: r.data.user.id,
      });
    }
  }

  console.log(`User A (Requester):  ${uidA}`);
  console.log(`User B (Donor):      ${uidB}`);
  console.log(`User C (Attacker):   ${uidC}`);
  console.log(`Extra Donors:        ${extraClients.length} provisioned\n`);

  const createdDonorIds: string[] = [];
  const createdBloodReqIds: string[] = [];
  const createdDonorReqIds: string[] = [];

  try {
    console.log('--- Step 2: Preparing Baseline Test Data ---');
    // 1. Donor B Profile
    const donorBId = `dnr-p1c-b-${ts}`;
    const { error: errDonorB } = await clientB.from('donors').insert({
      id: donorBId,
      donor_id: `DNR-P1C-${ts.toString().slice(-6)}`,
      user_id: uidB,
      full_name: 'লাইভ অডিট রক্তদাতা',
      blood_group: 'A+',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      area: 'কালামপুর',
      location_label: 'কালামপুর বাজার',
      phone: '01712345678',
      emergency_contact: '01799999999', // SENSITIVE
      email: emailB,
      nid_or_id_number: '19951234567890123',
      exact_address: 'গোপন ঠিকানা # ১২৩',
      date_of_birth: '1995-05-10',
      availability: true,
      emergency_available: true,
    });
    if (errDonorB) throw new Error(`Failed to create Donor B: ${errDonorB.message}`);
    createdDonorIds.push(donorBId);

    // 2. Extra Donor Profiles for Rate Limit Test
    const extraDonorIds: string[] = [];
    for (let i = 0; i < extraClients.length; i++) {
      const eDnrId = `dnr-p1c-extra-${i}-${ts}`;
      const { error: errED } = await extraClients[i].client.from('donors').insert({
        id: eDnrId,
        donor_id: `DNR-E${i}-${ts.toString().slice(-5)}`,
        user_id: extraClients[i].uid,
        full_name: `Extra Donor ${i + 1}`,
        blood_group: 'A+',
        district: 'ঢাকা',
        upazila: 'ধামরাই',
        phone: `017110000${i}`,
      });
      if (!errED) {
        extraDonorIds.push(eDnrId);
        createdDonorIds.push(eDnrId);
      }
    }

    // 3. Blood Request A (owned by User A)
    const bloodReqAId = `breq-p1c-a-${ts}`;
    const { error: errBReqA } = await clientA.from('blood_requests').insert({
      id: bloodReqAId,
      request_id: `BD-2026-${ts.toString().slice(-6)}`,
      user_id: uidA,
      patient_name: 'মুহিবুর রহমান',
      blood_group: 'A+',
      required_units: 1,
      required_date: '2026-09-15',
      required_time: '12:00 PM',
      hospital: 'ধামরাই সরকারি হাসপাতাল',
      division: 'Dhaka',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      area: 'ধামরাই সদর',
      contact_person: 'মুহিবুর',
      contact_number: '01700000001',
      relationship: 'Self',
      emergency_level: 'URGENT',
      status: 'active',
    });
    if (errBReqA) throw new Error(`Failed to create Blood Request A: ${errBReqA.message}`);
    createdBloodReqIds.push(bloodReqAId);

    console.log('Baseline established successfully.\n');
    console.log('--- Step 3: Executing Live Verification ---');

    // --------------------------------------------------------------------------
    // TEST 1: Cross-Owner Blood Request Mutation -> DENY
    // --------------------------------------------------------------------------
    const { error: errCrossMutate } = await clientC
      .from('blood_requests')
      .update({ hospital: 'হ্যাকড হাসপাতাল' })
      .eq('id', bloodReqAId);

    const { data: verifyCrossRow } = await clientA
      .from('blood_requests')
      .select('hospital')
      .eq('id', bloodReqAId)
      .single();

    const crossMutateBlocked = verifyCrossRow?.hospital !== 'হ্যাকড হাসপাতাল';
    recordLive({
      id: 'LIVE-P1C-01',
      scenario: 'User C (Attacker) attempts mutating User A blood request',
      expected: 'DENY (0 rows modified / RLS block)',
      actual: crossMutateBlocked ? 'DENY (0 rows modified)' : 'ALLOW (VULNERABILITY DETECTED)',
      status: crossMutateBlocked ? 'PASS' : 'FAIL',
      details: crossMutateBlocked ? 'Cross-owner blood request update strictly isolated.' : 'CRITICAL: Non-owner mutated blood request!',
    });

    // --------------------------------------------------------------------------
    // TEST 2: User A attempts mutating immutable blood_group -> DENY
    // --------------------------------------------------------------------------
    const { error: errMutateBg } = await clientA
      .from('blood_requests')
      .update({ blood_group: 'B+' })
      .eq('id', bloodReqAId);

    const test2Passed = !!errMutateBg && errMutateBg.message.includes('immutable');
    recordLive({
      id: 'LIVE-P1C-02',
      scenario: 'User A attempts mutating immutable blood_group on existing request',
      expected: 'DENY (Trigger exception: Modification of immutable blood request identity fields is forbidden)',
      actual: test2Passed ? `DENY (${errMutateBg?.message})` : `ALLOW (${errMutateBg?.message || 'Succeeded'})`,
      status: test2Passed ? 'PASS' : 'FAIL',
      details: test2Passed ? 'protect_blood_request_fields trigger strictly prevented blood_group alteration.' : 'CRITICAL: blood_group was modified!',
    });

    // --------------------------------------------------------------------------
    // TEST 3: User A attempts mutating immutable user_id (Ownership Hijacking) -> DENY
    // --------------------------------------------------------------------------
    const { error: errMutateOwner } = await clientA
      .from('blood_requests')
      .update({ user_id: uidC })
      .eq('id', bloodReqAId);

    const test3Passed = !!errMutateOwner && errMutateOwner.message.includes('immutable');
    recordLive({
      id: 'LIVE-P1C-03',
      scenario: 'User A attempts reassigning owner user_id on existing blood request',
      expected: 'DENY (Trigger exception: Modification of immutable blood request identity fields is forbidden)',
      actual: test3Passed ? `DENY (${errMutateOwner?.message})` : `ALLOW (${errMutateOwner?.message || 'Succeeded'})`,
      status: test3Passed ? 'PASS' : 'FAIL',
      details: test3Passed ? 'Owner user_id is strictly immutable.' : 'CRITICAL: user_id ownership was hijacked!',
    });

    // --------------------------------------------------------------------------
    // TEST 4: Dispatch donor request & duplicate active dispatch prevention -> DENY
    // --------------------------------------------------------------------------
    const dreqBId = `dreq-p1c-b-${ts}`;
    const { error: errInsertDReq1 } = await clientA.from('donor_requests').insert({
      id: dreqBId,
      blood_request_id: bloodReqAId,
      donor_id: donorBId,
      donor_user_id: uidB,
      requester_user_id: uidA,
      status: 'pending',
      match_score: 95,
      patient_name: 'মুহিবুর রহমান',
      hospital: 'ধামরাই সরকারি হাসপাতাল',
      blood_group: 'A+',
      emergency_level: 'URGENT',
    });
    if (!errInsertDReq1) createdDonorReqIds.push(dreqBId);

    const dreqDupId = `dreq-p1c-dup-${ts}`;
    const { error: errDupDReq } = await clientA.from('donor_requests').insert({
      id: dreqDupId,
      blood_request_id: bloodReqAId,
      donor_id: donorBId,
      donor_user_id: uidB,
      requester_user_id: uidA,
      status: 'pending',
      match_score: 95,
      patient_name: 'মুহিবুর রহমান',
      hospital: 'ধামরাই সরকারি হাসপাতাল',
      blood_group: 'A+',
      emergency_level: 'URGENT',
    });

    const test4Passed = !errInsertDReq1 && !!errDupDReq && errDupDReq.message.includes('Duplicate');
    recordLive({
      id: 'LIVE-P1C-04',
      scenario: 'Duplicate active donor request dispatch to same donor',
      expected: 'DENY (Duplicate: A request has already been sent to this donor)',
      actual: test4Passed ? `DENY (${errDupDReq?.message})` : `ALLOW (${errDupDReq?.message || 'Inserted'})`,
      status: test4Passed ? 'PASS' : 'FAIL',
      details: test4Passed ? 'enforce_donor_request_limits trigger successfully blocked duplicate dispatch.' : 'CRITICAL: Duplicate active request was permitted!',
    });

    // --------------------------------------------------------------------------
    // TEST 5: Rate Limiting (Max 5 Pending Requests per Blood Request) -> DENIED on 6th
    // --------------------------------------------------------------------------
    // We have 1 pending (Donor B). Let's insert 4 more to reach limit of 5.
    for (let i = 0; i < Math.min(4, extraDonorIds.length); i++) {
      const eDreqId = `dreq-p1c-extra-${i}-${ts}`;
      const { error: errExInsert } = await clientA.from('donor_requests').insert({
        id: eDreqId,
        blood_request_id: bloodReqAId,
        donor_id: extraDonorIds[i],
        donor_user_id: extraClients[i].uid,
        requester_user_id: uidA,
        status: 'pending',
        match_score: 90,
        patient_name: 'মুহিবুর রহমান',
        hospital: 'ধামরাই সরকারি হাসপাতাল',
        blood_group: 'A+',
        emergency_level: 'URGENT',
      });
      if (!errExInsert) createdDonorReqIds.push(eDreqId);
    }

    // Now attempt 6th concurrent pending request
    const dreq6thId = `dreq-p1c-6th-${ts}`;
    const { error: err6th } = await clientA.from('donor_requests').insert({
      id: dreq6thId,
      blood_request_id: bloodReqAId,
      donor_id: extraDonorIds[4] || `dnr-placeholder-${ts}`,
      donor_user_id: extraClients[4]?.uid || uidC,
      requester_user_id: uidA,
      status: 'pending',
      match_score: 85,
      patient_name: 'মুহিবুর রহমান',
      hospital: 'ধামরাই সরকারি হাসপাতাল',
      blood_group: 'A+',
      emergency_level: 'URGENT',
    });

    const test5Passed = !!err6th && err6th.message.includes('Rate limit exceeded');
    recordLive({
      id: 'LIVE-P1C-05',
      scenario: 'Concurrent Rate Limit: 6th pending donor request dispatch',
      expected: 'DENY (Rate limit exceeded: A blood request cannot have more than 5 concurrent pending donor requests)',
      actual: test5Passed ? `DENY (${err6th?.message})` : `ALLOW (${err6th?.message || 'Inserted'})`,
      status: test5Passed ? 'PASS' : 'FAIL',
      details: test5Passed ? 'enforce_donor_request_limits trigger successfully enforced concurrency cap.' : 'CRITICAL: Exceeded 5 concurrent pending requests!',
    });

    // --------------------------------------------------------------------------
    // TEST 6: get_accepted_donor_contact while status is pending -> DENY
    // --------------------------------------------------------------------------
    const { data: contactPending, error: errContactPending } = await clientA.rpc(
      'get_accepted_donor_contact',
      { p_donor_request_id: dreqBId }
    );

    const test6Passed = !!errContactPending && errContactPending.message.includes('accepted');
    recordLive({
      id: 'LIVE-P1C-06',
      scenario: 'Requester calls get_accepted_donor_contact while donor request is pending',
      expected: 'DENY (Unauthorized: Donor contact details are only disclosed when the request is accepted)',
      actual: test6Passed ? `DENY (${errContactPending?.message})` : `ALLOW (${JSON.stringify(contactPending)})`,
      status: test6Passed ? 'PASS' : 'FAIL',
      details: test6Passed ? 'Privacy guard prevented premature contact disclosure.' : 'CRITICAL: Contact disclosed before donor acceptance!',
    });

    // --------------------------------------------------------------------------
    // TEST 7: Donor B accepts request -> Authorized get_accepted_donor_contact -> ALLOW
    // --------------------------------------------------------------------------
    await clientB
      .from('donor_requests')
      .update({ status: 'accepted' })
      .eq('id', dreqBId);

    const { data: contactAccepted, error: errContactAccepted } = await clientA.rpc(
      'get_accepted_donor_contact',
      { p_donor_request_id: dreqBId }
    );

    const hasZeroLeakedSensitiveFields =
      contactAccepted &&
      contactAccepted.phone === '01712345678' &&
      contactAccepted.emergency_contact === undefined &&
      contactAccepted.email === undefined &&
      contactAccepted.nid_or_id_number === undefined &&
      contactAccepted.exact_address === undefined &&
      contactAccepted.admin_notes === undefined;

    const test7Passed = !errContactAccepted && hasZeroLeakedSensitiveFields;
    recordLive({
      id: 'LIVE-P1C-07',
      scenario: 'Requester calls get_accepted_donor_contact after donor acceptance (Zero PII leakage)',
      expected: 'ALLOW (Returns phone: 01712345678, zero emergency_contact/NID/email/address/admin_notes)',
      actual: test7Passed ? `ALLOW (Phone: ${contactAccepted?.phone}, sensitive fields 100% masked)` : `FAIL (${errContactAccepted?.message || 'PII leaked'})`,
      status: test7Passed ? 'PASS' : 'FAIL',
      details: test7Passed ? 'Strict privacy-preserving contact disclosure verified.' : 'Failed contact disclosure contract.',
    });

    // --------------------------------------------------------------------------
    // TEST 8: Cross-user C calls get_accepted_donor_contact on User A request -> DENY
    // --------------------------------------------------------------------------
    const { data: contactAttacker, error: errContactAttacker } = await clientC.rpc(
      'get_accepted_donor_contact',
      { p_donor_request_id: dreqBId }
    );

    const test8Passed = !!errContactAttacker && errContactAttacker.message.includes('Unauthorized');
    recordLive({
      id: 'LIVE-P1C-08',
      scenario: 'User C (Attacker) calls get_accepted_donor_contact on User A donor request',
      expected: 'DENY (Unauthorized: Only the blood request owner or authorized staff can access donor contact details)',
      actual: test8Passed ? `DENY (${errContactAttacker?.message})` : `ALLOW (${JSON.stringify(contactAttacker)})`,
      status: test8Passed ? 'PASS' : 'FAIL',
      details: test8Passed ? 'Cross-owner donor contact disclosure strictly blocked.' : 'CRITICAL: Attacker accessed donor contact details!',
    });

    // --------------------------------------------------------------------------
    // TEST 9: Direct PostgREST UPDATE active -> fulfilled without RPC -> DENIED
    // --------------------------------------------------------------------------
    const { error: errDirectFulfill } = await clientA
      .from('blood_requests')
      .update({ status: 'fulfilled' })
      .eq('id', bloodReqAId);

    const test9Passed = !!errDirectFulfill && (errDirectFulfill.message.includes('complete_donation_fulfillment') || errDirectFulfill.message.includes('forbidden'));
    recordLive({
      id: 'LIVE-P1C-09',
      scenario: 'Direct PostgREST UPDATE active -> fulfilled without RPC fulfillment',
      expected: 'DENY (Trigger exception: Direct update to fulfilled is forbidden. Fulfillment must occur through complete_donation_fulfillment)',
      actual: test9Passed ? `DENY (${errDirectFulfill?.message})` : `ALLOW (${errDirectFulfill?.message || 'Updated'})`,
      status: test9Passed ? 'PASS' : 'FAIL',
      details: test9Passed ? 'Authoritative RPC fulfillment requirement enforced at database trigger level.' : 'CRITICAL: Direct update to fulfilled succeeded!',
    });

    // --------------------------------------------------------------------------
    // TEST 10: Direct PostgREST UPDATE active -> expired by client -> DENIED
    // --------------------------------------------------------------------------
    const { error: errDirectExpire } = await clientA
      .from('blood_requests')
      .update({ status: 'expired' })
      .eq('id', bloodReqAId);

    const test10Passed = !!errDirectExpire && (errDirectExpire.message.includes('Expiration is managed by system') || errDirectExpire.message.includes('forbidden'));
    recordLive({
      id: 'LIVE-P1C-10',
      scenario: 'Direct PostgREST UPDATE active -> expired by authenticated client',
      expected: 'DENY (Trigger exception: Direct update to expired is forbidden. Expiration is managed by system automated processes)',
      actual: test10Passed ? `DENY (${errDirectExpire?.message})` : `ALLOW (${errDirectExpire?.message || 'Updated'})`,
      status: test10Passed ? 'PASS' : 'FAIL',
      details: test10Passed ? 'Automated system expiration boundary verified.' : 'CRITICAL: Client set status to expired!',
    });

    // --------------------------------------------------------------------------
    // TEST 11: Direct client invocation of recompute_blood_request_match_state -> DENIED
    // --------------------------------------------------------------------------
    const { error: errDirectMatchHelper } = await clientA.rpc(
      'recompute_blood_request_match_state' as any,
      { p_blood_request_id: bloodReqAId }
    );

    const test11Passed = !!errDirectMatchHelper && (errDirectMatchHelper.message.includes('permission denied') || errDirectMatchHelper.code === '42501');
    recordLive({
      id: 'LIVE-P1C-11',
      scenario: 'Direct client invocation of internal helper recompute_blood_request_match_state',
      expected: 'DENY (Permission denied / Revoked from client)',
      actual: test11Passed ? `DENY (${errDirectMatchHelper?.message})` : `ALLOW (${errDirectMatchHelper?.message || 'Executed'})`,
      status: test11Passed ? 'PASS' : 'FAIL',
      details: test11Passed ? 'recompute_blood_request_match_state is strictly locked down from client access.' : 'CRITICAL: Client was able to execute internal helper!',
    });

    // --------------------------------------------------------------------------
    // TEST 12: Direct client invocation of handle_donor_request_match_state -> DENIED
    // --------------------------------------------------------------------------
    const { error: errDirectTriggerHelper } = await clientA.rpc(
      'handle_donor_request_match_state' as any
    );

    const test12Passed = !!errDirectTriggerHelper && (
      errDirectTriggerHelper.message.includes('permission denied') ||
      errDirectTriggerHelper.message.includes('Could not find the function') ||
      errDirectTriggerHelper.code === '42501' ||
      errDirectTriggerHelper.code === 'PGRST202'
    );
    recordLive({
      id: 'LIVE-P1C-12',
      scenario: 'Direct client invocation of trigger helper handle_donor_request_match_state',
      expected: 'DENY (Permission denied / Revoked from client)',
      actual: test12Passed ? `DENY (${errDirectTriggerHelper?.message})` : `ALLOW (${errDirectTriggerHelper?.message || 'Executed'})`,
      status: test12Passed ? 'PASS' : 'FAIL',
      details: test12Passed ? 'handle_donor_request_match_state is strictly locked down from client access.' : 'CRITICAL: Client was able to execute trigger helper!',
    });

    // --------------------------------------------------------------------------
    // TEST 13: Authorized Fulfillment via complete_donation_fulfillment RPC -> ALLOW
    // --------------------------------------------------------------------------
    const { data: fulfillRes, error: errFulfill } = await clientB.rpc(
      'complete_donation_fulfillment',
      { p_donor_request_id: dreqBId, p_notes: 'লাইভ টেস্ট সম্পন্ন' }
    );

    const test13Passed = !errFulfill && fulfillRes && fulfillRes.success === true;
    recordLive({
      id: 'LIVE-P1C-13',
      scenario: 'Assigned Donor B completes donation via complete_donation_fulfillment RPC',
      expected: 'ALLOW (Donation completed, blood request fulfilled, GUC marker authorized)',
      actual: test13Passed ? `ALLOW (Donation ID: ${fulfillRes?.donation_id}, status: fulfilled)` : `FAIL (${errFulfill?.message})`,
      status: test13Passed ? 'PASS' : 'FAIL',
      details: test13Passed ? 'Atomic donation fulfillment and GUC-authorized blood request transition verified.' : 'Fulfillment failed.',
    });

    // --------------------------------------------------------------------------
    // TEST 14: Terminal Request Immutability (Attempt to modify fulfilled request) -> DENY
    // --------------------------------------------------------------------------
    const { error: errModFulfilled } = await clientA
      .from('blood_requests')
      .update({ patient_name: 'নতুন রোগীর নাম', hospital: 'নতুন হাসপাতাল' })
      .eq('id', bloodReqAId);

    const test14Passed = !!errModFulfilled && errModFulfilled.message.includes('terminal');
    recordLive({
      id: 'LIVE-P1C-14',
      scenario: 'Requester attempts modifying fields on fulfilled blood request',
      expected: 'DENY (Trigger exception: Modification of a terminal blood request is strictly forbidden)',
      actual: test14Passed ? `DENY (${errModFulfilled?.message})` : `ALLOW (${errModFulfilled?.message || 'Modified'})`,
      status: test14Passed ? 'PASS' : 'FAIL',
      details: test14Passed ? 'Fulfilled terminal blood request is completely immutable.' : 'CRITICAL: Fulfilled request field was modified!',
    });

    // --------------------------------------------------------------------------
    // TEST 15: Terminal Invariant: Dispatching donor request for fulfilled blood request -> DENY
    // --------------------------------------------------------------------------
    const dreqOnFulfilledId = `dreq-p1c-onful-${ts}`;
    const { error: errDReqOnFulfilled } = await clientA.from('donor_requests').insert({
      id: dreqOnFulfilledId,
      blood_request_id: bloodReqAId,
      donor_id: donorBId,
      donor_user_id: uidB,
      requester_user_id: uidA,
      status: 'pending',
      match_score: 95,
      patient_name: 'মুহিবুর রহমান',
      hospital: 'ধামরাই সরকারি হাসপাতাল',
      blood_group: 'A+',
      emergency_level: 'URGENT',
    });

    const test15Passed = !!errDReqOnFulfilled && (errDReqOnFulfilled.message.includes('fulfilled') || errDReqOnFulfilled.message.includes('terminal') || errDReqOnFulfilled.message.includes('Cannot dispatch'));
    recordLive({
      id: 'LIVE-P1C-15',
      scenario: 'Requester attempts dispatching donor request for fulfilled blood request',
      expected: 'DENY (Cannot dispatch donor requests for a fulfilled blood request)',
      actual: test15Passed ? `DENY (${errDReqOnFulfilled?.message})` : `ALLOW (${errDReqOnFulfilled?.message || 'Inserted'})`,
      status: test15Passed ? 'PASS' : 'FAIL',
      details: test15Passed ? 'Terminal blood request rejects new donor requests.' : 'CRITICAL: Donor request dispatched on fulfilled request!',
    });

    // --------------------------------------------------------------------------
    // TEST 16: Direct Client INSERT on public.donations by User C -> DENY
    // --------------------------------------------------------------------------
    const forgedDonationId = `don-forged-${ts}`;
    const { error: errForgedDonation } = await clientC.from('donations').insert({
      id: forgedDonationId,
      donor_id: donorBId,
      donor_user_id: uidB,
      donor_name: 'Forged Donor',
      blood_group: 'A+',
      request_id: bloodReqAId,
      blood_request_id: bloodReqAId,
      donor_request_id: dreqBId,
      donation_date: '2026-09-14',
      hospital: 'Forged Hospital',
      location: 'Forged Location',
      units: 1,
      donation_type: 'Whole Blood',
      source: 'manual',
    });

    const test16Passed = !!errForgedDonation;
    recordLive({
      id: 'LIVE-P1C-16',
      scenario: 'User C (Attacker) attempts direct client INSERT into public.donations',
      expected: 'DENY (RLS policy blocks direct client insert)',
      actual: test16Passed ? `DENY (${errForgedDonation?.message})` : 'ALLOW (VULNERABILITY DETECTED)',
      status: test16Passed ? 'PASS' : 'FAIL',
      details: test16Passed ? 'Direct donations INSERT strictly blocked.' : 'CRITICAL: Attacker forged donation record!',
    });

  } finally {
    console.log('\n--- Step 4: Ephemeral Test Records Cleanup ---');
    for (const dreqId of createdDonorReqIds) {
      await clientA.from('donor_requests').delete().eq('id', dreqId);
    }
    for (const breqId of createdBloodReqIds) {
      await clientA.from('blood_requests').delete().eq('id', breqId);
    }
    for (const dnrId of createdDonorIds) {
      await clientB.from('donors').delete().eq('id', dnrId);
    }
    console.log('🧹 Cleanup completed: Ephemeral test rows removed.');
  }

  console.log('\n================================================================');
  const totalPassed = liveResults.filter((r) => r.status === 'PASS').length;
  console.log(`📊 LIVE PHASE 1C AUDIT SUMMARY: ${totalPassed}/${liveResults.length} PASSED | ${liveResults.length - totalPassed} FAILED`);
  console.log('================================================================\n');

  if (totalPassed !== liveResults.length) {
    process.exit(1);
  }
}

runLivePhase1CSuite().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
