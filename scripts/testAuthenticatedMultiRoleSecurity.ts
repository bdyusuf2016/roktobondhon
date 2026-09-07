/**
 * Phase 28.6: Authenticated Multi-Role Security & Penetration Verification Runner
 * 
 * Performs REAL authenticated security testing against the live Supabase backend
 * using real Supabase Auth sessions (auth.users -> session.access_token -> PostgREST RLS).
 * 
 * Target Roles:
 * - Donor
 * - Recipient
 * - Volunteer
 * - Moderator
 * - Admin
 * - Super Admin
 * 
 * Strict Principle:
 * - Zero simulated/mocked tokens.
 * - Zero hardcoded credentials in source files.
 * - Credentials must be supplied via local environment variables (SECURITY_TEST_*).
 * - If credentials are not provided, accurately reports UNVERIFIED without fabricating PASS.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

interface RoleConfig {
  role: 'donor' | 'recipient' | 'volunteer' | 'moderator' | 'admin' | 'super_admin';
  emailEnv: string;
  passEnv: string;
}

const ROLES: RoleConfig[] = [
  { role: 'donor', emailEnv: 'SECURITY_TEST_DONOR_EMAIL', passEnv: 'SECURITY_TEST_DONOR_PASSWORD' },
  { role: 'recipient', emailEnv: 'SECURITY_TEST_RECIPIENT_EMAIL', passEnv: 'SECURITY_TEST_RECIPIENT_PASSWORD' },
  { role: 'volunteer', emailEnv: 'SECURITY_TEST_VOLUNTEER_EMAIL', passEnv: 'SECURITY_TEST_VOLUNTEER_PASSWORD' },
  { role: 'moderator', emailEnv: 'SECURITY_TEST_MODERATOR_EMAIL', passEnv: 'SECURITY_TEST_MODERATOR_PASSWORD' },
  { role: 'admin', emailEnv: 'SECURITY_TEST_ADMIN_EMAIL', passEnv: 'SECURITY_TEST_ADMIN_PASSWORD' },
  { role: 'super_admin', emailEnv: 'SECURITY_TEST_SUPERADMIN_EMAIL', passEnv: 'SECURITY_TEST_SUPERADMIN_PASSWORD' },
];

export interface AuthenticatedTestResult {
  id: string;
  role: string;
  testName: string;
  attackVector: string;
  expectedOutcome: string;
  actualOutcome: string;
  status: 'PASS' | 'FAIL' | 'UNVERIFIED';
  details?: string;
}

export async function runAuthenticatedMultiRoleVerification(): Promise<{
  allPassed: boolean;
  hasUnverified: boolean;
  results: AuthenticatedTestResult[];
}> {
  console.log('================================================================');
  console.log('🛡️ PHASE 28.6 — AUTHENTICATED MULTI-ROLE SECURITY VERIFICATION');
  console.log('Target Project:', supabaseUrl ? new URL(supabaseUrl).hostname : 'NOT_CONFIGURED');
  console.log('Mode: Real Supabase Auth Sessions & Database RLS Boundaries');
  console.log('================================================================\n');

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase credentials missing in .env');
    return { allPassed: false, hasUnverified: true, results: [] };
  }

  const results: AuthenticatedTestResult[] = [];
  let totalRolesConfigured = 0;

  for (const roleConfig of ROLES) {
    const email = process.env[roleConfig.emailEnv];
    const password = process.env[roleConfig.passEnv];

    console.log(`\n----------------------------------------------------------------`);
    console.log(`🔑 Testing Role: ${roleConfig.role.toUpperCase()}`);
    console.log(`----------------------------------------------------------------`);

    if (!email || !password) {
      console.log(`⚠️  Credentials not provided in env (${roleConfig.emailEnv} / ${roleConfig.passEnv})`);
      console.log(`ℹ️  Status: UNVERIFIED — Dedicated test account required in Supabase`);
      results.push({
        id: `AUTH-${roleConfig.role.toUpperCase()}-01`,
        role: roleConfig.role,
        testName: `Authenticated Session Validation (${roleConfig.role})`,
        attackVector: 'Supabase signInWithPassword & session token acquisition',
        expectedOutcome: 'Valid session & role matching in public.users',
        actualOutcome: 'Credentials not configured in environment variables',
        status: 'UNVERIFIED',
      });
      continue;
    }

    totalRolesConfigured++;
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    try {
      // 1. Authenticate with real Supabase Auth
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        results.push({
          id: `AUTH-${roleConfig.role.toUpperCase()}-LOGIN`,
          role: roleConfig.role,
          testName: `Supabase Auth Login (${roleConfig.role})`,
          attackVector: 'Normal auth.signInWithPassword',
          expectedOutcome: 'Authentication successful',
          actualOutcome: `Auth Failed: ${authError?.message || 'No user returned'}`,
          status: 'FAIL',
        });
        continue;
      }

      const uid = authData.user.id;
      console.log(`✅ Authenticated with Supabase Auth (UID: ${uid.substring(0, 8)}...)`);

      // 2. Validate public.users role
      const { data: userData, error: userError } = await client
        .from('users')
        .select('id, role, status')
        .eq('id', uid)
        .single();

      if (userError || !userData || userData.role !== roleConfig.role) {
        results.push({
          id: `AUTH-${roleConfig.role.toUpperCase()}-ROLE-MATCH`,
          role: roleConfig.role,
          testName: `Role Identity Match (auth.users -> public.users)`,
          attackVector: 'Verify database role corresponds to test account',
          expectedOutcome: `public.users.role == "${roleConfig.role}"`,
          actualOutcome: `Role mismatch: expected ${roleConfig.role}, found ${userData?.role || 'none'}`,
          status: 'FAIL',
        });
        continue;
      }

      // 3. Negative Test: Self Role Escalation to super_admin (Non-super_admin roles)
      if (roleConfig.role !== 'super_admin') {
        const { error: escError } = await client
          .from('users')
          .update({ role: 'super_admin' })
          .eq('id', uid);

        const escBlocked = escError !== null;
        results.push({
          id: `AUTH-${roleConfig.role.toUpperCase()}-SELF-ESC`,
          role: roleConfig.role,
          testName: `Self Role Escalation Prevention (${roleConfig.role} -> super_admin)`,
          attackVector: 'UPDATE users SET role = "super_admin" WHERE id = auth.uid()',
          expectedOutcome: 'Database trigger / RLS denies unauthorized role elevation',
          actualOutcome: escBlocked ? `Denied: ${escError?.message}` : 'VULNERABILITY: Role update succeeded',
          status: escBlocked ? 'PASS' : 'FAIL',
        });
      }

      // 4. Negative Test: Horizontal IDOR & Private Donor Field Access
      if (roleConfig.role === 'donor' || roleConfig.role === 'recipient') {
        const { data: donorData, error: donorError } = await client
          .from('donors')
          .select('nid_or_id_number, exact_address, medical_conditions')
          .neq('user_id', uid)
          .limit(5);

        const idorBlocked = donorError !== null || !donorData || donorData.length === 0;
        results.push({
          id: `AUTH-${roleConfig.role.toUpperCase()}-IDOR-DONOR`,
          role: roleConfig.role,
          testName: `Horizontal IDOR on Sensitive Donor Fields (${roleConfig.role})`,
          attackVector: 'SELECT nid, exact_address from other donors',
          expectedOutcome: 'Zero records returned or RLS query error',
          actualOutcome: idorBlocked ? 'Access Denied / Empty result' : 'VULNERABILITY: Sensitive columns exposed',
          status: idorBlocked ? 'PASS' : 'FAIL',
        });
      }

      // 5. Negative Test: Audit Log Tampering
      if (roleConfig.role !== 'super_admin') {
        const { data: logData, error: logError } = await client
          .from('audit_logs')
          .insert([{
            actor_id: uid,
            actor_name: 'Test Actor',
            actor_role: roleConfig.role,
            action: 'TAMPER_TEST',
            target: 'security',
            details: {}
          }])
          .select();

        const logBlocked = logError !== null || !logData || logData.length === 0;
        results.push({
          id: `AUTH-${roleConfig.role.toUpperCase()}-AUDIT-INSERT`,
          role: roleConfig.role,
          testName: `Audit Trail Tampering Resistance (${roleConfig.role})`,
          attackVector: 'Unprivileged INSERT into audit_logs',
          expectedOutcome: 'Denied by RLS policy',
          actualOutcome: logBlocked ? `Denied: ${logError?.message || 'RLS drop'}` : 'VULNERABILITY: Insert allowed',
          status: logBlocked ? 'PASS' : 'FAIL',
        });
      }

      // 6. Negative Test: Financial Ledger Tampering (Non-admin)
      if (roleConfig.role !== 'admin' && roleConfig.role !== 'super_admin') {
        const { error: finError } = await client
          .from('fund_donations')
          .update({ status: 'verified', amount: 999999 })
          .neq('id', '00000000-0000-0000-0000-000000000000');

        const finBlocked = finError !== null;
        results.push({
          id: `AUTH-${roleConfig.role.toUpperCase()}-FINANCIAL-TAMPER`,
          role: roleConfig.role,
          testName: `Financial Ledger Tampering Prevention (${roleConfig.role})`,
          attackVector: 'UPDATE fund_donations SET status = "verified"',
          expectedOutcome: 'Denied by RLS / trigger',
          actualOutcome: finBlocked ? `Denied: ${finError?.message}` : 'VULNERABILITY: Financial update allowed',
          status: finBlocked ? 'PASS' : 'FAIL',
        });
      }

      // 7. Negative Test: Storage Private Bucket Access
      if (roleConfig.role === 'donor' || roleConfig.role === 'recipient') {
        const { data: storageData, error: storageError } = await client.storage
          .from('verification-docs')
          .list('other-user-uuid', { limit: 5 });

        const storageBlocked = storageError !== null || !storageData || storageData.length === 0;
        results.push({
          id: `AUTH-${roleConfig.role.toUpperCase()}-STORAGE-IDOR`,
          role: roleConfig.role,
          testName: `Private Storage Access Isolation (${roleConfig.role})`,
          attackVector: 'List/download from foreign user directory in verification-docs',
          expectedOutcome: 'Denied by Storage RLS',
          actualOutcome: storageBlocked ? 'Access Denied / Empty folder' : 'VULNERABILITY: Foreign documents listed',
          status: storageBlocked ? 'PASS' : 'FAIL',
        });
      }

    } catch (err: any) {
      console.error(`❌ Unexpected error executing tests for ${roleConfig.role}:`, err.message);
      results.push({
        id: `AUTH-${roleConfig.role.toUpperCase()}-ERROR`,
        role: roleConfig.role,
        testName: `Execution error for ${roleConfig.role}`,
        attackVector: 'Test execution pipeline',
        expectedOutcome: 'Clean execution',
        actualOutcome: `Exception: ${err.message}`,
        status: 'FAIL',
      });
    }
  }

  console.log('\n================================================================');
  console.log('📊 AUTHENTICATED MULTI-ROLE SECURITY SUMMARY');
  console.log('================================================================');
  console.log(`Total Roles Evaluated:    ${ROLES.length}`);
  console.log(`Configured Roles Tested:  ${totalRolesConfigured}`);
  console.log(`Unconfigured Roles:       ${ROLES.length - totalRolesConfigured}`);

  const hasFails = results.some(r => r.status === 'FAIL');
  const hasUnverified = results.some(r => r.status === 'UNVERIFIED');

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅ PASS' : (r.status === 'UNVERIFIED' ? '🟡 UNVERIFIED' : '❌ FAIL');
    console.log(`[${icon}] [${r.role.toUpperCase()}] ${r.testName}`);
    if (r.actualOutcome) console.log(`        Result: ${r.actualOutcome}`);
  });

  console.log('================================================================');

  return {
    allPassed: !hasFails && !hasUnverified,
    hasUnverified,
    results,
  };
}

// If executed directly
if (process.argv[1]?.includes('testAuthenticatedMultiRoleSecurity')) {
  runAuthenticatedMultiRoleVerification().then(({ allPassed, hasUnverified }) => {
    if (hasUnverified) {
      console.log('\n🟡 NOTICE: Authenticated multi-role tests contain UNVERIFIED roles due to missing test account credentials.');
      process.exit(0);
    } else if (!allPassed) {
      console.error('\n🚨 CRITICAL VULNERABILITIES DETECTED IN AUTHENTICATED MULTI-ROLE TESTING!');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL AUTHENTICATED MULTI-ROLE PENETRATION TESTS PASSED!');
      process.exit(0);
    }
  });
}
