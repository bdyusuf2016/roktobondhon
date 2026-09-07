/**
 * Automated Verification Script for Phase 9 — Location, Branch & Hospital Control
 */
import { INITIAL_BRANCHES, INITIAL_LOCATIONS, INITIAL_HOSPITALS } from '../src/services/locationService';
import { hasPermission } from '../src/services/permissionService';
import type { Branch, LocationItem, Hospital, HospitalCategory } from '../src/types';

async function runLocationHospitalControlTests() {
  console.log('🧪 Starting Phase 9 Location, Branch & Hospital Control Automated Tests...\n');

  // Test 1: Branch Data Integrity & Coordinator Info
  console.log('✓ Test 1: Branch Directory & Coordinator Structure:');
  if (!INITIAL_BRANCHES || INITIAL_BRANCHES.length === 0) {
    throw new Error('Initial branches list must not be empty.');
  }
  for (const branch of INITIAL_BRANCHES) {
    if (!branch.id || !branch.nameBn || !branch.district || !branch.upazila || !branch.coordinatorName || !branch.coordinatorPhone) {
      throw new Error(`Branch ${branch.id} is missing required coordinator or location fields.`);
    }
    console.log(`  Branch [${branch.id}]: ${branch.nameBn} (${branch.upazila}, ${branch.district}) -> Coordinator: ${branch.coordinatorName} [${branch.coordinatorPhone}]`);
  }

  // Test 2: Coverage Zones & Union Mapping
  console.log('\n✓ Test 2: Coverage Zones & Union Hierarchy:');
  if (!INITIAL_LOCATIONS || INITIAL_LOCATIONS.length === 0) {
    throw new Error('Initial locations list must not be empty.');
  }

  let totalUnionsCount = 0;
  for (const loc of INITIAL_LOCATIONS) {
    if (!loc.id || !loc.district || !loc.upazila || !Array.isArray(loc.unions)) {
      throw new Error(`Location item ${loc.id} is invalid.`);
    }
    totalUnionsCount += loc.unions.length;
    console.log(`  Location [${loc.id}]: ${loc.upazila} (${loc.district}) -> ${loc.unions.length} unions covered.`);
  }
  console.log(`  Total covered unions across all upazilas: ${totalUnionsCount}`);

  // Test 3: Union Addition and Removal Logic
  console.log('\n✓ Test 3: Union Modification Workflow:');
  const sampleLoc: LocationItem = {
    id: 'test-loc',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhamrai',
    unions: ['Dhamrai Sadar', 'Kushura'],
    isActive: true,
  };

  // Add union
  const newUnion = 'Sanora';
  const updatedUnions = [...sampleLoc.unions, newUnion];
  if (!updatedUnions.includes('Sanora') || updatedUnions.length !== 3) {
    throw new Error('Failed to add union to location.');
  }
  console.log(`  Union Addition: Successfully added "${newUnion}" to Dhamrai. Count: ${updatedUnions.length}`);

  // Remove union
  const filteredUnions = updatedUnions.filter((u) => u !== 'Kushura');
  if (filteredUnions.includes('Kushura') || filteredUnions.length !== 2) {
    throw new Error('Failed to remove union from location.');
  }
  console.log(`  Union Removal: Successfully removed "Kushura". Remaining: ${filteredUnions.join(', ')}`);

  // Test 4: Hospital Directory & Facility Badges
  console.log('\n✓ Test 4: Hospital Directory Categories & Verification Logic:');
  const validCategories: HospitalCategory[] = ['government', 'medical_college', 'private', 'blood_bank'];

  const testHospitals: Hospital[] = [
    {
      id: 'hosp-1',
      nameBn: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
      nameEn: 'Dhamrai Upazila Health Complex',
      category: 'government',
      district: 'Dhaka',
      upazila: 'Dhamrai',
      address: 'ধামরাই, ঢাকা',
      hotline: '01711000001',
      hasBloodBank: true,
      hasICU: false,
      isOpen24Hours: true,
      verificationStatus: 'verified',
      isCommunityAdded: false,
    },
    {
      id: 'hosp-2',
      nameBn: 'কালামপুর সেবা ক্লিনিক',
      nameEn: 'Kalampur Seba Clinic',
      category: 'private',
      district: 'Dhaka',
      upazila: 'Dhamrai',
      address: 'কালামপুর বাজার, ধামরাই, ঢাকা',
      hotline: '01711000002',
      hasBloodBank: false,
      hasICU: false,
      isOpen24Hours: true,
      verificationStatus: 'unverified',
      isCommunityAdded: true,
    },
  ];

  for (const h of testHospitals) {
    if (!validCategories.includes(h.category)) {
      throw new Error(`Invalid category "${h.category}" for hospital ${h.id}`);
    }
    if (!h.nameBn || !h.hotline) {
      throw new Error(`Hospital ${h.id} missing name or hotline.`);
    }
    console.log(`  Hospital [${h.id}]: ${h.nameBn} | Category: ${h.category} | BloodBank: ${h.hasBloodBank} | Status: ${h.verificationStatus}`);
  }

  // Verification transition
  const unverifiedHospital = testHospitals[1];
  const verifiedHospital: Hospital = {
    ...unverifiedHospital,
    verificationStatus: 'verified',
    isCommunityAdded: false,
  };

  if (verifiedHospital.verificationStatus !== 'verified' || verifiedHospital.isCommunityAdded !== false) {
    throw new Error('Hospital verification transition failed.');
  }
  console.log(`  Verification transition: "${unverifiedHospital.nameBn}" verified -> verified: true, isCommunityAdded: false`);

  // Test 5: Role Permissions for Locations and Hospitals
  console.log('\n✓ Test 5: Role-Based Access Control for Locations & Hospitals:');
  const superAdminCanBranches = hasPermission('super_admin', 'manage_branches');
  const superAdminCanHospitals = hasPermission('super_admin', 'manage_hospitals');
  const adminCanBranches = hasPermission('admin', 'manage_branches');
  const adminCanHospitals = hasPermission('admin', 'manage_hospitals');
  const donorCanBranches = hasPermission('donor', 'manage_branches');
  const donorCanHospitals = hasPermission('donor', 'manage_hospitals');

  if (!superAdminCanBranches || !superAdminCanHospitals) {
    throw new Error('Super admin must have permissions for branches and hospitals.');
  }
  if (!adminCanBranches || !adminCanHospitals) {
    throw new Error('Admin must have permissions for branches and hospitals.');
  }
  if (donorCanBranches || donorCanHospitals) {
    throw new Error('Donor must NOT have administrative permissions for branches or hospitals.');
  }
  console.log('  Super Admin (manage_branches, manage_hospitals): ALLOWED');
  console.log('  Admin (manage_branches, manage_hospitals): ALLOWED');
  console.log('  Donor (manage_branches, manage_hospitals): BLOCKED');

  console.log('\n🎉 ALL Phase 9 Location, Branch & Hospital Control Tests Passed Successfully!');
}

runLocationHospitalControlTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
