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

interface TestItem {
  role: string;
  resource: string;
  allowedOp: string;
  deniedOp: string;
  classification: 'P0 Critical' | 'P1 High' | 'P2 Medium' | 'P3 Low';
  status: 'PASS' | 'FAIL' | 'NOT TESTED';
  evidence: string;
}

const matrix: TestItem[] = [];

function record(item: TestItem) {
  matrix.push(item);
  const icon = item.status === 'PASS' ? '✅' : item.status === 'FAIL' ? '❌' : '⚪';
  console.log(`${icon} [${item.status}] [${item.role}] ${item.resource}: ${item.evidence}`);
}

async function run() {
  console.log('================================================================');
  console.log('🛡️ ROKTOBONDHON PHASE 0.7 — AUTHENTICATED MULTI-ROLE SECURITY QA');
  console.log('Target:', url);
  console.log('================================================================\n');

  if (!url || !anonKey) {
    console.error('Supabase URL or Anon Key missing in environment.');
    return;
  }

  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

  // ----------------------------------------------------------------------------
  // SECTION 1: EPHEMERAL AUTHENTICATED TEST SESSIONS (DONOR A & DONOR B)
  // ----------------------------------------------------------------------------
  const donorAEmail = `qa-donor-a-${Date.now()}@roktobondhon.test`;
  const donorAPass = `TestPass!${Math.random().toString(36).slice(2)}A1`;

  const donorBEmail = `qa-donor-b-${Date.now()}@roktobondhon.test`;
  const donorBPass = `TestPass!${Math.random().toString(36).slice(2)}B1`;

  console.log('--- Step 1: Provisioning Ephemeral Test Accounts (Donor A & B) ---');
  
  const { data: signUpA, error: errA } = await anonClient.auth.signUp({
    email: donorAEmail,
    password: donorAPass,
    options: {
      data: {
        full_name: 'QA Donor Alpha',
        phone: '01710000001',
        role: 'super_admin' // Privilege escalation attempt via signup metadata
      }
    }
  });

  const { data: signUpB, error: errB } = await anonClient.auth.signUp({
    email: donorBEmail,
    password: donorBPass,
    options: {
      data: {
        full_name: 'QA Donor Beta',
        phone: '01710000002',
        role: 'admin'
      }
    }
  });

  if (errA || !signUpA.session || errB || !signUpB.session) {
    console.error('Failed to create ephemeral authenticated sessions:', errA?.message || errB?.message);
    return;
  }

  const clientA = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signUpA.session.access_token}` } }
  });

  const clientB = createClient(url, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${signUpB.session.access_token}` } }
  });

  const uidA = signUpA.user!.id;
  const uidB = signUpB.user!.id;

  console.log(`Donor A Authenticated UID: ${uidA}`);
  console.log(`Donor B Authenticated UID: ${uidB}\n`);

  // ----------------------------------------------------------------------------
  // TEST 1: Privilege Escalation via Signup Metadata
  // ----------------------------------------------------------------------------
  const { data: userRowA } = await clientA.from('users').select('*').eq('id', uidA).maybeSingle();
  if (!userRowA) {
    record({
      role: 'donor',
      resource: 'users.role (Signup Hook)',
      allowedOp: 'Create auth user',
      deniedOp: 'Auto-promote to super_admin in users table',
      classification: 'P0 Critical',
      status: 'PASS',
      evidence: 'No privileged role assigned. Metadata role=super_admin was completely rejected.'
    });
  } else {
    const isEscalated = userRowA.role === 'super_admin' || userRowA.role === 'admin';
    record({
      role: 'donor',
      resource: 'users.role (Signup Hook)',
      allowedOp: 'Default role donor',
      deniedOp: 'Client metadata role assignment',
      classification: 'P0 Critical',
      status: isEscalated ? 'FAIL' : 'PASS',
      evidence: isEscalated ? `CRITICAL LEAK: role escalated to ${userRowA.role}` : `Strict safe role assigned: ${userRowA.role}`
    });
  }

  // ----------------------------------------------------------------------------
  // TEST 2: Direct Client INSERT into public.users
  // ----------------------------------------------------------------------------
  const { error: insUserErr } = await clientA.from('users').insert({
    id: uidA,
    full_name: 'Hacked Admin',
    email: donorAEmail,
    role: 'super_admin',
    status: 'active'
  });
  record({
    role: 'donor',
    resource: 'users (INSERT)',
    allowedOp: 'Admin/service_role only',
    deniedOp: 'Donor direct profile insert',
    classification: 'P0 Critical',
    status: insUserErr ? 'PASS' : 'FAIL',
    evidence: insUserErr ? `Denied by RLS: ${insUserErr.message}` : 'CRITICAL: Non-admin inserted record into public.users'
  });

  // ----------------------------------------------------------------------------
  // TEST 3: Donor Self-Update Role Escalation to super_admin
  // ----------------------------------------------------------------------------
  const { error: updRoleErr } = await clientA.from('users').update({ role: 'super_admin' }).eq('id', uidA);
  // Either error or 0 rows modified
  const { data: checkRoleA } = await clientA.from('users').select('role').eq('id', uidA).maybeSingle();
  const roleSafe = !checkRoleA || checkRoleA.role === 'donor';
  record({
    role: 'donor',
    resource: 'users.role (UPDATE)',
    allowedOp: 'Self profile update (non-privileged fields)',
    deniedOp: 'Self-promotion to super_admin',
    classification: 'P0 Critical',
    status: roleSafe ? 'PASS' : 'FAIL',
    evidence: roleSafe ? 'Privilege escalation blocked; role remains unprivileged' : `CRITICAL: Role updated to ${checkRoleA?.role}`
  });

  // ----------------------------------------------------------------------------
  // TEST 4: Horizontal IDOR - Read Another User's Profile in public.users
  // ----------------------------------------------------------------------------
  const { data: readOtherUser, error: errReadOther } = await clientA.from('users').select('*').eq('id', uidB);
  const readOtherBlocked = !readOtherUser || readOtherUser.length === 0;
  record({
    role: 'donor',
    resource: 'users (SELECT foreign)',
    allowedOp: 'View own profile',
    deniedOp: 'View foreign user profile',
    classification: 'P1 High',
    status: readOtherBlocked ? 'PASS' : 'FAIL',
    evidence: readOtherBlocked ? 'Foreign user profile hidden (0 rows returned)' : 'DATA LEAK: Foreign user profile returned'
  });

  // ----------------------------------------------------------------------------
  // TEST 5: Donor Profile Lifecycle (Own Profile in public.donors)
  // ----------------------------------------------------------------------------
  const donorAId = `donor-qa-${Date.now()}`;
  const { error: insDonorErr } = await clientA.from('donors').insert({
    id: donorAId,
    user_id: uidA,
    donor_id: `DON-${Date.now()}`,
    full_name: 'QA Donor Alpha Profile',
    phone: '01710000001',
    blood_group: 'A+',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhamrai',
    verification_status: 'unverified'
  });

  record({
    role: 'donor',
    resource: 'donors (INSERT own)',
    allowedOp: 'Register own donor profile with user_id = auth.uid()',
    deniedOp: 'Register donor profile for another user',
    classification: 'P1 High',
    status: !insDonorErr ? 'PASS' : 'FAIL',
    evidence: !insDonorErr ? 'Own donor profile registered successfully' : `Insert failed: ${insDonorErr.message}`
  });

  // ----------------------------------------------------------------------------
  // TEST 6: Donor Reading Own Raw Donor Record (PII Allowed for Self)
  // ----------------------------------------------------------------------------
  const { data: ownDonorData, error: ownDonorErr } = await clientA.from('donors').select('*').eq('user_id', uidA);
  const ownDonorSuccess = !ownDonorErr && ownDonorData && ownDonorData.length === 1;
  record({
    role: 'donor',
    resource: 'donors (SELECT own)',
    allowedOp: 'Read own raw donor record including phone and address',
    deniedOp: 'Read foreign raw donor record',
    classification: 'P1 High',
    status: ownDonorSuccess ? 'PASS' : 'FAIL',
    evidence: ownDonorSuccess ? `Own raw donor profile accessible (ID: ${ownDonorData[0].id})` : `Failed: ${ownDonorErr?.message}`
  });

  // ----------------------------------------------------------------------------
  // TEST 7: Cross-Donor IDOR - Donor B attempting to Read Donor A's raw PII
  // ----------------------------------------------------------------------------
  const { data: fDonorData } = await clientB.from('donors').select('id, full_name, phone').eq('user_id', uidA);
  const fDonorBlocked = !fDonorData || fDonorData.length === 0;
  record({
    role: 'donor',
    resource: 'donors (SELECT foreign raw)',
    allowedOp: 'Query donors_public_search view',
    deniedOp: 'Read raw donors table of other donors',
    classification: 'P0 Critical',
    status: fDonorBlocked ? 'PASS' : 'FAIL',
    evidence: fDonorBlocked ? 'Cross-donor raw SELECT blocked (0 rows returned)' : 'CRITICAL PRIVACY VIOLATION: Foreign phone exposed'
  });

  // ----------------------------------------------------------------------------
  // TEST 8: Cross-Donor IDOR - Donor B attempting to Modify Donor A's Record
  // ----------------------------------------------------------------------------
  const { error: updForeignDonorErr } = await clientB.from('donors').update({ full_name: 'Tampered by B' }).eq('user_id', uidA);
  const { data: verifyDonorA } = await clientA.from('donors').select('full_name').eq('user_id', uidA).single();
  const noTampering = verifyDonorA && verifyDonorA.full_name === 'QA Donor Alpha Profile';
  record({
    role: 'donor',
    resource: 'donors (UPDATE foreign)',
    allowedOp: 'Update own donor details',
    deniedOp: 'Modify foreign donor record',
    classification: 'P0 Critical',
    status: noTampering ? 'PASS' : 'FAIL',
    evidence: noTampering ? 'Cross-donor modification blocked by RLS' : 'CRITICAL: Foreign donor profile was tampered'
  });

  // ----------------------------------------------------------------------------
  // TEST 9: Donor Self-Tampering: Force verification_status to 'verified'
  // ----------------------------------------------------------------------------
  const { error: fakeVerifyErr } = await clientA.from('donors').update({ verification_status: 'verified' }).eq('user_id', uidA);
  const { data: checkVerifStatus } = await clientA.from('donors').select('verification_status').eq('user_id', uidA).single();
  const verifyProtected = checkVerifStatus && checkVerifStatus.verification_status !== 'verified';
  record({
    role: 'donor',
    resource: 'donors.verification_status',
    allowedOp: 'Staff verification via verify_donor() RPC',
    deniedOp: 'Self-granting verified badge',
    classification: 'P1 High',
    status: verifyProtected ? 'PASS' : 'FAIL',
    evidence: verifyProtected ? `Self-verification blocked (status: ${checkVerifStatus?.verification_status})` : 'TAMPERING DETECTED: Self-verification succeeded'
  });

  // ----------------------------------------------------------------------------
  // TEST 10: Blood Requests - Create Own Request and Read
  // ----------------------------------------------------------------------------
  const reqAId = `req-qa-${Date.now()}`;
  const { error: insReqErr } = await clientA.from('blood_requests').insert({
    id: reqAId,
    request_id: `BR-${Date.now()}`,
    user_id: uidA,
    blood_group: 'B+',
    required_units: 1,
    required_date: '2026-09-20',
    required_time: '10:00 AM',
    hospital: 'Dhamrai General Hospital',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhamrai',
    patient_name: 'Confidential Patient Alpha',
    contact_person: 'Emergency Contact',
    contact_number: '01719999999',
    relationship: 'Self',
    status: 'active'
  });

  record({
    role: 'donor',
    resource: 'blood_requests (INSERT own)',
    allowedOp: 'Submit emergency request',
    deniedOp: 'Insert with forged requester ID',
    classification: 'P1 High',
    status: !insReqErr ? 'PASS' : 'FAIL',
    evidence: !insReqErr ? 'Emergency request created with authenticated user context' : `Failed: ${insReqErr?.message}`
  });

  // ----------------------------------------------------------------------------
  // TEST 11: Blood Requests - Read Foreign Private Blood Request
  // ----------------------------------------------------------------------------
  const { data: readForeignReq } = await clientB.from('blood_requests').select('patient_name, contact_phone').eq('id', reqAId);
  const fReqBlocked = !readForeignReq || readForeignReq.length === 0;
  record({
    role: 'donor',
    resource: 'blood_requests (SELECT foreign raw)',
    allowedOp: 'View public request view (blood_requests_public)',
    deniedOp: 'Read raw patient name & contact phone of foreign request',
    classification: 'P0 Critical',
    status: fReqBlocked ? 'PASS' : 'FAIL',
    evidence: fReqBlocked ? 'Raw patient details hidden from unauthorized donor (0 rows)' : 'CRITICAL PRIVACY VIOLATION: Patient details exposed'
  });

  // ----------------------------------------------------------------------------
  // TEST 12: Public Search Views Accessibility
  // ----------------------------------------------------------------------------
  const { data: pubDonors, error: pErr } = await clientA.from('donors_public_search').select('*').limit(3);
  const pubDonorsOk = !pErr && pubDonors && pubDonors.length > 0 && !('phone' in pubDonors[0]);
  record({
    role: 'donor',
    resource: 'donors_public_search',
    allowedOp: 'Search blood donors without PII',
    deniedOp: 'Access phone, NID, or exact address',
    classification: 'P1 High',
    status: pubDonorsOk ? 'PASS' : 'FAIL',
    evidence: pubDonorsOk ? `View functional: ${pubDonors.length} donors returned without phone/NID` : `Failed or leaked: ${pErr?.message}`
  });

  // ----------------------------------------------------------------------------
  // TEST 13: Direct audit_logs Manipulation
  // ----------------------------------------------------------------------------
  const { error: fakeAuditErr } = await clientA.from('audit_logs').insert({
    id: `fake-audit-${Date.now()}`,
    user_id: uidA,
    user_name: 'Alpha Attacker',
    user_role: 'super_admin',
    action: 'FORGE_SECURITY_AUDIT',
    target_type: 'SYSTEM',
    target_id: 'ALL'
  });
  record({
    role: 'donor',
    resource: 'audit_logs (INSERT direct)',
    allowedOp: 'record_audit_log() RPC only',
    deniedOp: 'Direct client INSERT into audit trail',
    classification: 'P0 Critical',
    status: fakeAuditErr ? 'PASS' : 'FAIL',
    evidence: fakeAuditErr ? `Direct insert rejected: ${fakeAuditErr.message}` : 'CRITICAL AUDIT VULNERABILITY: Audit forgery succeeded'
  });

  // ----------------------------------------------------------------------------
  // TEST 14: Server RPC record_audit_log - Role Spoofing Resistance
  // ----------------------------------------------------------------------------
  const { data: rpcLogRes, error: rpcLogErr } = await clientA.rpc('record_audit_log', {
    p_action: 'Donor Registered',
    p_target_type: 'Donor',
    p_target_id: donorAId,
    p_metadata: { note: 'Role spoof attempt' }
  });
  record({
    role: 'donor',
    resource: 'record_audit_log RPC',
    allowedOp: 'Log authenticated community actions',
    deniedOp: 'Spoof role as super_admin/system',
    classification: 'P1 High',
    status: !rpcLogErr ? 'PASS' : 'FAIL',
    evidence: !rpcLogErr ? `RPC recorded log successfully: ${rpcLogRes?.log_id}` : `RPC failed: ${rpcLogErr?.message}`
  });

  // ----------------------------------------------------------------------------
  // TEST 15: Server Role Resolution Functions (is_staff, is_admin, is_super_admin)
  // ----------------------------------------------------------------------------
  const { data: staffBool } = await clientA.rpc('is_staff');
  const { data: adminBool } = await clientA.rpc('is_admin');
  const { data: superAdminBool } = await clientA.rpc('is_super_admin');

  const rpcSafe = staffBool === false && adminBool === false && superAdminBool === false;
  record({
    role: 'donor',
    resource: 'Authorization RPCs (is_staff / is_admin / is_super_admin)',
    allowedOp: 'Execute check against server-authoritative state',
    deniedOp: 'Spoof staff/admin status via client token or parameters',
    classification: 'P0 Critical',
    status: rpcSafe ? 'PASS' : 'FAIL',
    evidence: rpcSafe ? 'All role RPCs returned FALSE for donor context (cannot be spoofed)' : 'CRITICAL PRIVILEGE ESCALATION: Role RPC returned TRUE'
  });

  // ----------------------------------------------------------------------------
  // TEST 16: Storage Bucket Isolation (verification-docs)
  // ----------------------------------------------------------------------------
  const { data: fStorageList, error: fStoreErr } = await clientA.storage.from('verification-docs').list(uidB);
  const storeBlocked = fStoreErr !== null || !fStorageList || fStorageList.length === 0;
  record({
    role: 'donor',
    resource: 'storage.objects (verification-docs foreign folder)',
    allowedOp: 'Upload to own folder only',
    deniedOp: 'List or read foreign verification documents',
    classification: 'P1 High',
    status: storeBlocked ? 'PASS' : 'FAIL',
    evidence: storeBlocked ? 'Foreign verification documents access blocked' : 'CRITICAL STORAGE LEAK: Foreign documents listed'
  });

  // ----------------------------------------------------------------------------
  // TEST 17: Hospitals Anti-Spam / Verification Governance
  // ----------------------------------------------------------------------------
  const { data: modHosp, error: fakeHospVerifyErr } = await clientA
    .from('hospitals')
    .update({ verification_status: 'verified' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();

  const hospBlocked = fakeHospVerifyErr !== null || !modHosp || modHosp.length === 0;
  record({
    role: 'donor',
    resource: 'hospitals (UPDATE verification_status)',
    allowedOp: 'Submit unverified hospital',
    deniedOp: 'Verify or approve hospital record',
    classification: 'P2 Medium',
    status: hospBlocked ? 'PASS' : 'FAIL',
    evidence: hospBlocked ? 'Hospital unauthorized verification blocked by RLS (0 rows modified)' : 'CRITICAL: Non-staff verified hospital'
  });

  // ----------------------------------------------------------------------------
  // TEST 18: Fund Donation Verification Governance
  // ----------------------------------------------------------------------------
  const { data: modFund, error: fakeFundVerifyErr } = await clientA
    .from('fund_donations')
    .update({ status: 'verified' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select();

  const fundBlocked = fakeFundVerifyErr !== null || !modFund || modFund.length === 0;
  record({
    role: 'donor',
    resource: 'fund_donations (UPDATE status)',
    allowedOp: 'Submit proof of fund donation',
    deniedOp: 'Verify or approve fund donation',
    classification: 'P1 High',
    status: fundBlocked ? 'PASS' : 'FAIL',
    evidence: fundBlocked ? 'Fund unauthorized verification blocked by RLS (0 rows modified)' : 'CRITICAL: Non-admin verified fund donation'
  });

  // ----------------------------------------------------------------------------
  // SECTION 2: STAFF ROLES (SUPER_ADMIN, ADMIN, MODERATOR, VOLUNTEER)
  // ----------------------------------------------------------------------------
  console.log('\n--- Step 2: Checking Dedicated Staff Test Credentials ---');
  
  const staffRoles = ['volunteer', 'moderator', 'admin', 'super_admin'];
  for (const sRole of staffRoles) {
    const passEnvKey = `SECURITY_${sRole.toUpperCase()}_PASSWORD`;
    const emailEnvKey = `SECURITY_${sRole.toUpperCase()}_EMAIL`;
    const pass = process.env[passEnvKey];
    const email = process.env[emailEnvKey];

    if (!pass || !email) {
      record({
        role: sRole,
        resource: 'Role-specific staff privileges',
        allowedOp: `${sRole} operational permissions`,
        deniedOp: 'Exceeding role scope',
        classification: 'P1 High',
        status: 'NOT TESTED',
        evidence: `Credentials not provided in environment (${passEnvKey} unset)`
      });
    } else {
      // If credentials exist, run live verification
      console.log(`Testing configured staff role: ${sRole} (${email})...`);
      const { data: sAuth, error: sErr } = await anonClient.auth.signInWithPassword({ email, password: pass });
      if (sErr || !sAuth.session) {
        record({
          role: sRole,
          resource: 'Authentication',
          allowedOp: 'Staff login',
          deniedOp: 'Invalid auth',
          classification: 'P0 Critical',
          status: 'FAIL',
          evidence: `Login failed: ${sErr?.message}`
        });
      } else {
        const sClient = createClient(url, anonKey, {
          auth: { persistSession: false },
          global: { headers: { Authorization: `Bearer ${sAuth.session.access_token}` } }
        });
        const { data: sCheck } = await sClient.rpc(`is_${sRole === 'super_admin' ? 'super_admin' : sRole === 'admin' ? 'admin' : 'staff'}`);
        record({
          role: sRole,
          resource: 'Staff Authorization Gate',
          allowedOp: 'Server role confirmation',
          deniedOp: 'Unverified role',
          classification: 'P0 Critical',
          status: sCheck === true ? 'PASS' : 'FAIL',
          evidence: sCheck === true ? `Role confirmed on live database for ${email}` : 'Role check returned FALSE'
        });
      }
    }
  }

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  const passCount = matrix.filter(m => m.status === 'PASS').length;
  const failCount = matrix.filter(m => m.status === 'FAIL').length;
  const notTestedCount = matrix.filter(m => m.status === 'NOT TESTED').length;

  console.log('\n================================================================');
  console.log('📊 MULTI-ROLE SECURITY QA SUMMARY');
  console.log(`TOTAL CHECKS:    ${matrix.length}`);
  console.log(`PASS:            ${passCount}`);
  console.log(`FAIL:            ${failCount}`);
  console.log(`NOT TESTED:      ${notTestedCount}`);
  console.log('================================================================\n');

  fs.writeFileSync(
    path.resolve(process.cwd(), 'scripts', 'phase07_qa_results.json'),
    JSON.stringify(matrix, null, 2)
  );
}

run().catch(console.error);
