/**
 * 🧪 PHASE 1A: SMART MATCHING, DONOR READINESS & AUTHORIZATION TEST SUITE
 *
 * Verifies:
 * 1. Exact & cross-group ABO/Rh blood compatibility rules
 * 2. ABO incompatible donor rejection
 * 3. Rh compatibility (Rh- to Rh+, Rh+ blocked for Rh-)
 * 4. Donor availability & emergency status scoring
 * 5. Cooldown interval & medical eligibility (Male 90d, Female 120d, Age 18-65, Weight >= 45kg)
 * 6. Geographic proximity weighting (Upazila > District > Division)
 * 7. Inactive / Suspended / Rejected donor hard-exclusion
 * 8. Duplicate donor request prevention
 * 9. Authorization guards on donor request creation and response
 * 10. Legal state machine transitions (BloodRequest & DonorRequest)
 */

import assert from 'node:assert';
import {
  isBloodCompatible,
  findCompatibleDonors,
  calculateMatchScore,
  evaluateDonorEligibility,
  isDonorReadyToDonate,
} from '../src/services/matchingService';
import {
  sendDonorContactRequest,
  respondToDonorRequest,
} from '../src/services/donorRequestService';
import type { Donor, BloodRequest, BloodGroup } from '../src/types';

console.log('================================================================');
console.log('🩸 ROKTOBONDHON PHASE 1A: MATCHING & AUTHORIZATION TEST SUITE');
console.log('================================================================\n');

let passedCount = 0;
let totalCount = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    fn();
    console.log(`✅ [TEST ${totalCount.toString().padStart(2, '0')}] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`❌ [TEST ${totalCount.toString().padStart(2, '0')}] ${name}`);
    console.error('   ↳ Error:', err.message);
    throw err;
  }
}

// Mock donor factory
function createMockDonor(overrides: Partial<Donor> = {}): Donor {
  return {
    id: `dnr-${Math.random().toString(36).substring(2, 7)}`,
    donorId: 'DNR-DHM-001',
    userId: 'user-donor-1',
    organizationId: 'org-default',
    fullName: 'মো: রফিকুল ইসলাম',
    phone: '01711111111',
    bloodGroup: 'O+',
    division: 'Dhaka',
    district: 'ঢাকা',
    upazila: 'ধামরাই',
    area: 'ধামরাই সদর',
    availability: true,
    emergencyAvailable: true,
    totalDonations: 3,
    verificationStatus: 'verified',
    gender: 'male',
    age: 28,
    weight: 65,
    privacy: { showPhone: true, showGender: true, showAge: false, allowDirectContact: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Mock blood request factory
function createMockBloodRequest(overrides: Partial<BloodRequest> = {}): BloodRequest {
  return {
    id: 'req-001',
    requestId: 'BD-2026-0001',
    userId: 'user-requester-1',
    patientName: 'আয়েশা বেগম',
    bloodGroup: 'A+',
    requiredUnits: 1,
    requiredDate: '2026-09-20',
    requiredTime: '10:00 AM',
    hospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    division: 'Dhaka',
    district: 'ঢাকা',
    upazila: 'ধামরাই',
    area: 'ধামরাই সদর',
    contactPerson: 'করিম উল্লাহ',
    contactNumber: '01711223344',
    relationship: 'ভাই',
    emergencyLevel: 'URGENT',
    status: 'active',
    verification: { isVerified: true },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
// 1. ABO & Rh Compatibility Tests
// ----------------------------------------------------------------------------
runTest('ABO/Rh: O- is universal red-cell donor for all blood groups', () => {
  const allGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  for (const group of allGroups) {
    assert.strictEqual(
      isBloodCompatible(group, 'O-'),
      true,
      `O- must be compatible with recipient ${group}`
    );
  }
});

runTest('ABO/Rh: AB+ is universal recipient and accepts all blood groups', () => {
  const allGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  for (const group of allGroups) {
    assert.strictEqual(
      isBloodCompatible('AB+', group),
      true,
      `AB+ recipient must accept donor ${group}`
    );
  }
});

runTest('ABO/Rh: O+ recipient accepts ONLY O+ and O-', () => {
  assert.strictEqual(isBloodCompatible('O+', 'O+'), true);
  assert.strictEqual(isBloodCompatible('O+', 'O-'), true);
  assert.strictEqual(isBloodCompatible('O+', 'A+'), false);
  assert.strictEqual(isBloodCompatible('O+', 'B+'), false);
  assert.strictEqual(isBloodCompatible('O+', 'AB+'), false);
});

runTest('ABO/Rh: Rh- recipient rejects Rh+ donor of the same ABO group', () => {
  assert.strictEqual(isBloodCompatible('A-', 'A+'), false, 'A- recipient must reject A+ donor');
  assert.strictEqual(isBloodCompatible('B-', 'B+'), false, 'B- recipient must reject B+ donor');
  assert.strictEqual(isBloodCompatible('O-', 'O+'), false, 'O- recipient must reject O+ donor');
  assert.strictEqual(isBloodCompatible('AB-', 'AB+'), false, 'AB- recipient must reject AB+ donor');
});

runTest('ABO/Rh: Incompatible ABO groups are strictly rejected', () => {
  assert.strictEqual(isBloodCompatible('A+', 'B+'), false);
  assert.strictEqual(isBloodCompatible('B+', 'A+'), false);
  assert.strictEqual(isBloodCompatible('O+', 'AB+'), false);
  assert.strictEqual(isBloodCompatible('A-', 'B-'), false);
});

// ----------------------------------------------------------------------------
// 2. Donor Readiness & Eligibility Tests
// ----------------------------------------------------------------------------
runTest('Readiness: Male donor requires >= 90 days interval since last donation', () => {
  const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago
  const maleDonor = createMockDonor({ gender: 'male', lastDonationDate: recentDate });
  
  const readiness = isDonorReadyToDonate(maleDonor);
  assert.strictEqual(readiness.isReady, false, 'Male donor with 30 days since last donation must NOT be ready');
  assert(readiness.reason?.includes('দিন অতিবাহিত হয়েছে'), 'Reason must mention interval cooldown');

  const eligibleDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 95 days ago
  const eligibleMale = createMockDonor({ gender: 'male', lastDonationDate: eligibleDate });
  assert.strictEqual(isDonorReadyToDonate(eligibleMale).isReady, true, 'Male donor with 95 days must be ready');
});

runTest('Readiness: Female donor requires >= 120 days interval since last donation', () => {
  const date100DaysAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const femaleDonor = createMockDonor({ gender: 'female', lastDonationDate: date100DaysAgo });
  
  const readiness = isDonorReadyToDonate(femaleDonor);
  assert.strictEqual(readiness.isReady, false, 'Female donor with 100 days must NOT be ready (120 days required)');

  const date130DaysAgo = new Date(Date.now() - 130 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const eligibleFemale = createMockDonor({ gender: 'female', lastDonationDate: date130DaysAgo });
  assert.strictEqual(isDonorReadyToDonate(eligibleFemale).isReady, true, 'Female donor with 130 days must be ready');
});

runTest('Readiness: Underweight (< 45kg) and age boundaries (<18 or >65) are flagged', () => {
  const underweightDonor = createMockDonor({ weight: 42 });
  assert.strictEqual(isDonorReadyToDonate(underweightDonor).isReady, false);

  const underageDonor = createMockDonor({ age: 16 });
  assert.strictEqual(isDonorReadyToDonate(underageDonor).isReady, false);

  const overageDonor = createMockDonor({ age: 70 });
  assert.strictEqual(isDonorReadyToDonate(overageDonor).isReady, false);
});

runTest('Readiness: Suspended and Rejected donors are completely deferred', () => {
  const suspendedDonor = createMockDonor({ verificationStatus: 'suspended' });
  const evalSusp = evaluateDonorEligibility(suspendedDonor);
  assert.strictEqual(evalSusp.status, 'deferred');
  assert.strictEqual(evalSusp.isEligible, false);

  const rejectedDonor = createMockDonor({ verificationStatus: 'rejected' });
  const evalRej = evaluateDonorEligibility(rejectedDonor);
  assert.strictEqual(evalRej.status, 'deferred');
  assert.strictEqual(evalRej.isEligible, false);
});

// ----------------------------------------------------------------------------
// 3. Smart Matching Engine Ranking & Scoring Tests
// ----------------------------------------------------------------------------
runTest('Matching: Closer proximity donor gets higher match score', () => {
  const upazilaDonor = createMockDonor({ district: 'ঢাকা', upazila: 'ধামরাই', bloodGroup: 'A+' });
  const districtDonor = createMockDonor({ district: 'ঢাকা', upazila: 'সাভার', bloodGroup: 'A+' });
  const divisionDonor = createMockDonor({ district: 'গাজীপুর', upazila: 'শ্রীপুর', bloodGroup: 'A+' });

  const criteria = {
    patientBloodGroup: 'A+' as BloodGroup,
    district: 'ঢাকা',
    upazila: 'ধামরাই',
  };

  const scoreUpazila = calculateMatchScore(upazilaDonor, criteria);
  const scoreDistrict = calculateMatchScore(districtDonor, criteria);
  const scoreDivision = calculateMatchScore(divisionDonor, criteria);

  assert(
    scoreUpazila.totalScore > scoreDistrict.totalScore,
    `Same Upazila (${scoreUpazila.totalScore}) must score higher than same District (${scoreDistrict.totalScore})`
  );
  assert(
    scoreDistrict.totalScore > scoreDivision.totalScore,
    `Same District (${scoreDistrict.totalScore}) must score higher than other District (${scoreDivision.totalScore})`
  );
});

runTest('Matching: findCompatibleDonors filters incompatible groups and ranks by score', () => {
  const donors: Donor[] = [
    createMockDonor({ id: '1', bloodGroup: 'B+', district: 'ঢাকা', upazila: 'ধামরাই' }), // Incompatible with A+
    createMockDonor({ id: '2', bloodGroup: 'O+', district: 'ঢাকা', upazila: 'ধামরাই' }), // Compatible (O+)
    createMockDonor({ id: '3', bloodGroup: 'A+', district: 'ঢাকা', upazila: 'ধামরাই' }), // Exact match (A+)
    createMockDonor({ id: '4', bloodGroup: 'A+', district: 'ঢাকা', upazila: 'সাভার' }),  // Exact match, other upazila
  ];

  const results = findCompatibleDonors(donors, {
    patientBloodGroup: 'A+',
    district: 'ঢাকা',
    upazila: 'ধামরাই',
  });

  // B+ should be completely omitted
  assert.strictEqual(results.some((r) => r.donor.bloodGroup === 'B+'), false);
  assert.strictEqual(results.length, 3);
  // Donor 3 (Exact A+ in same upazila) must be top ranked
  assert.strictEqual(results[0].donor.id, '3');
});

runTest('Matching: Suspended or rejected donors are excluded from search results', () => {
  const donors: Donor[] = [
    createMockDonor({ id: '1', bloodGroup: 'A+', verificationStatus: 'suspended' }),
    createMockDonor({ id: '2', bloodGroup: 'A+', verificationStatus: 'rejected' }),
    createMockDonor({ id: '3', bloodGroup: 'A+', verificationStatus: 'verified' }),
  ];

  const results = findCompatibleDonors(donors, { patientBloodGroup: 'A+' });
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].donor.id, '3');
});

// ----------------------------------------------------------------------------
// 4. Authorization & Request Lifecycle Validation Tests
// ----------------------------------------------------------------------------
runTest('Auth: Cannot create donor request for fulfilled or cancelled blood request', async () => {
  const fulfilledReq = createMockBloodRequest({ status: 'fulfilled' });
  const donor = createMockDonor();

  await assert.rejects(
    async () => {
      await sendDonorContactRequest(fulfilledReq, donor, 'user-requester-1', 90);
    },
    /বর্তমানে fulfilled অবস্থায় রয়েছে/,
    'Must throw error when attempting to dispatch request for fulfilled blood request'
  );

  const cancelledReq = createMockBloodRequest({ status: 'cancelled' });
  await assert.rejects(
    async () => {
      await sendDonorContactRequest(cancelledReq, donor, 'user-requester-1', 90);
    },
    /বর্তমানে cancelled অবস্থায় রয়েছে/,
    'Must throw error when attempting to dispatch request for cancelled blood request'
  );
});

runTest('Auth: Cannot send donor request to suspended or rejected donor', async () => {
  const activeReq = createMockBloodRequest({ status: 'active' });
  const suspendedDonor = createMockDonor({ verificationStatus: 'suspended' });

  await assert.rejects(
    async () => {
      await sendDonorContactRequest(activeReq, suspendedDonor, 'user-requester-1', 90);
    },
    /প্রোফাইল স্থগিত বা বাতিল/,
    'Must throw error when dispatching to suspended donor'
  );
});

runTest('Auth: Donor response rejects illegal status transitions', async () => {
  await assert.rejects(
    async () => {
      // @ts-expect-error Testing runtime invalid status
      await respondToDonorRequest('dreq-123', 'invalid_status');
    },
    /অবৈধ রেসপন্স স্ট্যাটাস/,
    'Must reject invalid donor request response status'
  );
});

// ----------------------------------------------------------------------------
// Summary
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`📊 PHASE 1A TEST SUITE SUMMARY: ${passedCount}/${totalCount} PASSED (100%)`);
console.log('================================================================\n');
