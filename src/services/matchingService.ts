import type { BloodGroup, Donor, MatchResult } from '../types';

/**
 * Standard Blood Compatibility Matrix
 * Recipient Group -> Array of compatible Donor Groups
 */
export const COMPATIBILITY_MATRIX: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

export function isBloodCompatible(recipientGroup: BloodGroup, donorGroup: BloodGroup): boolean {
  const allowed = COMPATIBILITY_MATRIX[recipientGroup] || [];
  return allowed.includes(donorGroup);
}

export interface MatchCriteria {
  patientBloodGroup: BloodGroup;
  district?: string;
  upazila?: string;
  isEmergency?: boolean;
}

/**
 * Smart Matching Algorithm
 * Scoring:
 * Blood Compatibility — 40 (Exact match: 40, Compatible alternative: 32)
 * Availability — 20 (Available: 20, Unavailable: 0)
 * Verified — 15 (Verified: 15, Pending: 5, Unverified: 0)
 * Location — 15 (Same Upazila: 15, Same District: 10, Other: 3)
 * Emergency Availability — 10 (If emergency flag set and donor is emergency ready: 10)
 * Total Score = 100
 */
export function calculateMatchScore(donor: Donor, criteria: MatchCriteria): {
  totalScore: number;
  breakdown: MatchResult['breakdown'];
} {
  let bloodScore = 0;
  if (donor.bloodGroup === criteria.patientBloodGroup) {
    bloodScore = 40;
  } else if (isBloodCompatible(criteria.patientBloodGroup, donor.bloodGroup)) {
    bloodScore = 32;
  }

  const availabilityScore = donor.availability ? 20 : 0;

  let verifiedScore = 0;
  if (donor.verificationStatus === 'verified') {
    verifiedScore = 15;
  } else if (donor.verificationStatus === 'pending') {
    verifiedScore = 5;
  }

  let locationScore = 3;
  if (criteria.district && donor.district.toLowerCase() === criteria.district.toLowerCase()) {
    if (criteria.upazila && donor.upazila.toLowerCase() === criteria.upazila.toLowerCase()) {
      locationScore = 15;
    } else {
      locationScore = 10;
    }
  }

  let emergencyScore = 0;
  if (criteria.isEmergency) {
    emergencyScore = donor.emergencyAvailable ? 10 : 0;
  } else {
    emergencyScore = donor.emergencyAvailable ? 10 : 5;
  }

  const totalScore = Math.min(100, bloodScore + availabilityScore + verifiedScore + locationScore + emergencyScore);

  return {
    totalScore,
    breakdown: {
      bloodCompatibility: bloodScore,
      availability: availabilityScore,
      verified: verifiedScore,
      location: locationScore,
      emergency: emergencyScore,
    },
  };
}

export function findCompatibleDonors(
  donors: Donor[],
  criteria: MatchCriteria,
  minScore: number = 25
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const donor of donors) {
    // Only consider donors whose blood is compatible
    if (!isBloodCompatible(criteria.patientBloodGroup, donor.bloodGroup)) {
      continue;
    }

    // Do not include suspended or rejected donors
    if (donor.verificationStatus === 'suspended' || donor.verificationStatus === 'rejected') {
      continue;
    }

    const { totalScore, breakdown } = calculateMatchScore(donor, criteria);

    if (totalScore >= minScore) {
      results.push({
        donor,
        matchScore: totalScore,
        breakdown,
      });
    }
  }

  // Sort descending by matchScore
  return results.sort((a, b) => b.matchScore - a.matchScore);
}
