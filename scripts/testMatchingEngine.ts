/**
 * Automated Verification Script for Phase 5 — Matching Engine
 */
import {
  calculateMatchScore,
  evaluateDonorEligibility,
  findCompatibleDonors,
  DEFAULT_MATCHING_WEIGHTS,
  DEFAULT_DONOR_ELIGIBILITY,
} from '../src/services/matchingService';
import type { Donor } from '../src/types';

const mockDonors: Donor[] = [
  {
    id: 'donor-1',
    donorId: 'DNR-001',
    userId: 'user-001',
    fullName: 'আহমেদ হাসান (Perfect Match A+)',
    name: 'আহমেদ হাসান',
    bloodGroup: 'A+',
    district: 'Dhaka',
    upazila: 'Mirpur',
    area: 'Mirpur-10',
    phone: '01700000001',
    gender: 'male',
    age: 28,
    weight: 70,
    availability: true,
    emergencyAvailable: true,
    verificationStatus: 'verified',
    totalDonations: 6,
    donationCount: 6,
    lastDonationDate: '2025-01-01', // >120 days ago
    organizationId: 'org-1',
    privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'donor-2',
    donorId: 'DNR-002',
    userId: 'user-002',
    fullName: 'তানভীর আহমেদ (Compatible O+)',
    name: 'তানভীর আহমেদ',
    bloodGroup: 'O+',
    district: 'Dhaka',
    upazila: 'Mirpur',
    area: 'Mirpur-2',
    phone: '01700000002',
    gender: 'male',
    age: 30,
    weight: 65,
    availability: true,
    emergencyAvailable: true,
    verificationStatus: 'verified',
    totalDonations: 2,
    donationCount: 2,
    lastDonationDate: '2025-01-01',
    organizationId: 'org-1',
    privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'donor-3',
    donorId: 'DNR-003',
    userId: 'user-003',
    fullName: 'সাদিয়া ইসলাম (Recent Female Donor - Deferred)',
    name: 'সাদিয়া ইসলাম',
    bloodGroup: 'A+',
    district: 'Dhaka',
    upazila: 'Mirpur',
    area: 'Mirpur-12',
    phone: '01700000003',
    gender: 'female',
    age: 24,
    weight: 52,
    availability: true,
    emergencyAvailable: false,
    verificationStatus: 'verified',
    totalDonations: 3,
    donationCount: 3,
    lastDonationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago (<120 days)
    organizationId: 'org-1',
    privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'donor-4',
    donorId: 'DNR-004',
    userId: 'user-004',
    fullName: 'রহিম উল্লাহ (Incompatible B+)',
    name: 'রহিম উল্লাহ',
    bloodGroup: 'B+',
    district: 'Dhaka',
    upazila: 'Mirpur',
    area: 'Mirpur-1',
    phone: '01700000004',
    gender: 'male',
    age: 35,
    weight: 75,
    availability: true,
    emergencyAvailable: true,
    verificationStatus: 'verified',
    totalDonations: 4,
    donationCount: 4,
    organizationId: 'org-1',
    privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function runMatchingEngineTests() {
  console.log('🧪 Starting Phase 5 Matching Engine Automated Tests...\n');

  // Test 1: Blood Compatibility & Exact vs Compatible Score
  const matchCriteria = {
    patientBloodGroup: 'A+' as const,
    district: 'Dhaka',
    upazila: 'Mirpur',
    isEmergency: true,
  };

  const scoreExact = calculateMatchScore(mockDonors[0], matchCriteria);
  const scoreComp = calculateMatchScore(mockDonors[1], matchCriteria);

  console.log(`✓ Donor 1 (A+ Exact): Total Score = ${scoreExact.totalScore} pts (Blood Comp: ${scoreExact.breakdown.bloodCompatibility})`);
  console.log(`✓ Donor 2 (O+ Compatible): Total Score = ${scoreComp.totalScore} pts (Blood Comp: ${scoreComp.breakdown.bloodCompatibility})`);

  if (scoreExact.totalScore <= scoreComp.totalScore) {
    throw new Error('Exact blood group match must score higher than compatible alternative with identical conditions.');
  }

  // Test 2: Medical Eligibility Evaluator
  const femaleEligibility = evaluateDonorEligibility(mockDonors[2]);
  console.log(`✓ Donor 3 (Female 30d since donation): Is Eligible = ${femaleEligibility.isEligible}, Status = ${femaleEligibility.status}`);
  console.log(`  Reasons: ${femaleEligibility.reasons.join(', ')}`);

  if (femaleEligibility.isEligible) {
    throw new Error('Female donor who donated 30 days ago must be flagged ineligible under 120-day rule.');
  }

  // Test 3: findCompatibleDonors Ranking & Incompatible Filtering
  const rankedDonors = findCompatibleDonors(mockDonors, matchCriteria);
  console.log(`\n✓ Ranked Donors count for A+ recipient: ${rankedDonors.length} (Incompatible B+ must be excluded)`);

  const hasIncompatible = rankedDonors.some((r) => r.donor.id === 'donor-4');
  if (hasIncompatible) {
    throw new Error('Incompatible B+ donor was incorrectly included in A+ match results.');
  }

  if (rankedDonors[0].donor.id !== 'donor-1') {
    throw new Error('Top ranked donor must be Donor 1 (Perfect Match).');
  }

  // Test 4: Strict Eligibility Filter Mode
  const strictRanked = findCompatibleDonors(mockDonors, matchCriteria, {
    weights: { ...DEFAULT_MATCHING_WEIGHTS, strictEligibility: true },
  });
  console.log(`✓ Strict Eligibility Mode: Filtered down to ${strictRanked.length} eligible donors (Excluded ineligible donor 3)`);

  const hasDeferredInStrict = strictRanked.some((r) => r.donor.id === 'donor-3');
  if (hasDeferredInStrict) {
    throw new Error('Deferred donor 3 was not excluded in strictEligibility mode.');
  }

  // Test 5: Dynamic Weight Responsiveness (Location-dominant weights)
  const distantDonor: Donor = {
    ...mockDonors[0],
    id: 'donor-5',
    district: 'Chittagong',
    upazila: 'Pahartali',
  };

  const locationHeavyWeights = {
    ...DEFAULT_MATCHING_WEIGHTS,
    compatibilityWeight: 10,
    distanceWeight: 60,
  };

  const scoreLocal = calculateMatchScore(mockDonors[1], matchCriteria, { weights: locationHeavyWeights }); // O+ in Dhaka
  const scoreFar = calculateMatchScore(distantDonor, matchCriteria, { weights: locationHeavyWeights }); // A+ in Chittagong

  console.log(`\n✓ Location-heavy config: Local O+ (${scoreLocal.totalScore} pts) vs Distant A+ (${scoreFar.totalScore} pts)`);
  if (scoreLocal.totalScore <= scoreFar.totalScore) {
    throw new Error('Under location-heavy weights, local donor should outrank distant donor.');
  }

  console.log('\n🎉 ALL Phase 5 Matching Engine Tests Passed Successfully!');
}

runMatchingEngineTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
