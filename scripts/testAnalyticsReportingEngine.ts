/**
 * Automated Verification Script for Phase 12 — Analytics & Reporting Engine
 */
import {
  calculateBloodSupplyDemandIndex,
  calculateFulfillmentMetrics,
  calculateRegionalAnalytics,
  calculateFinancialAnalytics,
  generateComprehensiveReport,
} from '../src/services/analyticsService';
import type { Donor, BloodRequest, Donation, FundDonation, FundDisbursement, Branch } from '../src/types';

async function runAnalyticsEngineTests() {
  console.log('🧪 Starting Phase 12 Analytics & Reporting Engine Automated Tests...\n');

  // Test 1: Supply vs Demand Index Calculation
  console.log('✓ Test 1: Blood Group Supply vs Demand Matrix:');
  const mockDonors: Donor[] = [
    {
      id: 'd1', donorId: 'D1', userId: 'u1', fullName: 'Donor 1', phone: '0171', bloodGroup: 'O+',
      district: 'Dhaka', upazila: 'Dhamrai', area: 'ধামরাই', totalDonations: 1, availability: true,
      emergencyAvailable: true, verificationStatus: 'verified', privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2025-01-01', updatedAt: '2025-01-01', organizationId: 'org-roktobondon'
    },
    {
      id: 'd2', donorId: 'D2', userId: 'u2', fullName: 'Donor 2', phone: '0172', bloodGroup: 'O+',
      district: 'Dhaka', upazila: 'Dhamrai', area: 'ধামরাই', totalDonations: 2, availability: true,
      emergencyAvailable: true, verificationStatus: 'verified', privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2025-01-01', updatedAt: '2025-01-01', organizationId: 'org-roktobondon'
    },
    {
      id: 'd3', donorId: 'D3', userId: 'u3', fullName: 'Donor 3', phone: '0173', bloodGroup: 'AB-',
      district: 'Manikganj', upazila: 'Singair', area: 'সিংগাইর', totalDonations: 0, availability: false,
      emergencyAvailable: false, verificationStatus: 'verified', privacy: { showPhone: true, showGender: true, showAge: true, allowDirectContact: true },
      createdAt: '2025-01-01', updatedAt: '2025-01-01', organizationId: 'org-roktobondon'
    }
  ];

  const mockRequests: BloodRequest[] = [
    {
      id: 'r1', requestId: 'REQ-1', userId: 'u4', patientName: 'Patient 1', bloodGroup: 'O+',
      requiredUnits: 1, hospital: 'Dhamrai Health Complex', division: 'Dhaka', district: 'Dhaka', upazila: 'Dhamrai',
      area: 'ধামরাই', requiredDate: '2026-09-10', requiredTime: '10:00', emergencyLevel: 'NORMAL',
      status: 'fulfilled', contactPerson: 'Relative 1', contactNumber: '0170', relationship: 'Relative',
      verification: { isVerified: true, verifiedBy: 'Admin' },
      createdAt: '2026-09-01'
    },
    {
      id: 'r2', requestId: 'REQ-2', userId: 'u5', patientName: 'Patient 2', bloodGroup: 'AB-',
      requiredUnits: 2, hospital: 'Enam Medical', division: 'Dhaka', district: 'Dhaka', upazila: 'Savar',
      area: 'সাভার', requiredDate: '2026-09-10', requiredTime: '12:00', emergencyLevel: 'CRITICAL',
      status: 'active', contactPerson: 'Relative 2', contactNumber: '0171', relationship: 'Relative',
      verification: { isVerified: true, verifiedBy: 'Admin' },
      createdAt: '2026-09-02'
    }
  ];

  const supplyDemand = calculateBloodSupplyDemandIndex(mockDonors, mockRequests);
  if (supplyDemand.length !== 8) {
    throw new Error('Supply-demand index must calculate for all 8 blood groups.');
  }

  const oPos = supplyDemand.find((s) => s.group === 'O+');
  const abNeg = supplyDemand.find((s) => s.group === 'AB-');

  console.log(`  O+ Status: ${oPos?.shortageLevel} (Available: ${oPos?.availableDonors}, Requests: ${oPos?.requestCount})`);
  console.log(`  AB- Status: ${abNeg?.shortageLevel} (Available: ${abNeg?.availableDonors}, Requests: ${abNeg?.requestCount})`);

  if (abNeg?.shortageLevel !== 'CRITICAL_SHORTAGE') {
    throw new Error(`AB- must be marked as CRITICAL_SHORTAGE when 0 available donors and active request exists.`);
  }

  // Test 2: Request Fulfillment Metrics
  console.log('\n✓ Test 2: Request Fulfillment & Crisis Velocity:');
  const fulfillment = calculateFulfillmentMetrics(mockRequests);
  console.log(`  Total Requests: ${fulfillment.totalRequests}`);
  console.log(`  Fulfilled Requests: ${fulfillment.fulfilledRequests} (${fulfillment.fulfillmentRate}%)`);
  console.log(`  Critical Cases: ${fulfillment.criticalRequests}`);

  if (fulfillment.totalRequests !== 2 || fulfillment.fulfilledRequests !== 1 || fulfillment.fulfillmentRate !== 50) {
    throw new Error('Fulfillment metrics calculation mismatch.');
  }

  // Test 3: Regional Performance Analysis
  console.log('\n✓ Test 3: Regional Coverage Analytics:');
  const mockBranches: Branch[] = [
    {
      id: 'br-1', organizationId: 'org-roktobondon', name: 'Dhamrai Chapter', nameBn: 'ধামরাই শাখা',
      district: 'Dhaka', upazila: 'Dhamrai', coordinatorName: 'আরিফ', coordinatorPhone: '0171', isActive: true
    },
    {
      id: 'br-2', organizationId: 'org-roktobondon', name: 'Savar Chapter', nameBn: 'সাভার শাখা',
      district: 'Dhaka', upazila: 'Savar', coordinatorName: 'তানভীর', coordinatorPhone: '0181', isActive: true
    }
  ];

  const mockDonations: Donation[] = [
    {
      id: 'don-1', donorId: 'D1', donorUserId: 'u1', donorName: 'Donor 1', bloodGroup: 'O+',
      donationDate: '2026-09-01', hospital: 'Dhamrai Health Complex', units: 1, donationType: 'Whole Blood',
      verifiedBy: 'এডমিন', verificationDate: '2026-09-01'
    }
  ];

  const regional = calculateRegionalAnalytics(mockDonors, mockRequests, mockDonations, mockBranches);
  if (regional.length !== 2) {
    throw new Error('Regional analytics must compute for all active branches.');
  }
  for (const reg of regional) {
    console.log(`  Region [${reg.regionName}]: Donors: ${reg.donorCount}, Requests: ${reg.requestCount}, Fulfillment: ${reg.fulfillmentRate}%`);
  }

  // Test 4: Financial Performance Analysis
  console.log('\n✓ Test 4: Financial Analytics Summary:');
  const mockFundDonations: FundDonation[] = [
    {
      id: 'fd-1', donorName: 'দাতার নাম', donorPhone: '017', amount: 8000, paymentMethod: 'bKash',
      transactionId: 'TX1', fundCause: 'general', isAnonymous: false, status: 'verified',
      organizationId: 'org-roktobondon', createdAt: '2026-09-01'
    }
  ];

  const mockDisbursements: FundDisbursement[] = [
    {
      id: 'ds-1', title: 'রোগী সহায়তা', amount: 3000, recipient: 'রোগী', area: 'ধামরাই',
      cause: 'emergency_patient', approvedBy: 'এডমিন', voucherNo: 'VCH-01', date: '2026-09-01'
    }
  ];

  const financial = calculateFinancialAnalytics(mockFundDonations, mockDisbursements);
  console.log(`  Total Collections: ৳ ${financial.totalCollected.toLocaleString()}`);
  console.log(`  Total Disbursed: ৳ ${financial.totalDisbursed.toLocaleString()}`);
  console.log(`  Net Reserve: ৳ ${financial.netReserve.toLocaleString()}`);

  if (financial.totalCollected !== 8000 || financial.totalDisbursed !== 3000 || financial.netReserve !== 5000) {
    throw new Error('Financial summary calculations mismatch.');
  }

  // Test 5: Comprehensive Report Generation
  console.log('\n✓ Test 5: Full Comprehensive Analytics Report Generation:');
  const report = generateComprehensiveReport({
    donors: mockDonors,
    requests: mockRequests,
    donations: mockDonations,
    fundDonations: mockFundDonations,
    fundDisbursements: mockDisbursements,
    branches: mockBranches,
    timeWindow: '30d'
  });

  if (!report.generatedAt || !report.overview || report.supplyDemand.length !== 8 || report.regionalDistribution.length !== 2) {
    throw new Error('Comprehensive analytics report format is invalid.');
  }
  console.log(`  Generated At: ${report.generatedAt}`);
  console.log(`  Time Window: ${report.timeWindow}`);
  console.log(`  Overview Donors: ${report.overview.totalDonors}, Requests: ${report.overview.totalRequests}, Reserve: ৳ ${report.overview.netFundReserve}`);

  console.log('\n🎉 ALL Phase 12 Analytics & Reporting Engine Tests Passed Successfully!');
}

runAnalyticsEngineTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
