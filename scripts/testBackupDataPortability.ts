/**
 * Automated Verification Script for Phase 14 — Backup, Restore & Data Portability
 */
import {
  generatePlatformBackup,
  validateBackupPayload,
  calculateBackupChecksum,
  convertCollectionToCsv,
  resolveSelectiveRestore,
} from '../src/services/backupService';
import type { Donor, Hospital } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('🧪 Starting Phase 14 Backup, Restore & Data Portability Automated Tests...\n');

  // Sample Mock Data
  const mockDonors: Donor[] = [
    {
      id: 'donor-01',
      donorId: 'DNR-DHM-0001',
      userId: 'user-01',
      fullName: 'আব্দুল করিম',
      bloodGroup: 'A+',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      area: 'কালামপুর',
      phone: '01711000111',
      availability: true,
      emergencyAvailable: true,
      totalDonations: 4,
      verificationStatus: 'verified',
      organizationId: 'org-roktobondon',
      privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    {
      id: 'donor-02',
      donorId: 'DNR-DHM-0002',
      userId: 'user-02',
      fullName: 'তানিয়া সুলতানা',
      bloodGroup: 'O-',
      district: 'ঢাকা',
      upazila: 'সাভার',
      area: 'হেমায়েতপুর',
      phone: '01811000222',
      availability: true,
      emergencyAvailable: true,
      totalDonations: 2,
      verificationStatus: 'verified',
      organizationId: 'org-roktobondon',
      privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    },
  ];

  const mockHospitals: Hospital[] = [
    {
      id: 'hosp-01',
      nameEn: 'Dhamrai Upazila Health Complex',
      nameBn: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
      category: 'government',
      district: 'ঢাকা',
      upazila: 'ধামরাই',
      address: 'ধামরাই, ঢাকা',
      hotline: '01700000001',
      hasBloodBank: true,
      hasICU: false,
      isOpen24Hours: true,
      verificationStatus: 'verified',
    },
  ];

  // Test 1: Full Backup Generation & Metadata Checksum
  console.log('✓ Test 1: Platform Backup Generation & Checksum Integrity:');
  const backup = generatePlatformBackup({
    donors: mockDonors,
    hospitals: mockHospitals,
    exportedBy: { id: 'admin-01', name: 'প্রধান অ্যাডমিন', role: 'super_admin' },
  });

  assert(backup.payload.metadata?.version === '2.0.0', 'Metadata version should be 2.0.0');
  assert(backup.payload.metadata?.itemCounts.donors === 2, 'Should record 2 donors in itemCounts');
  assert(backup.payload.metadata?.itemCounts.hospitals === 1, 'Should record 1 hospital in itemCounts');
  assert(typeof backup.payload.metadata?.checksum === 'string', 'Checksum should be generated');
  console.log(`  Version: ${backup.payload.metadata?.version}, Checksum: ${backup.payload.metadata?.checksum}`);
  console.log(`  Exported By: ${backup.payload.metadata?.exportedBy?.name} (${backup.payload.metadata?.exportedBy?.role})`);

  // Test 2: Backup Validation Engine (Valid, Corrupt, and v1.0 Legacy)
  console.log('\n✓ Test 2: Backup Validation & Schema Parsing:');
  const validRes = validateBackupPayload(backup.jsonString);
  assert(validRes.isValid === true, 'Valid backup JSON should pass validation');
  assert(validRes.totalRecords === 3, 'Total records count should equal 3 (2 donors + 1 hospital)');

  const corruptRes = validateBackupPayload('{ corrupt_json: true, ');
  assert(corruptRes.isValid === false, 'Corrupt JSON must fail validation');
  assert(corruptRes.errors.length > 0, 'Error messages should be populated');

  // Legacy v1.0 flat format simulation
  const legacyV1Str = JSON.stringify({
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00Z',
    donors: mockDonors,
  });
  const legacyRes = validateBackupPayload(legacyV1Str);
  assert(legacyRes.isValid === true, 'Legacy v1.0 backup should be parsed cleanly');
  assert(legacyRes.itemCounts.donors === 2, 'Legacy donors count should be 2');
  console.log(`  Valid JSON result: valid=${validRes.isValid}, totalRecords=${validRes.totalRecords}`);
  console.log(`  Corrupt JSON result: valid=${corruptRes.isValid}, errors="${corruptRes.errors[0]}"`);
  console.log(`  Legacy v1.0 compatibility: valid=${legacyRes.isValid}, detectedVersion=${legacyRes.version}`);

  // Test 3: Data Portability & CSV Unicode Formatting
  console.log('\n✓ Test 3: CSV Export with Unicode BOM:');
  const csv = convertCollectionToCsv(mockDonors, [
    { key: 'donorId', label: 'আইডি' },
    { key: 'fullName', label: 'নাম' },
    { key: 'bloodGroup', label: 'গ্রুপ' },
    { key: 'district', label: 'জেলা' },
  ]);

  assert(csv.startsWith('\uFEFF'), 'CSV must include UTF-8 BOM (\\uFEFF) for Excel Bengali compatibility');
  assert(csv.includes('"আব্দুল করিম"'), 'CSV should contain encoded Bengali names in quotes');
  console.log(`  CSV Header & Row Preview:`);
  console.log(`  ${csv.split('\r\n').slice(0, 2).join('\n  ')}`);

  // Test 4: Selective Restore Engine (Selective Replace & Merge)
  console.log('\n✓ Test 4: Selective Restore Engine:');
  const newDonor: Donor = {
    id: 'donor-03',
    donorId: 'DNR-DHM-0003',
    userId: 'user-03',
    fullName: 'মো: রফিকুল ইসলাম',
    bloodGroup: 'B+',
    district: 'ঢাকা',
    upazila: 'ধামরাই',
    area: 'কালামপুর',
    phone: '01911000333',
    availability: true,
    emergencyAvailable: false,
    totalDonations: 1,
    verificationStatus: 'verified',
    organizationId: 'org-roktobondon',
    privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
  };

  const backupToRestore = generatePlatformBackup({
    donors: [...mockDonors, newDonor],
    hospitals: mockHospitals,
  });

  // Test Selective Replace
  const replaceResult = resolveSelectiveRestore(
    backupToRestore.payload,
    ['donors'],
    'replace',
    { donors: mockDonors }
  );
  assert(replaceResult.restoredCounts.donors === 3, 'Replace should restore all 3 donors from backup');
  assert(replaceResult.restoredData.hospitals === undefined, 'Hospitals should not be restored when not selected');

  // Test Selective Merge
  const mergeResult = resolveSelectiveRestore(
    backupToRestore.payload,
    ['donors'],
    'merge',
    { donors: mockDonors }
  );
  assert(mergeResult.restoredData.donors?.length === 3, 'Merge should append non-duplicate donors');
  console.log(`  Selective Replace Result: ${JSON.stringify(replaceResult.restoredCounts)}`);
  console.log(`  Selective Merge Result count: ${mergeResult.restoredData.donors?.length} donors.`);

  console.log('\n🎉 ALL Phase 14 Backup, Restore & Data Portability Tests Passed Successfully!\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
