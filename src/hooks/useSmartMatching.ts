import { useMemo } from 'react';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import {
  findCompatibleDonors,
  calculateMatchScore,
  evaluateDonorEligibility,
  MatchCriteria,
  MatchEngineOptions,
} from '../services/matchingService';
import type { Donor, MatchResult } from '../types';

export function useSmartMatching(
  donors: Donor[],
  criteria: MatchCriteria | null,
  customOptions?: Partial<MatchEngineOptions>
): {
  matchedDonors: MatchResult[];
  weightsDescription: string;
  totalMatched: number;
} {
  const { config } = useSystemConfig();

  const options: MatchEngineOptions = useMemo(() => {
    return {
      weights: customOptions?.weights || config.matching,
      eligibilityConfig: customOptions?.eligibilityConfig || config.donorEligibility,
      minScore: customOptions?.minScore ?? 20,
      ...customOptions,
    };
  }, [config.matching, config.donorEligibility, customOptions]);

  const matchedDonors = useMemo(() => {
    if (!criteria || !criteria.patientBloodGroup) return [];
    return findCompatibleDonors(donors, criteria, options);
  }, [donors, criteria, options]);

  const weightsDescription = useMemo(() => {
    const w = options.weights || config.matching;
    const parts: string[] = [];
    if (w.compatibilityWeight) parts.push(`রক্তের সামঞ্জস্য (${w.compatibilityWeight})`);
    if (w.availabilityWeight) parts.push(`প্রাপ্যতা (${w.availabilityWeight})`);
    if (w.verificationWeight) parts.push(`ভেরিফিকেশন (${w.verificationWeight})`);
    if (w.distanceWeight) parts.push(`অবস্থান (${w.distanceWeight})`);
    if (w.eligibilityWeight) parts.push(`মেডিকেল যোগ্যতা (${w.eligibilityWeight})`);
    if (w.emergencyWeight) parts.push(`জরুরি প্রস্তুতি (${w.emergencyWeight})`);
    return parts.length > 0 ? `অ্যালগরিদম: ${parts.join(' + ')}` : 'স্মার্ট স্কোরিং অ্যালগরিদম';
  }, [options.weights, config.matching]);

  return {
    matchedDonors,
    weightsDescription,
    totalMatched: matchedDonors.length,
  };
}

export { findCompatibleDonors, calculateMatchScore, evaluateDonorEligibility };
