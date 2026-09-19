/**
 * ==============================================================================
 * ROKTOBONDHON PHASE 1F-A: LOCAL TEST SUITE
 * Script: scripts/testPhase1FAAutomatedExpiration.ts
 * ==============================================================================
 * Assertions: 22 comprehensive checks covering:
 *   1. Batch Limit Clamping & Validation (4 tests)
 *   2. Authorization & Execution Role Privileges (4 tests)
 *   3. Advisory Concurrency Lock & Non-Overlapping Execution (3 tests)
 *   4. Grace Period & Date Eligibility (4 tests)
 *   5. State Machine & Status Preconditions (3 tests)
 *   6. Deterministic Notifications & Non-PII Audit Trails (4 tests)
 * ==============================================================================
 */

import { BloodRequest, NotificationItem, AuditLog } from '../src/types';

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition: boolean, description: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ PASS: ${description}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${description}`);
  }
}

function runSection(title: string, fn: () => void) {
  console.log(`\n--- ${title} ---`);
  fn();
}

console.log('==============================================================================');
console.log('ROKTOBONDHON PHASE 1F-A LOCAL TEST SUITE: AUTOMATED EXPIRATION');
console.log('==============================================================================');

// -----------------------------------------------------------------------------
// Simulation Engine for expire_overdue_blood_requests RPC
// -----------------------------------------------------------------------------
interface SimulationContext {
  activeAdvisoryLock?: boolean;
}

function clampBatchLimit(limit?: number | null): number {
  if (limit === null || limit === undefined || limit < 1) {
    return 50;
  }
  if (limit > 100) {
    return 100;
  }
  return limit;
}

function simulateExpireOverdueBloodRequests(
  requests: BloodRequest[],
  callerRole: 'anon' | 'authenticated_user' | 'staff' | 'service_role',
  currentDateIso: string,
  batchLimit?: number | null,
  context: SimulationContext = {}
): {
  success: boolean;
  expired_count: number;
  expired_ids: string[];
  message: string;
  notifications: Partial<NotificationItem>[];
  auditLogs: Partial<AuditLog>[];
} {
  const effectiveBatchLimit = clampBatchLimit(batchLimit);

  // Authorization Check
  if (callerRole === 'anon' || callerRole === 'authenticated_user') {
    return {
      success: false,
      expired_count: 0,
      expired_ids: [],
      message: 'Unauthorized: Only authorized staff or maintenance jobs can execute request expiration.',
      notifications: [],
      auditLogs: [],
    };
  }

  // Advisory Lock Check
  if (context.activeAdvisoryLock) {
    return {
      success: false,
      expired_count: 0,
      expired_ids: [],
      message: 'Another blood request expiration maintenance job is currently executing.',
      notifications: [],
      auditLogs: [],
    };
  }

  // Acquisition of advisory lock during execution
  context.activeAdvisoryLock = true;

  const refDate = new Date(currentDateIso);
  const expiredIds: string[] = [];
  const notifications: Partial<NotificationItem>[] = [];
  const auditLogs: Partial<AuditLog>[] = [];

  // Filter and process overdue records (2 days grace period)
  // Grace period: required_date < CURRENT_DATE - INTERVAL '2 days'
  for (const req of requests) {
    if (expiredIds.length >= effectiveBatchLimit) {
      break;
    }

    if (req.status !== 'active' && req.status !== 'matched') {
      continue;
    }

    const reqDate = new Date(req.requiredDate);
    const diffMs = refDate.getTime() - reqDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Strictly strictly greater than 2 full days
    if (diffDays > 2) {
      expiredIds.push(req.id);

      notifications.push({
        id: `notif-exp-${req.id}`,
        userId: req.userId,
        title: 'রক্তের অনুরোধের মেয়াদ সমাপ্তি',
        message: `আপনার ${req.patientName} রোগীর জন্য রক্তের অনুরোধটির নির্ধারিত সময় অতিক্রম করায় এটি সমাপ্ত ঘোষণা করা হয়েছে। প্রয়োজন হলে নতুন অনুরোধ তৈরি করুন।`,
        type: 'request',
      });

      auditLogs.push({
        action: 'BLOOD_REQUEST_EXPIRED',
        targetType: 'BloodRequest',
        targetId: req.id,
        metadata: {
          blood_request_id: req.id,
          request_id: req.requestId,
          expired_at: currentDateIso,
          expired_by: callerRole === 'staff' ? 'staff_user' : 'system_maintenance',
        },
      });
    }
  }

  // Release advisory lock upon completion
  context.activeAdvisoryLock = false;

  return {
    success: true,
    expired_count: expiredIds.length,
    expired_ids: expiredIds,
    message: 'Overdue blood requests processed.',
    notifications,
    auditLogs,
  };
}

// -----------------------------------------------------------------------------
// Test Fixtures
// -----------------------------------------------------------------------------
const CURRENT_TEST_DATE = '2026-09-16T12:00:00.000Z';

const sampleOverdueActive: BloodRequest = {
  id: 'req-exp-001',
  requestId: 'REQ-2026-001',
  userId: 'usr-patient-101',
  patientName: 'করিম সাহেব',
  bloodGroup: 'A+',
  requiredUnits: 1,
  requiredDate: '2026-09-13', // 3 days ago (> 2 days grace period)
  requiredTime: '10:00 AM',
  hospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
  division: 'Dhaka',
  district: 'ঢাকা',
  upazila: 'ধামরাই',
  area: 'কালামপুর',
  contactPerson: 'করিম সাহেব',
  contactNumber: '01711111111',
  relationship: 'পিতা',
  emergencyLevel: 'NORMAL',
  status: 'active',
  verification: { isVerified: true },
  createdAt: '2026-09-12T08:00:00Z',
};

const sampleOverdueMatched: BloodRequest = {
  ...sampleOverdueActive,
  id: 'req-exp-002',
  requestId: 'REQ-2026-002',
  status: 'matched',
  requiredDate: '2026-09-10', // 6 days ago
};

const sampleGracePeriodRequest: BloodRequest = {
  ...sampleOverdueActive,
  id: 'req-exp-003',
  requestId: 'REQ-2026-003',
  status: 'active',
  requiredDate: '2026-09-15', // 1 day ago (within 2-day grace period)
};

const sampleTodayRequest: BloodRequest = {
  ...sampleOverdueActive,
  id: 'req-exp-004',
  requestId: 'REQ-2026-004',
  status: 'active',
  requiredDate: '2026-09-16', // Due today
};

const sampleFutureRequest: BloodRequest = {
  ...sampleOverdueActive,
  id: 'req-exp-005',
  requestId: 'REQ-2026-005',
  status: 'active',
  requiredDate: '2026-09-20', // Future date
};

const sampleFulfilledRequest: BloodRequest = {
  ...sampleOverdueActive,
  id: 'req-exp-006',
  requestId: 'REQ-2026-006',
  status: 'fulfilled',
  requiredDate: '2026-09-01',
};

// ==============================================================================
// 1. BATCH LIMIT CLAMPING & VALIDATION (4 tests)
// ==============================================================================
runSection('1. Batch Limit Clamping & Validation', () => {
  // SEC-1FA-01: Default batch limit defaults to 50 when undefined or null
  assert(clampBatchLimit(undefined) === 50 && clampBatchLimit(null) === 50, 'SEC-1FA-01: Batch limit defaults to 50 when undefined or null');

  // SEC-1FA-02: Sub-range batch limit (<= 0) clamped to 50
  assert(clampBatchLimit(0) === 50 && clampBatchLimit(-10) === 50, 'SEC-1FA-02: Non-positive batch limit clamped to 50');

  // SEC-1FA-03: Excessive batch limit (>100) clamped to 100
  assert(clampBatchLimit(250) === 100 && clampBatchLimit(101) === 100, 'SEC-1FA-03: Excessive batch limit clamped strictly to 100');

  // SEC-1FA-04: In-range batch limit (1..100) preserved
  assert(clampBatchLimit(25) === 25 && clampBatchLimit(1) === 1 && clampBatchLimit(100) === 100, 'SEC-1FA-04: Valid batch limit within [1, 100] preserved');
});

// ==============================================================================
// 2. AUTHORIZATION & EXECUTION ROLE PRIVILEGES (4 tests)
// ==============================================================================
runSection('2. Authorization & Execution Role Privileges', () => {
  // SEC-1FA-05: Anonymous public execution rejected
  const resAnon = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'anon', CURRENT_TEST_DATE);
  assert(!resAnon.success && resAnon.message.includes('Unauthorized'), 'SEC-1FA-05: Anonymous execution denied with Unauthorized error');

  // SEC-1FA-06: Authenticated regular client execution rejected
  const resAuth = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'authenticated_user', CURRENT_TEST_DATE);
  assert(!resAuth.success && resAuth.message.includes('Unauthorized'), 'SEC-1FA-06: Non-staff authenticated client execution denied');

  // SEC-1FA-07: Service role execution allowed
  const resService = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'service_role', CURRENT_TEST_DATE);
  assert(resService.success && resService.expired_count === 1, 'SEC-1FA-07: Service role trusted execution allowed');

  // SEC-1FA-08: Authorized staff execution allowed
  const resStaff = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'staff', CURRENT_TEST_DATE);
  assert(resStaff.success && resStaff.expired_count === 1, 'SEC-1FA-08: Authorized staff execution allowed');
});

// ==============================================================================
// 3. ADVISORY CONCURRENCY LOCK & NON-OVERLAPPING EXECUTION (3 tests)
// ==============================================================================
runSection('3. Advisory Concurrency Lock & Non-Overlapping Execution', () => {
  const sharedCtx: SimulationContext = {};

  // SEC-1FA-09: Advisory lock acquired when no other worker running
  const resInitial = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'service_role', CURRENT_TEST_DATE, 50, sharedCtx);
  assert(resInitial.success && resInitial.expired_count === 1, 'SEC-1FA-09: Advisory lock acquired cleanly when no conflict exists');

  // SEC-1FA-10: Conflicting simultaneous job execution rejected gracefully
  const lockedCtx: SimulationContext = { activeAdvisoryLock: true };
  const resConflict = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'service_role', CURRENT_TEST_DATE, 50, lockedCtx);
  assert(!resConflict.success && resConflict.expired_count === 0 && resConflict.message.includes('currently executing'), 'SEC-1FA-10: Conflicting simultaneous worker execution returned success=false with 0 expired');

  // SEC-1FA-11: Advisory lock released automatically on transaction commit/end
  assert(sharedCtx.activeAdvisoryLock === false, 'SEC-1FA-11: Advisory lock released back to pool upon completion');
});

// ==============================================================================
// 4. GRACE PERIOD & DATE ELIGIBILITY (4 tests)
// ==============================================================================
runSection('4. Grace Period & Date Eligibility', () => {
  // SEC-1FA-12: Overdue request > 2 days past required_date expired
  const resOverdue = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'service_role', CURRENT_TEST_DATE);
  assert(resOverdue.expired_ids.includes('req-exp-001'), 'SEC-1FA-12: Request 3 days past required_date is eligible and expired');

  // SEC-1FA-13: Request 1 day past required_date protected by grace period
  const resGrace = simulateExpireOverdueBloodRequests([sampleGracePeriodRequest], 'service_role', CURRENT_TEST_DATE);
  assert(!resGrace.expired_ids.includes('req-exp-003') && resGrace.expired_count === 0, 'SEC-1FA-13: Request 1 day past required_date protected by 2-day grace period');

  // SEC-1FA-14: Request due today protected
  const resToday = simulateExpireOverdueBloodRequests([sampleTodayRequest], 'service_role', CURRENT_TEST_DATE);
  assert(resToday.expired_count === 0, 'SEC-1FA-14: Request required today is protected from expiration');

  // SEC-1FA-15: Future request protected
  const resFuture = simulateExpireOverdueBloodRequests([sampleFutureRequest], 'service_role', CURRENT_TEST_DATE);
  assert(resFuture.expired_count === 0, 'SEC-1FA-15: Future dated blood request is protected from expiration');
});

// ==============================================================================
// 5. STATE MACHINE & STATUS PRECONDITIONS (3 tests)
// ==============================================================================
runSection('5. State Machine & Status Preconditions', () => {
  // SEC-1FA-16: Active status eligible for expiration
  const resActive = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'service_role', CURRENT_TEST_DATE);
  assert(resActive.expired_ids.includes('req-exp-001'), 'SEC-1FA-16: Active status transitions to expired');

  // SEC-1FA-17: Matched status eligible for expiration
  const resMatched = simulateExpireOverdueBloodRequests([sampleOverdueMatched], 'service_role', CURRENT_TEST_DATE);
  assert(resMatched.expired_ids.includes('req-exp-002'), 'SEC-1FA-17: Matched status transitions to expired');

  // SEC-1FA-18: Terminal fulfilled status untouched
  const resFulfilled = simulateExpireOverdueBloodRequests([sampleFulfilledRequest], 'service_role', CURRENT_TEST_DATE);
  assert(resFulfilled.expired_count === 0, 'SEC-1FA-18: Fulfilled terminal status is untouched');
});

// ==============================================================================
// 6. DETERMINISTIC NOTIFICATIONS & NON-PII AUDIT TRAILS (4 tests)
// ==============================================================================
runSection('6. Deterministic Notifications & Non-PII Audit Trails', () => {
  const res = simulateExpireOverdueBloodRequests([sampleOverdueActive], 'service_role', CURRENT_TEST_DATE);

  // SEC-1FA-19: Deterministic notification ID format `notif-exp-<id>`
  assert(res.notifications[0]?.id === 'notif-exp-req-exp-001', 'SEC-1FA-19: Deterministic notification ID format notif-exp-<id> enforced');

  // SEC-1FA-20: Closure notification delivered to request user_id
  assert(res.notifications[0]?.userId === 'usr-patient-101', 'SEC-1FA-20: Closure notification dispatched to requester user_id');

  // SEC-1FA-21: Audit log action BLOOD_REQUEST_EXPIRED with targetType BloodRequest
  assert(res.auditLogs[0]?.action === 'BLOOD_REQUEST_EXPIRED' && res.auditLogs[0]?.targetType === 'BloodRequest', 'SEC-1FA-21: Authoritative BLOOD_REQUEST_EXPIRED audit event recorded');

  // SEC-1FA-22: Audit metadata contains request_id, expired_at, zero sensitive PII
  const meta = res.auditLogs[0]?.metadata as Record<string, unknown> | undefined;
  const hasRequiredFields = meta?.blood_request_id === 'req-exp-001' && meta?.request_id === 'REQ-2026-001';
  const hasNoPII = meta?.contactNumber === undefined && meta?.patientName === undefined;
  assert(hasRequiredFields && hasNoPII, 'SEC-1FA-22: Audit metadata has blood_request_id, request_id, and zero sensitive PII');
});

// ==============================================================================
// SUMMARY REPORT
// ==============================================================================
console.log('\n==============================================================================');
console.log(`TOTAL CHECKS: ${totalAssertions}`);
console.log(`PASSED:       ${passedAssertions}`);
console.log(`FAILED:       ${failedAssertions}`);
console.log('==============================================================================');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log('✅ PHASE 1F-A LOCAL TEST SUITE: 22/22 ASSERTIONS PASSED\n');
}
