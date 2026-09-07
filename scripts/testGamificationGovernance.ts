/**
 * Automated Verification Script for Phase 16 — Certificate, Badges & Gamification Governance
 */
import { DEFAULT_SYSTEM_CONFIG } from '../src/services/configService';
import {
  calculateDonorGamification,
  getLeaderboard,
  verifyCertificateAuthenticity,
} from '../src/services/gamificationService';
import type { Donor } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('🧪 Starting Phase 16 Certificate, Badges & Gamification Governance Tests...\n');

  const gamificationConfig = DEFAULT_SYSTEM_CONFIG.gamification;

  // Mock Donors with different milestones
  const mockDonors: Donor[] = [
    {
      id: 'd-rookie',
      donorId: 'DNR-DHM-001',
      userId: 'u1',
      fullName: 'নবীন রক্তদাতা',
      bloodGroup: 'A+',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      area: 'ধামরাই সদর',
      phone: '01711111111',
      availability: true,
      emergencyAvailable: true,
      totalDonations: 0,
      verificationStatus: 'verified',
      organizationId: 'org-roktobondon',
      privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'd-bronze',
      donorId: 'DNR-DHM-002',
      userId: 'u2',
      fullName: 'ব্রোঞ্জ রক্তদাতা',
      bloodGroup: 'B+',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      area: 'কালামপুর',
      phone: '01722222222',
      availability: true,
      emergencyAvailable: true,
      totalDonations: 1,
      verificationStatus: 'verified',
      organizationId: 'org-roktobondon',
      privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
    {
      id: 'd-gold',
      donorId: 'DNR-DHM-003',
      userId: 'u3',
      fullName: 'স্বর্ণপদক রক্তদাতা',
      bloodGroup: 'O+',
      district: 'ঢাকা',
      upazila: 'সাভার',
      area: 'হেমায়েতপুর',
      phone: '01733333333',
      availability: true,
      emergencyAvailable: true,
      totalDonations: 6,
      verificationStatus: 'verified',
      organizationId: 'org-roktobondon',
      privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    },
    {
      id: 'd-legend',
      donorId: 'DNR-MNK-004',
      userId: 'u4',
      fullName: 'কিংবদন্তি রক্তদাতা',
      bloodGroup: 'AB+',
      district: 'মানিকগঞ্জ',
      upazila: 'মানিকগঞ্জ সদর',
      area: 'বেউথা',
      phone: '01744444444',
      availability: true,
      emergencyAvailable: true,
      totalDonations: 24,
      verificationStatus: 'verified',
      organizationId: 'org-roktobondon',
      privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2026-01-04T00:00:00Z',
      updatedAt: '2026-01-04T00:00:00Z',
    },
  ];

  // Test 1: Gamification Points & Tier Calculations
  console.log('✓ Test 1: Gamification Points & Tier Calculations:');
  const rookieProfile = calculateDonorGamification(mockDonors[0], gamificationConfig);
  const bronzeProfile = calculateDonorGamification(mockDonors[1], gamificationConfig);
  const goldProfile = calculateDonorGamification(mockDonors[2], gamificationConfig);
  const legendProfile = calculateDonorGamification(mockDonors[3], gamificationConfig);

  assert(rookieProfile.currentTier === 'rookie', '0 donations should be rookie tier');
  assert(rookieProfile.earnedPoints === 0, '0 donations should yield 0 points');

  assert(bronzeProfile.currentTier === 'bronze', '1 donation should be bronze tier');
  assert(bronzeProfile.earnedPoints === 100, '1 donation should yield 100 points');
  assert(bronzeProfile.isEligibleForCertificate === true, 'Bronze donor should be eligible for certificate');

  assert(goldProfile.currentTier === 'gold', '6 donations should be gold tier');
  assert(goldProfile.earnedPoints === 600, '6 donations should yield 600 points');

  assert(legendProfile.currentTier === 'legend', '24 donations should be legend tier');
  assert(legendProfile.earnedPoints === 2400, '24 donations should yield 2400 points');
  assert(legendProfile.nextTier === null, 'Legend has reached top tier');

  console.log(`  Rookie: Tier=${rookieProfile.currentTier}, Points=${rookieProfile.earnedPoints}, Next=${rookieProfile.nextTier}`);
  console.log(`  Bronze: Tier=${bronzeProfile.currentTier}, Points=${bronzeProfile.earnedPoints}`);
  console.log(`  Gold: Tier=${goldProfile.currentTier}, Points=${goldProfile.earnedPoints}`);
  console.log(`  Legend: Tier=${legendProfile.currentTier}, Points=${legendProfile.earnedPoints}`);

  // Test 2: Ranked Leaderboard Generation
  console.log('\n✓ Test 2: Ranked Leaderboard Generation:');
  const leaderboard = getLeaderboard(mockDonors, gamificationConfig);

  assert(leaderboard.length === 4, 'Leaderboard must contain all 4 donors');
  assert(leaderboard[0].donorId === 'DNR-MNK-004', 'Rank 1 must be Legend donor with 24 donations');
  assert(leaderboard[0].rank === 1, 'Rank must be 1');
  assert(leaderboard[1].donorId === 'DNR-DHM-003', 'Rank 2 must be Gold donor with 6 donations');

  console.log('  Leaderboard Top Ranks:');
  leaderboard.forEach((item) => {
    console.log(`    #${item.rank} [${item.bloodGroup}] ${item.fullName} - ${item.totalDonations} donations (${item.points} pts) [${item.tier}]`);
  });

  // Test 3: Leaderboard Region and Group Filtering
  console.log('\n✓ Test 3: Leaderboard Filters:');
  const manikganjBoard = getLeaderboard(mockDonors, gamificationConfig, { district: 'মানিকগঞ্জ' });
  assert(manikganjBoard.length === 1, 'Only 1 donor in Manikganj');
  assert(manikganjBoard[0].fullName === 'কিংবদন্তি রক্তদাতা', 'Correct Manikganj donor filtered');

  const bPositiveBoard = getLeaderboard(mockDonors, gamificationConfig, { bloodGroup: 'B+' });
  assert(bPositiveBoard.length === 1 && bPositiveBoard[0].bloodGroup === 'B+', 'B+ filter correct');
  console.log(`  Manikganj filtered count: ${manikganjBoard.length}`);
  console.log(`  B+ filtered count: ${bPositiveBoard.length}`);

  // Test 4: Certificate Authenticity Verification Engine
  console.log('\n✓ Test 4: Certificate Authenticity Verification:');
  const validCert = verifyCertificateAuthenticity('DNR-DHM-002', mockDonors, gamificationConfig);
  assert(validCert.isValid === true, 'Verified donor with donation must have valid certificate');

  const invalidCert = verifyCertificateAuthenticity('DNR-INVALID-999', mockDonors, gamificationConfig);
  assert(invalidCert.isValid === false, 'Non-existent ID must return invalid certificate');

  const rookieCert = verifyCertificateAuthenticity('DNR-DHM-001', mockDonors, gamificationConfig);
  assert(rookieCert.isValid === false, '0 donation donor is not yet eligible for certificate');

  console.log(`  Valid Cert check: ${validCert.message}`);
  console.log(`  Invalid ID check: ${invalidCert.message}`);
  console.log(`  Rookie Cert check: ${rookieCert.message}`);

  // Test 5: Signatory Configuration Defaults
  console.log('\n✓ Test 5: Signatory Configuration Defaults:');
  assert(Boolean(gamificationConfig.organizationSignatoryNameBn), 'Signatory name must be configured');
  assert(Boolean(gamificationConfig.organizationSignatoryTitleBn), 'Signatory title must be configured');
  console.log(`  Signatory: ${gamificationConfig.organizationSignatoryNameBn} (${gamificationConfig.organizationSignatoryTitleBn})`);
  console.log(`  Theme Template: ${gamificationConfig.certificateTemplate}`);

  console.log('\n🎉 ALL Phase 16 Certificate, Badges & Gamification Governance Tests Passed Successfully!\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
