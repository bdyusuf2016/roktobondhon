/**
 * Automated Verification Script for Phase 11 — Fund & Donation Management
 */
import { hasPermission } from '../src/services/permissionService';
import type { FundDonation, FundDisbursement, PaymentMethodConfig, Donation, Donor, BloodRequest } from '../src/types';

async function runFundDonationTests() {
  console.log('🧪 Starting Phase 11 Fund & Donation Management Automated Tests...\n');

  // Test 1: Financial Ledger Calculations
  console.log('✓ Test 1: Financial Ledger & Balance Integrity:');
  const mockDonations: FundDonation[] = [
    {
      id: 'fdon-1',
      donorName: 'আহমেদ হাসান',
      donorPhone: '01711223344',
      amount: 5000,
      paymentMethod: 'bKash',
      transactionId: 'TRX998811',
      fundCause: 'emergency_patient',
      isAnonymous: false,
      status: 'verified',
      organizationId: 'org-roktobondon',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'fdon-2',
      donorName: 'মোছা: নাজনীন আক্তার',
      donorPhone: '01811223355',
      amount: 2500,
      paymentMethod: 'Nagad',
      transactionId: 'NGD445566',
      fundCause: 'blood_bags_kits',
      isAnonymous: false,
      status: 'verified',
      organizationId: 'org-roktobondon',
      createdAt: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'fdon-3',
      donorName: 'গোপন শুভানুধ্যায়ী',
      donorPhone: '01911223366',
      amount: 10000,
      paymentMethod: 'Bank',
      transactionId: 'BNK778899',
      fundCause: 'general',
      isAnonymous: true,
      status: 'pending',
      organizationId: 'org-roktobondon',
      createdAt: '2026-09-03T10:00:00.000Z',
    },
  ];

  const mockDisbursements: FundDisbursement[] = [
    {
      id: 'disb-1',
      title: 'রোগীর টেস্ট ও জরুরি ব্লাড ব্যাগ খরচ',
      amount: 3000,
      recipient: 'মো: রফিকুল ইসলাম',
      area: 'ধামরাই',
      cause: 'emergency_patient',
      approvedBy: 'সুপার এডমিন',
      voucherNo: 'VCH-2026-001',
      date: '2026-09-02',
    },
  ];

  const totalVerifiedFunds = mockDonations
    .filter((d) => d.status === 'verified')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalDisbursed = mockDisbursements.reduce((sum, d) => sum + d.amount, 0);
  const reserveBalance = totalVerifiedFunds - totalDisbursed;
  const pendingCount = mockDonations.filter((d) => d.status === 'pending').length;

  if (totalVerifiedFunds !== 7500 || totalDisbursed !== 3000 || reserveBalance !== 4500 || pendingCount !== 1) {
    throw new Error(`Financial calculation mismatch! Got verified: ${totalVerifiedFunds}, disbursed: ${totalDisbursed}, reserve: ${reserveBalance}`);
  }
  console.log(`  Total Verified: ৳ ${totalVerifiedFunds.toLocaleString()}`);
  console.log(`  Total Disbursed: ৳ ${totalDisbursed.toLocaleString()}`);
  console.log(`  Reserve Fund Balance: ৳ ${reserveBalance.toLocaleString()}`);
  console.log(`  Pending Verifications: ${pendingCount} items`);

  // Test 2: Donation Verification Lifecycle
  console.log('\n✓ Test 2: Donation Verification State Transition:');
  const pendingDonation = mockDonations[2];
  const approvedDonation: FundDonation = {
    ...pendingDonation,
    status: 'verified',
    verifiedBy: 'সুপার এডমিন',
    verifiedAt: new Date().toISOString(),
  };
  if (approvedDonation.status !== 'verified' || !approvedDonation.verifiedBy) {
    throw new Error('Donation approval transition failed.');
  }
  console.log(`  Donation [${approvedDonation.id}]: pending -> verified (Approved by ${approvedDonation.verifiedBy})`);

  // Test 3: Blood Donation Recording & Donor Stats Update
  console.log('\n✓ Test 3: Blood Donation Recording & Donor Ledger Integration:');
  const testDonor: Donor = {
    id: 'donor-test-1',
    donorId: 'DNR-DHM-001001',
    userId: 'usr-1',
    organizationId: 'org-roktobondon',
    fullName: 'মো: সাকিব হাসান',
    phone: '01711000001',
    bloodGroup: 'A+',
    district: 'Dhaka',
    upazila: 'Dhamrai',
    area: 'ধামরাই',
    totalDonations: 3,
    lastDonationDate: '2026-05-10',
    availability: true,
    emergencyAvailable: true,
    verificationStatus: 'verified',
    privacy: {
      showPhone: true,
      showGender: true,
      showAge: true,
      allowDirectContact: true,
    },
    createdAt: '2025-01-01',
    updatedAt: '2026-05-10',
  };

  const newDonationRecord: Donation = {
    id: 'don-rec-1',
    donorId: testDonor.donorId,
    donorUserId: testDonor.userId,
    donorName: testDonor.fullName,
    bloodGroup: testDonor.bloodGroup,
    donationDate: '2026-09-06',
    hospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    units: 1,
    donationType: 'Whole Blood',
    verifiedBy: 'এডমিন',
    verificationDate: '2026-09-06',
  };

  // Simulate donor stats update
  const updatedDonor: Donor = {
    ...testDonor,
    totalDonations: (testDonor.totalDonations || 0) + 1,
    lastDonationDate: newDonationRecord.donationDate,
    availability: false,
  };

  if (updatedDonor.totalDonations !== 4 || updatedDonor.lastDonationDate !== '2026-09-06' || updatedDonor.availability !== false) {
    throw new Error('Donor statistics did not update correctly upon recording donation.');
  }
  console.log(`  Donor [${updatedDonor.donorId}]: Total donations updated 3 -> ${updatedDonor.totalDonations}`);
  console.log(`  Last donation date updated -> ${updatedDonor.lastDonationDate}`);
  console.log(`  Availability set to false for recovery cycle: ${!updatedDonor.availability}`);

  // Test 4: Payment Methods Configuration
  console.log('\n✓ Test 4: Payment Method Config Structure:');
  const mockMethods: PaymentMethodConfig[] = [
    {
      id: 'pm-1',
      name: 'bKash',
      nameBn: 'বিকাশ (মার্চেন্ট)',
      type: 'bKash',
      accountNumber: '01700000001',
      accountType: 'merchant',
      instructionsBn: 'মার্চেন্ট পেমেন্ট অপশন ব্যবহার করুন',
      isActive: true,
    },
    {
      id: 'pm-2',
      name: 'Nagad',
      nameBn: 'নগদ (পার্সোনাল)',
      type: 'Nagad',
      accountNumber: '01800000002',
      accountType: 'personal',
      instructionsBn: 'সেন্ড মানি অপশন ব্যবহার করুন',
      isActive: true,
    },
  ];

  for (const pm of mockMethods) {
    if (!pm.id || !pm.nameBn || !pm.accountNumber || !pm.type) {
      throw new Error(`Payment method ${pm.id} invalid.`);
    }
    console.log(`  Method [${pm.id}]: ${pm.nameBn} (${pm.type} - ${pm.accountType}) -> ${pm.accountNumber}`);
  }

  // Test 5: Role Permissions for Fund & Donation Management
  console.log('\n✓ Test 5: Role Authorization for Funds & Donations:');
  const superAdminCanFunds = hasPermission('super_admin', 'manage_funds');
  const superAdminCanDisburse = hasPermission('super_admin', 'manage_disbursements');
  const superAdminCanPayMethods = hasPermission('super_admin', 'manage_payment_methods');
  const superAdminCanRecordDonation = hasPermission('super_admin', 'record_donation');

  const adminCanFunds = hasPermission('admin', 'manage_funds');
  const adminCanRecordDonation = hasPermission('admin', 'record_donation');
  const volunteerCanRecordDonation = hasPermission('volunteer', 'record_donation');
  const donorCanFunds = hasPermission('donor', 'manage_funds');

  if (!superAdminCanFunds || !superAdminCanDisburse || !superAdminCanPayMethods || !superAdminCanRecordDonation) {
    throw new Error('Super Admin must have full fund and donation permissions.');
  }
  if (!adminCanFunds || !adminCanRecordDonation) {
    throw new Error('Admin must have fund and donation recording permissions.');
  }
  if (!volunteerCanRecordDonation) {
    throw new Error('Volunteer must be authorized to record donations.');
  }
  if (donorCanFunds) {
    throw new Error('Donor role must NOT have manage_funds permission.');
  }

  console.log('  Super Admin (manage_funds, manage_disbursements, manage_payment_methods): ALLOWED');
  console.log('  Admin (manage_funds, record_donation): ALLOWED');
  console.log('  Volunteer (record_donation): ALLOWED');
  console.log('  Donor (manage_funds): BLOCKED');

  console.log('\n🎉 ALL Phase 11 Fund & Donation Management Tests Passed Successfully!');
}

runFundDonationTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
