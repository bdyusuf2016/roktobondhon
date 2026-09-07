import type {
  Donor,
  BloodRequest,
  Donation,
  FundDonation,
  FundDisbursement,
  BloodGroup,
  LocationItem,
  Branch
} from '../types';

export interface BloodGroupSupplyDemand {
  group: BloodGroup;
  donorCount: number;
  availableDonors: number;
  requestCount: number;
  fulfilledCount: number;
  shortageLevel: 'SURPLUS' | 'BALANCED' | 'MODERATE_SHORTAGE' | 'CRITICAL_SHORTAGE';
  ratio: number; // Available Donors / Requests
}

export interface FulfillmentMetrics {
  totalRequests: number;
  fulfilledRequests: number;
  activeRequests: number;
  criticalRequests: number;
  fulfillmentRate: number; // percentage
  emergencyFulfillmentRate: number;
}

export interface RegionalAnalyticsItem {
  regionName: string;
  donorCount: number;
  requestCount: number;
  donationCount: number;
  fulfillmentRate: number;
}

export interface FinancialAnalyticsSummary {
  totalCollected: number;
  totalDisbursed: number;
  netReserve: number;
  donorCount: number;
  disbursementCount: number;
  averageDonationAmount: number;
}

export interface ComprehensiveAnalyticsReport {
  generatedAt: string;
  timeWindow: '7d' | '30d' | '90d' | 'all';
  overview: {
    totalDonors: number;
    verifiedDonors: number;
    totalRequests: number;
    fulfilledRequests: number;
    fulfillmentRate: number;
    totalUnitsCollected: number;
    netFundReserve: number;
  };
  supplyDemand: BloodGroupSupplyDemand[];
  regionalDistribution: RegionalAnalyticsItem[];
  financialSummary: FinancialAnalyticsSummary;
}

const ALL_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

/**
 * Calculate Supply vs Demand Index for all 8 blood groups
 */
export function calculateBloodSupplyDemandIndex(
  donors: Donor[],
  requests: BloodRequest[]
): BloodGroupSupplyDemand[] {
  return ALL_BLOOD_GROUPS.map((group) => {
    const groupDonors = donors.filter((d) => d.bloodGroup === group);
    const availableDonors = groupDonors.filter((d) => d.availability && d.verificationStatus === 'verified').length;
    const groupRequests = requests.filter((r) => r.bloodGroup === group);
    const fulfilledRequests = groupRequests.filter((r) => r.status === 'fulfilled').length;

    const reqCount = groupRequests.length;
    const ratio = reqCount > 0 ? Number((availableDonors / reqCount).toFixed(2)) : availableDonors;

    let shortageLevel: BloodGroupSupplyDemand['shortageLevel'] = 'BALANCED';
    if (availableDonors === 0 && reqCount > 0) {
      shortageLevel = 'CRITICAL_SHORTAGE';
    } else if (ratio < 1.0) {
      shortageLevel = 'MODERATE_SHORTAGE';
    } else if (ratio >= 2.5) {
      shortageLevel = 'SURPLUS';
    }

    return {
      group,
      donorCount: groupDonors.length,
      availableDonors,
      requestCount: reqCount,
      fulfilledCount: fulfilledRequests,
      shortageLevel,
      ratio,
    };
  });
}

/**
 * Calculate Blood Request Fulfillment and Crisis Velocity metrics
 */
export function calculateFulfillmentMetrics(requests: BloodRequest[]): FulfillmentMetrics {
  const totalRequests = requests.length;
  const fulfilledRequests = requests.filter((r) => r.status === 'fulfilled').length;
  const activeRequests = requests.filter((r) => r.status === 'active' || r.status === 'matched').length;
  const criticalRequests = requests.filter((r) => r.emergencyLevel === 'CRITICAL').length;
  const criticalFulfilled = requests.filter((r) => r.emergencyLevel === 'CRITICAL' && r.status === 'fulfilled').length;

  const fulfillmentRate = totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0;
  const emergencyFulfillmentRate = criticalRequests > 0 ? Math.round((criticalFulfilled / criticalRequests) * 100) : 100;

  return {
    totalRequests,
    fulfilledRequests,
    activeRequests,
    criticalRequests,
    fulfillmentRate,
    emergencyFulfillmentRate,
  };
}

/**
 * Calculate Regional Coverage and Performance Metrics
 */
export function calculateRegionalAnalytics(
  donors: Donor[],
  requests: BloodRequest[],
  donations: Donation[],
  branches: Branch[]
): RegionalAnalyticsItem[] {
  return branches.map((branch) => {
    const regionDonors = donors.filter(
      (d) => d.district === branch.district || d.upazila === branch.upazila
    ).length;

    const regionRequests = requests.filter(
      (r) => r.district === branch.district || r.upazila === branch.upazila
    );

    const regionDonations = donations.filter(
      (d) => d.hospital.includes(branch.upazila) || d.hospital.includes(branch.district)
    ).length;

    const fulfilledCount = regionRequests.filter((r) => r.status === 'fulfilled').length;
    const rate = regionRequests.length > 0 ? Math.round((fulfilledCount / regionRequests.length) * 100) : 0;

    return {
      regionName: `${branch.nameBn} (${branch.upazila})`,
      donorCount: regionDonors,
      requestCount: regionRequests.length,
      donationCount: regionDonations,
      fulfillmentRate: rate,
    };
  });
}

/**
 * Calculate Financial Analytics Summary
 */
export function calculateFinancialAnalytics(
  fundDonations: FundDonation[],
  fundDisbursements: FundDisbursement[]
): FinancialAnalyticsSummary {
  const verifiedDonations = fundDonations.filter((d) => d.status === 'verified');
  const totalCollected = verifiedDonations.reduce((sum, d) => sum + d.amount, 0);
  const totalDisbursed = fundDisbursements.reduce((sum, d) => sum + d.amount, 0);
  const netReserve = totalCollected - totalDisbursed;
  const avgDonation = verifiedDonations.length > 0 ? Math.round(totalCollected / verifiedDonations.length) : 0;

  return {
    totalCollected,
    totalDisbursed,
    netReserve,
    donorCount: verifiedDonations.length,
    disbursementCount: fundDisbursements.length,
    averageDonationAmount: avgDonation,
  };
}

/**
 * Generate full comprehensive exportable analytics report
 */
export function generateComprehensiveReport(params: {
  donors: Donor[];
  requests: BloodRequest[];
  donations: Donation[];
  fundDonations: FundDonation[];
  fundDisbursements: FundDisbursement[];
  branches: Branch[];
  timeWindow?: '7d' | '30d' | '90d' | 'all';
}): ComprehensiveAnalyticsReport {
  const { donors, requests, donations, fundDonations, fundDisbursements, branches, timeWindow = 'all' } = params;

  const fulfillment = calculateFulfillmentMetrics(requests);
  const supplyDemand = calculateBloodSupplyDemandIndex(donors, requests);
  const regionalDistribution = calculateRegionalAnalytics(donors, requests, donations, branches);
  const financialSummary = calculateFinancialAnalytics(fundDonations, fundDisbursements);

  const totalUnits = donations.reduce((sum, d) => sum + d.units, 0);

  return {
    generatedAt: new Date().toISOString(),
    timeWindow,
    overview: {
      totalDonors: donors.length,
      verifiedDonors: donors.filter((d) => d.verificationStatus === 'verified').length,
      totalRequests: requests.length,
      fulfilledRequests: fulfillment.fulfilledRequests,
      fulfillmentRate: fulfillment.fulfillmentRate,
      totalUnitsCollected: totalUnits,
      netFundReserve: financialSummary.netReserve,
    },
    supplyDemand,
    regionalDistribution,
    financialSummary,
  };
}
