import type { BloodGroup, Donor, MatchResult } from '../types';
import type { MatchingWeightsConfig, DonorEligibilityConfig } from '../types/config';
import { DEFAULT_COMPATIBILITY_MATRIX } from './compatibilityService';

/**
 * Default Matching Engine Weights
 */
export const DEFAULT_MATCHING_WEIGHTS: MatchingWeightsConfig = {
  compatibilityWeight: 35,
  distanceWeight: 20,
  availabilityWeight: 15,
  eligibilityWeight: 10,
  verificationWeight: 10,
  reliabilityWeight: 5,
  responseRateWeight: 0,
  emergencyWeight: 5,
  maxSearchRadiusKm: 50,
  strictEligibility: false,
};

/**
 * Default Donor Eligibility Rules
 */
export const DEFAULT_DONOR_ELIGIBILITY: DonorEligibilityConfig = {
  minimumDonationIntervalDays: 90,
  femaleMinimumDonationIntervalDays: 120,
  minimumAge: 18,
  maximumAge: 65,
  minimumWeightKg: 45,
  temporaryDeferralEnabled: true,
  requireVerification: false,
  requireAvailability: true,
};

/**
 * Compatibility matrix lookup
 */
export function isBloodCompatible(
  recipientGroup: BloodGroup,
  donorGroup: BloodGroup,
  customMatrix?: Record<BloodGroup, BloodGroup[]>
): boolean {
  const matrix = customMatrix || DEFAULT_COMPATIBILITY_MATRIX;
  const allowed = matrix[recipientGroup] || [];
  return allowed.includes(donorGroup);
}

export interface MatchCriteria {
  patientBloodGroup: BloodGroup;
  division?: string;
  district?: string;
  upazila?: string;
  isEmergency?: boolean;
}

export interface MatchEngineOptions {
  weights?: Partial<MatchingWeightsConfig>;
  eligibilityConfig?: Partial<DonorEligibilityConfig>;
  compatibilityMatrix?: Record<BloodGroup, BloodGroup[]>;
  minScore?: number;
}

export interface DonorEligibilityEvaluation {
  isEligible: boolean;
  status: 'eligible' | 'ineligible' | 'deferred';
  reasons: string[];
  daysSinceLastDonation?: number;
  daysUntilEligible?: number;
}

/**
 * Evaluates donor medical & health eligibility based on configuration rules
 */
export function evaluateDonorEligibility(
  donor: Donor,
  config: Partial<DonorEligibilityConfig> = {}
): DonorEligibilityEvaluation {
  const rules: DonorEligibilityConfig = {
    ...DEFAULT_DONOR_ELIGIBILITY,
    ...config,
  };

  const reasons: string[] = [];
  let isDeferred = false;

  // 1. Temporary Deferral Check
  if (rules.temporaryDeferralEnabled) {
    if (donor.temporaryDeferral) {
      isDeferred = true;
      reasons.push(donor.deferralReason ? `সাময়িক স্থগিতাদেশ: ${donor.deferralReason}` : 'সাময়িক স্থগিতাদেশ সক্রিয়');
    }
    if (donor.deferralUntil) {
      const deferralDate = new Date(donor.deferralUntil);
      if (!isNaN(deferralDate.getTime()) && deferralDate > new Date()) {
        isDeferred = true;
        reasons.push(`স্থগিতাদেশ কার্যকর: ${donor.deferralUntil} পর্যন্ত`);
      }
    }
  }

  // 2. Donation Interval Check
  let daysSinceLastDonation: number | undefined;
  let daysUntilEligible = 0;

  if (donor.lastDonationDate) {
    const lastDate = new Date(donor.lastDonationDate);
    if (!isNaN(lastDate.getTime())) {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      daysSinceLastDonation = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      const requiredInterval =
        donor.gender === 'female'
          ? rules.femaleMinimumDonationIntervalDays
          : rules.minimumDonationIntervalDays;

      if (daysSinceLastDonation < requiredInterval) {
        daysUntilEligible = requiredInterval - daysSinceLastDonation;
        reasons.push(
          `সর্বশেষ রক্তদানের পর মাত্র ${daysSinceLastDonation} দিন অতিবাহিত হয়েছে (ন্যূনতম বিরতি ${requiredInterval} দিন, আরও ${daysUntilEligible} দিন বাকি)`
        );
      }
    }
  }

  // 3. Weight Check (if weight is recorded on donor)
  if (donor.weight && donor.weight < rules.minimumWeightKg) {
    reasons.push(`ওজন অপর্যাপ্ত: ${donor.weight} কেজি (ন্যূনতম ${rules.minimumWeightKg} কেজি প্রয়োজন)`);
  }

  // 4. Age Check (if age or dateOfBirth is present)
  if (donor.age) {
    if (donor.age < rules.minimumAge) {
      reasons.push(`বয়স কম: ${donor.age} বছর (ন্যূনতম ${rules.minimumAge} বছর)`);
    } else if (donor.age > rules.maximumAge) {
      reasons.push(`বয়স বেশি: ${donor.age} বছর (সর্বোচ্চ ${rules.maximumAge} বছর)`);
    }
  }

  // 5. Verification Requirement
  if (rules.requireVerification && donor.verificationStatus !== 'verified') {
    reasons.push('প্রোফাইল যাচাইকৃত নয় (যাচাইকরণ বাধ্যতামূলক)');
  }

  // 6. Availability Requirement
  if (rules.requireAvailability && !donor.availability) {
    reasons.push('রক্তদাতা বর্তমানে অনুপলব্ধ (Not Available)');
  }

  // Determine final status
  let status: 'eligible' | 'ineligible' | 'deferred' = 'eligible';
  if (isDeferred) {
    status = 'deferred';
  } else if (reasons.length > 0) {
    status = 'ineligible';
  }

  return {
    isEligible: status === 'eligible',
    status,
    reasons,
    daysSinceLastDonation,
    daysUntilEligible: daysUntilEligible > 0 ? daysUntilEligible : undefined,
  };
}

/**
 * Smart Matching Algorithm
 * Calculates dynamic match score based on centralized matching weights and donor metrics
 */
export function calculateMatchScore(
  donor: Donor,
  criteria: MatchCriteria,
  options: MatchEngineOptions = {}
): {
  totalScore: number;
  breakdown: MatchResult['breakdown'];
  eligibility: DonorEligibilityEvaluation;
} {
  const weights: MatchingWeightsConfig = {
    ...DEFAULT_MATCHING_WEIGHTS,
    ...(options.weights || {}),
  };

  const matrix = options.compatibilityMatrix || DEFAULT_COMPATIBILITY_MATRIX;
  const eligibility = evaluateDonorEligibility(donor, options.eligibilityConfig);

  // 1. Blood Compatibility Score
  let bloodScore = 0;
  if (donor.bloodGroup === criteria.patientBloodGroup) {
    bloodScore = weights.compatibilityWeight;
  } else if (isBloodCompatible(criteria.patientBloodGroup, donor.bloodGroup, matrix)) {
    bloodScore = Math.round(weights.compatibilityWeight * 0.8);
  }

  // 2. Availability Score
  const availabilityScore = donor.availability ? weights.availabilityWeight : 0;

  // 3. Verification Score
  let verifiedScore = 0;
  if (donor.verificationStatus === 'verified') {
    verifiedScore = weights.verificationWeight;
  } else if (donor.verificationStatus === 'pending') {
    verifiedScore = Math.round(weights.verificationWeight * 0.35);
  }

  // 4. Location Proximity Score
  let locationScore = Math.round(weights.distanceWeight * 0.2); // Base floor
  if (criteria.district && donor.district && donor.district.toLowerCase() === criteria.district.toLowerCase()) {
    if (criteria.upazila && donor.upazila && donor.upazila.toLowerCase() === criteria.upazila.toLowerCase()) {
      locationScore = weights.distanceWeight; // Exact upazila match
    } else {
      locationScore = Math.round(weights.distanceWeight * 0.65); // Same district match
    }
  } else if (criteria.division && donor.division && donor.division.toLowerCase() === criteria.division.toLowerCase()) {
    locationScore = Math.round(weights.distanceWeight * 0.4);
  }

  // 5. Emergency Readiness Score
  let emergencyScore = 0;
  if (criteria.isEmergency) {
    emergencyScore = donor.emergencyAvailable ? weights.emergencyWeight : 0;
  } else {
    emergencyScore = donor.emergencyAvailable
      ? weights.emergencyWeight
      : Math.round(weights.emergencyWeight * 0.5);
  }

  // 6. Medical Eligibility Score
  const eligibilityScore = eligibility.isEligible ? weights.eligibilityWeight : 0;

  // 7. Reliability Score (Donation count & track record)
  let reliabilityScore = 0;
  const donationCount = donor.donationCount || donor.totalDonations || 0;
  if (donationCount >= 5) {
    reliabilityScore = weights.reliabilityWeight;
  } else if (donationCount >= 1) {
    reliabilityScore = Math.round(weights.reliabilityWeight * 0.6);
  } else {
    reliabilityScore = Math.round(weights.reliabilityWeight * 0.3);
  }

  // 8. Response Rate Score
  const responseRateScore = donor.availability ? weights.responseRateWeight : 0;

  const totalRawScore =
    bloodScore +
    availabilityScore +
    verifiedScore +
    locationScore +
    emergencyScore +
    eligibilityScore +
    reliabilityScore +
    responseRateScore;

  const totalScore = Math.min(100, Math.max(0, totalRawScore));

  return {
    totalScore,
    breakdown: {
      bloodCompatibility: bloodScore,
      availability: availabilityScore,
      verified: verifiedScore,
      location: locationScore,
      emergency: emergencyScore,
      eligibility: eligibilityScore,
      reliability: reliabilityScore,
      responseRate: responseRateScore,
    },
    eligibility,
  };
}

/**
 * Finds and ranks compatible donors according to matching criteria and central configuration
 */
export function findCompatibleDonors(
  donors: Donor[],
  criteria: MatchCriteria,
  options: MatchEngineOptions | number = {}
): MatchResult[] {
  // Support legacy minScore signature `findCompatibleDonors(donors, criteria, minScore)`
  const opts: MatchEngineOptions = typeof options === 'number' ? { minScore: options } : options;
  const minScore = opts.minScore ?? 20;
  const weights: MatchingWeightsConfig = {
    ...DEFAULT_MATCHING_WEIGHTS,
    ...(opts.weights || {}),
  };
  const matrix = opts.compatibilityMatrix || DEFAULT_COMPATIBILITY_MATRIX;
  const strictEligibility = weights.strictEligibility;

  const results: MatchResult[] = [];

  for (const donor of donors) {
    // 1. Incompatible blood group check
    if (!isBloodCompatible(criteria.patientBloodGroup, donor.bloodGroup, matrix)) {
      continue;
    }

    // 2. Suspended / rejected status check
    if (donor.verificationStatus === 'suspended' || donor.verificationStatus === 'rejected') {
      continue;
    }

    const { totalScore, breakdown, eligibility } = calculateMatchScore(donor, criteria, opts);

    // 3. Strict eligibility filter
    if (strictEligibility && !eligibility.isEligible) {
      continue;
    }

    if (totalScore >= minScore) {
      results.push({
        donor,
        matchScore: totalScore,
        breakdown,
        eligibilityStatus: eligibility.status,
        reasons: eligibility.reasons,
      });
    }
  }

  // Sort descending by matchScore
  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Formats a user-friendly summary of the matching engine weights
 */
export function formatMatchScoreDescription(weights: MatchingWeightsConfig = DEFAULT_MATCHING_WEIGHTS): string {
  const parts: string[] = [];
  if (weights.compatibilityWeight > 0) parts.push(`রক্তের গ্রুপ (${weights.compatibilityWeight})`);
  if (weights.distanceWeight > 0) parts.push(`দূরত্ব ও অবস্থান (${weights.distanceWeight})`);
  if (weights.availabilityWeight > 0) parts.push(`প্রাপ্যতা (${weights.availabilityWeight})`);
  if (weights.verificationWeight > 0) parts.push(`ভেরিফিকেশন (${weights.verificationWeight})`);
  if (weights.eligibilityWeight > 0) parts.push(`স্বাস্থ্য যোগ্যতা (${weights.eligibilityWeight})`);
  if (weights.emergencyWeight > 0) parts.push(`জরুরি প্রস্তুতি (${weights.emergencyWeight})`);

  return `অ্যালগরিদম স্কোরিং: ${parts.join(' + ')} = ১০০ পয়েন্ট`;
}
