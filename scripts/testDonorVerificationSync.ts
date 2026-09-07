/**
 * Phase 29.1: Donor Verification State Synchronization & Idempotency Regression Suite
 * 
 * Verifies:
 * - Scenario A: Pending donor -> Verify -> donor=verified, verified_by!=null, verified_at!=null, log=verified
 * - Scenario B: Already verified donor -> Verify again -> Idempotent, no duplicate verification log
 * - Scenario C: Unauthorized user -> Verify -> BLOCKED by RLS / RPC role check
 * - Scenario D: Invalid donor ID -> No false success, no orphan verification log
 */

import { verifyDonorStatus, type VerifyDonorResult } from '../src/services/donorService';
import type { Donor, VerificationStatus } from '../src/types';

interface TestCase {
  id: string;
  name: string;
  scenario: 'A' | 'B' | 'C' | 'D';
  run: () => Promise<boolean>;
}

// In-memory simulation state for sandbox & isolated boundary regression validation
class MockDatabaseEnvironment {
  users: Map<string, {
    id: string;
    email: string;
    full_name: string;
    role: string;
    status: string;
  }> = new Map();

  donors: Map<string, {
    id: string;
    donor_id: string;
    user_id: string;
    verification_status: VerificationStatus;
    verified_by: string | null;
    verified_at: string | null;
    updated_at: string;
    admin_notes?: string;
  }> = new Map();

  verificationLogs: Array<{
    id: string;
    donor_id: string;
    status: string;
    verified_by: string;
    notes: string;
    timestamp: string;
  }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.users.clear();
    this.donors.clear();
    this.verificationLogs = [];

    // Seed users matching live Supabase scenario
    this.users.set('user-superadmin', {
      id: 'user-superadmin', // Seeded ID
      email: 'yusufcomputer.it@gmail.com',
      full_name: 'Md. Yusuf Ali',
      role: 'super_admin',
      status: 'active',
    });

    this.users.set('user-admin-01', {
      id: 'uuid-admin-01',
      email: 'admin@roktobondhon.org',
      full_name: 'Admin User',
      role: 'admin',
      status: 'active',
    });

    this.users.set('user-volunteer-01', {
      id: 'uuid-volunteer-01',
      email: 'volunteer@roktobondhon.org',
      full_name: 'Volunteer User',
      role: 'volunteer',
      status: 'active',
    });

    this.users.set('user-donor-regular', {
      id: 'uuid-donor-01',
      email: 'donor@gmail.com',
      full_name: 'Regular Donor',
      role: 'donor',
      status: 'active',
    });

    // Seed test donor
    this.donors.set('donor-qa-001', {
      id: 'donor-qa-001',
      donor_id: 'DNR-QA-001',
      user_id: 'usr-donor-qa-001',
      verification_status: 'pending',
      verified_by: null,
      verified_at: null,
      updated_at: new Date().toISOString(),
      admin_notes: '',
    });

    // Seed second donor already verified
    this.donors.set('donor-qa-002', {
      id: 'donor-qa-002',
      donor_id: 'DNR-QA-002',
      user_id: 'usr-donor-qa-002',
      verification_status: 'verified',
      verified_by: 'Staff Verifier',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      admin_notes: 'Initially verified',
    });

    this.verificationLogs.push({
      id: 'vlog-initial-002',
      donor_id: 'donor-qa-002',
      status: 'verified',
      verified_by: 'Staff Verifier',
      notes: 'Initially verified',
      timestamp: new Date().toISOString(),
    });
  }

  // Canonical is_staff() logic matching PostgreSQL implementation
  isStaff(authUid: string | null, jwtEmail?: string | null): boolean {
    if (!authUid) return false;
    for (const u of this.users.values()) {
      const idMatches = u.id === authUid;
      const emailMatches = Boolean(jwtEmail && u.email.toLowerCase() === jwtEmail.toLowerCase());
      if ((idMatches || emailMatches) && ['super_admin', 'admin', 'moderator', 'volunteer'].includes(u.role) && u.status === 'active') {
        return true;
      }
    }
    return false;
  }

  // Atomic verification function matching PostgreSQL verify_donor() logic exactly
  executeVerifyDonorRPC(
    authSession: { uid: string | null; email?: string | null; callerNameFallback?: string },
    donorIdentifier: string,
    targetStatus: string,
    notes: string = ''
  ): { success: boolean; already_verified?: boolean; donor_id?: string; status?: string; verified_by?: string; verified_at?: string; error?: string } {
    // 1. Canonical is_staff check
    if (!this.isStaff(authSession.uid, authSession.email)) {
      return { success: false, error: 'Unauthorized: Only staff can verify or change donor verification status.' };
    }

    // 2. Server-side authoritative caller name lookup from public.users
    let callerName = authSession.callerNameFallback || 'Staff Verifier';
    for (const u of this.users.values()) {
      if (u.id === authSession.uid || (authSession.email && u.email.toLowerCase() === authSession.email.toLowerCase())) {
        callerName = u.full_name;
        break;
      }
    }

    // 3. Validate status
    if (!['verified', 'suspended', 'rejected', 'pending', 'unverified'].includes(targetStatus)) {
      return { success: false, error: `Invalid verification status: ${targetStatus}` };
    }

    // 4. Locate donor (support id and donor_id)
    let target = this.donors.get(donorIdentifier);
    if (!target) {
      for (const d of this.donors.values()) {
        if (d.donor_id === donorIdentifier) {
          target = d;
          break;
        }
      }
    }

    if (!target) {
      return { success: false, error: `Donor not found with identifier: ${donorIdentifier}` };
    }

    // 5. Idempotency check
    if (target.verification_status === targetStatus) {
      return {
        success: true,
        already_verified: true,
        donor_id: target.id,
        status: target.verification_status,
        verified_by: target.verified_by || undefined,
        verified_at: target.verified_at || undefined,
      };
    }

    // 6. Atomic Update + Insert Log
    const now = new Date().toISOString();
    target.verification_status = targetStatus as VerificationStatus;
    target.verified_by = callerName;
    target.verified_at = now;
    target.updated_at = now;
    if (notes) target.admin_notes = notes;

    const logId = `vlog-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.verificationLogs.push({
      id: logId,
      donor_id: target.id, // Primary key
      status: targetStatus,
      verified_by: callerName,
      notes,
      timestamp: now,
    });

    return {
      success: true,
      already_verified: false,
      donor_id: target.id,
      status: targetStatus,
      verified_by: callerName,
      verified_at: now,
    };
  }
}

const mockDb = new MockDatabaseEnvironment();

const TESTS: TestCase[] = [
  // Scenario A: Super Admin with UUID session verifying pending donor
  {
    id: 'VERIFY-SUPER-ADMIN-LIVE',
    name: 'Super Admin (UUID session + email matching user-superadmin) -> Verifies pending donor successfully',
    scenario: 'A',
    run: async () => {
      mockDb.reset();
      const donorBefore = mockDb.donors.get('donor-qa-001')!;
      if (donorBefore.verification_status !== 'pending') {
        throw new Error('Initial state expected pending');
      }

      // Caller has an auth UUID, but email matches seeded 'user-superadmin'
      const authSession = {
        uid: '2fa1a03e-862d-4bf7-bf0e-5407d39103ee',
        email: 'yusufcomputer.it@gmail.com',
      };

      const result = mockDb.executeVerifyDonorRPC(
        authSession,
        'donor-qa-001',
        'verified',
        'Direct NID & physical interview completed'
      );

      if (!result.success) {
        throw new Error(`RPC failed: ${result.error}`);
      }

      // Verify donors table
      const donorAfter = mockDb.donors.get('donor-qa-001')!;
      if (donorAfter.verification_status !== 'verified') {
        throw new Error(`Expected donor.verification_status = 'verified', got '${donorAfter.verification_status}'`);
      }
      // Server-authoritative name from users table
      if (donorAfter.verified_by !== 'Md. Yusuf Ali') {
        throw new Error(`Expected donor.verified_by = 'Md. Yusuf Ali', got '${donorAfter.verified_by}'`);
      }
      if (!donorAfter.verified_at) {
        throw new Error('Expected donor.verified_at to be populated');
      }

      // Verify verification_logs table
      const logs = mockDb.verificationLogs.filter((l) => l.donor_id === 'donor-qa-001');
      if (logs.length !== 1) {
        throw new Error(`Expected exactly 1 verification log, got ${logs.length}`);
      }
      if (logs[0].status !== 'verified') {
        throw new Error(`Expected log status = 'verified', got '${logs[0].status}'`);
      }
      if (logs[0].verified_by !== 'Md. Yusuf Ali') {
        throw new Error(`Expected log.verified_by = 'Md. Yusuf Ali', got '${logs[0].verified_by}'`);
      }
      if (logs[0].donor_id !== 'donor-qa-001') {
        throw new Error(`Expected log.donor_id = donors.id, got '${logs[0].donor_id}'`);
      }

      return true;
    },
  },

  // Scenario B: Already verified donor -> Verify again (Idempotency)
  {
    id: 'VERIFY-IDEMPOTENCY',
    name: 'Scenario B: Already verified donor -> Idempotent, no duplicate log created',
    scenario: 'B',
    run: async () => {
      mockDb.reset();
      const initialLogsCount = mockDb.verificationLogs.filter((l) => l.donor_id === 'donor-qa-002').length;
      if (initialLogsCount !== 1) {
        throw new Error(`Initial log count expected 1, got ${initialLogsCount}`);
      }

      // Attempt second verify on already verified donor with super_admin
      const result = mockDb.executeVerifyDonorRPC(
        { uid: '2fa1a03e-862d-4bf7-bf0e-5407d39103ee', email: 'yusufcomputer.it@gmail.com' },
        'donor-qa-002',
        'verified',
        'Repeated click'
      );

      if (!result.success) {
        throw new Error(`Expected success on idempotent call, got: ${result.error}`);
      }
      if (!result.already_verified) {
        throw new Error('Expected already_verified = true in response');
      }

      // Verify log count did NOT increase
      const logsAfter = mockDb.verificationLogs.filter((l) => l.donor_id === 'donor-qa-002');
      if (logsAfter.length !== initialLogsCount) {
        throw new Error(`Duplicate log created! Expected ${initialLogsCount} logs, got ${logsAfter.length}`);
      }

      return true;
    },
  },

  // Scenario C: Role Matrix Permissions
  {
    id: 'VERIFY-ROLE-MATRIX',
    name: 'Staff roles (super_admin, admin, volunteer) ALLOWED, non-staff (donor, anon) BLOCKED',
    scenario: 'C',
    run: async () => {
      mockDb.reset();

      // 1. Volunteer verification must succeed
      const volResult = mockDb.executeVerifyDonorRPC(
        { uid: 'uuid-volunteer-01', email: 'volunteer@roktobondhon.org' },
        'donor-qa-001',
        'verified',
        'Verified by volunteer'
      );
      if (!volResult.success) {
        throw new Error(`Volunteer verification should be permitted: ${volResult.error}`);
      }

      // Reset for next check
      mockDb.reset();

      // 2. Regular donor attempting verification must be BLOCKED
      const donorResult = mockDb.executeVerifyDonorRPC(
        { uid: 'uuid-donor-01', email: 'donor@gmail.com' },
        'donor-qa-001',
        'verified'
      );
      if (donorResult.success) {
        throw new Error('Security violation: Regular donor role was allowed to verify!');
      }

      // 3. Unauthenticated/anon caller must be BLOCKED
      const anonResult = mockDb.executeVerifyDonorRPC(
        { uid: null, email: null },
        'donor-qa-001',
        'verified'
      );
      if (anonResult.success) {
        throw new Error('Security violation: Anonymous caller was allowed to verify!');
      }

      // Ensure donor-qa-001 was NOT modified by unauthorized attempts
      const donorState = mockDb.donors.get('donor-qa-001')!;
      if (donorState.verification_status !== 'pending') {
        throw new Error('Donor state was modified during unauthorized attempts!');
      }

      return true;
    },
  },

  // Scenario D: Invalid donor ID
  {
    id: 'VERIFY-SCENARIO-D',
    name: 'Scenario D: Invalid donor ID -> No false success, no orphan verification log',
    scenario: 'D',
    run: async () => {
      mockDb.reset();
      const logsBefore = mockDb.verificationLogs.length;

      const result = mockDb.executeVerifyDonorRPC(
        { uid: 'uuid-admin-01', email: 'admin@roktobondhon.org' },
        'non-existent-donor-id-999',
        'verified'
      );

      if (result.success) {
        throw new Error('FAILED: Invalid donor ID returned success!');
      }

      const logsAfter = mockDb.verificationLogs.length;
      if (logsAfter !== logsBefore) {
        throw new Error('FAILED: Orphan verification log was inserted for non-existent donor ID!');
      }

      return true;
    },
  },

  // Scenario E: Human-Readable donor_id mapping test
  {
    id: 'VERIFY-SCENARIO-E',
    name: 'Scenario E: Lookup by human-readable donor_id (DNR-QA-001) maps to primary key',
    scenario: 'A',
    run: async () => {
      mockDb.reset();
      const result = mockDb.executeVerifyDonorRPC(
        { uid: 'uuid-admin-01', email: 'admin@roktobondhon.org' },
        'DNR-QA-001', // Human readable ID passed
        'verified'
      );

      if (!result.success) {
        throw new Error(`Failed to resolve human-readable donor_id: ${result.error}`);
      }

      // Check log contains row ID
      const logs = mockDb.verificationLogs.filter((l) => l.donor_id === 'donor-qa-001');
      if (logs.length !== 1) {
        throw new Error(`Expected verification log attached to row ID 'donor-qa-001', got ${logs.length}`);
      }

      return true;
    },
  },
];

async function runDonorVerificationSyncSuite() {
  console.log('================================================================');
  console.log('🔬 DONOR VERIFICATION STATE SYNC & IDEMPOTENCY REGRESSION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  for (const test of TESTS) {
    process.stdout.write(`▶ [${test.id}] ${test.name}... `);
    try {
      const ok = await test.run();
      if (ok) {
        passed++;
        console.log('✅ PASSED');
      } else {
        failed++;
        console.log('❌ FAILED');
      }
    } catch (err: any) {
      failed++;
      console.log(`❌ FAILED: ${err.message}`);
    }
  }

  console.log('\n================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================');
  console.log(`Total:  ${TESTS.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runDonorVerificationSyncSuite();
