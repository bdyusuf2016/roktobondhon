import type { Donor, Donation, DonorBadge } from '../types';
import type { GamificationSettingsConfig } from '../types/config';
import { DONOR_BADGES_LIST } from '../data/seedData';

export interface DonorGamificationProfile {
  donorId: string;
  fullName: string;
  totalDonations: number;
  earnedPoints: number;
  currentTier: 'rookie' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
  currentTierLabelBn: string;
  currentTierColor: string;
  nextTier: string | null;
  donationsToNextTier: number;
  progressPercentage: number;
  isEligibleForCertificate: boolean;
  earnedBadges: DonorBadge[];
}

export interface LeaderboardEntry {
  rank: number;
  donorId: string;
  fullName: string;
  bloodGroup: string;
  district: string;
  upazila: string;
  totalDonations: number;
  points: number;
  tier: string;
  tierColor: string;
  badgeTitle: string;
}

/**
 * Calculates a donor's gamification points, tier, and next milestone progress
 */
export function calculateDonorGamification(
  donor: Donor,
  config: GamificationSettingsConfig,
  donations?: Donation[]
): DonorGamificationProfile {
  const totalDonations = donor.totalDonations || 0;
  const milestones = config.donorLevelMilestones || {
    bronze: 1,
    silver: 3,
    gold: 5,
    platinum: 10,
    legend: 20,
  };

  // Calculate emergency donations count if donation records provided
  const emergencyDonationsCount = donations
    ? donations.filter((d) => d.donorId === donor.donorId || d.donorId === donor.id).length
    : 0;

  const pointsPerDonation = config.pointsPerDonation || 100;
  const pointsPerEmergency = config.pointsPerEmergencyDonation || 150;

  const earnedPoints =
    totalDonations * pointsPerDonation + emergencyDonationsCount * (pointsPerEmergency - pointsPerDonation);

  let currentTier: DonorGamificationProfile['currentTier'] = 'rookie';
  let currentTierLabelBn = 'নবীন রক্তদাতা';
  let currentTierColor = '#64748b';
  let nextTier: string | null = 'ব্রোঞ্জ রক্তদাতা (১ম স্তর)';
  let targetForNext = milestones.bronze;
  let prevTarget = 0;

  if (totalDonations >= milestones.legend) {
    currentTier = 'legend';
    currentTierLabelBn = 'কিংবদন্তি রক্তদাতা (লেজেন্ড)';
    currentTierColor = '#f59e0b';
    nextTier = null;
    targetForNext = milestones.legend;
    prevTarget = milestones.platinum;
  } else if (totalDonations >= milestones.platinum) {
    currentTier = 'platinum';
    currentTierLabelBn = 'প্লাটিনাম রক্তদাতা';
    currentTierColor = '#8b5cf6';
    nextTier = 'কিংবদন্তি রক্তদাতা';
    targetForNext = milestones.legend;
    prevTarget = milestones.platinum;
  } else if (totalDonations >= milestones.gold) {
    currentTier = 'gold';
    currentTierLabelBn = 'স্বর্ণপদক প্রাপ্ত রক্তদাতা';
    currentTierColor = '#eab308';
    nextTier = 'প্লাটিনাম রক্তদাতা';
    targetForNext = milestones.platinum;
    prevTarget = milestones.gold;
  } else if (totalDonations >= milestones.silver) {
    currentTier = 'silver';
    currentTierLabelBn = 'রৌপ্যপদক প্রাপ্ত রক্তদাতা';
    currentTierColor = '#0284c7';
    nextTier = 'স্বর্ণপদক প্রাপ্ত রক্তদাতা';
    targetForNext = milestones.gold;
    prevTarget = milestones.silver;
  } else if (totalDonations >= milestones.bronze) {
    currentTier = 'bronze';
    currentTierLabelBn = 'ব্রোঞ্জ রক্তদাতা';
    currentTierColor = '#b45309';
    nextTier = 'রৌপ্যপদক প্রাপ্ত রক্তদাতা';
    targetForNext = milestones.silver;
    prevTarget = milestones.bronze;
  }

  const donationsToNextTier = nextTier ? Math.max(0, targetForNext - totalDonations) : 0;
  const range = targetForNext - prevTarget;
  const progressPercentage = nextTier
    ? Math.min(100, Math.max(0, Math.round(((totalDonations - prevTarget) / (range || 1)) * 100)))
    : 100;

  const isEligibleForCertificate =
    (!config.requireVerificationForCertificate || donor.verificationStatus === 'verified') &&
    totalDonations >= milestones.bronze;

  const earnedBadges = DONOR_BADGES_LIST.filter(
    (b) => totalDonations >= b.minDonations
  );

  return {
    donorId: donor.donorId,
    fullName: donor.fullName,
    totalDonations,
    earnedPoints,
    currentTier,
    currentTierLabelBn,
    currentTierColor,
    nextTier,
    donationsToNextTier,
    progressPercentage,
    isEligibleForCertificate,
    earnedBadges,
  };
}

/**
 * Generates an authoritative ranked leaderboard of voluntary blood donors
 */
export function getLeaderboard(
  donors: Donor[],
  config: GamificationSettingsConfig,
  options?: {
    limit?: number;
    bloodGroup?: string;
    district?: string;
  }
): LeaderboardEntry[] {
  let list = [...donors];

  if (options?.bloodGroup && options.bloodGroup !== 'all') {
    list = list.filter((d) => d.bloodGroup === options.bloodGroup);
  }
  if (options?.district && options.district !== 'all') {
    list = list.filter((d) => d.district === options.district);
  }

  // Sort by total donations (descending), then earliest createdAt
  list.sort((a, b) => {
    if (b.totalDonations !== a.totalDonations) {
      return b.totalDonations - a.totalDonations;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const limit = options?.limit || 50;
  const topList = list.slice(0, limit);

  return topList.map((donor, idx) => {
    const profile = calculateDonorGamification(donor, config);
    const badge = profile.earnedBadges[profile.earnedBadges.length - 1];

    return {
      rank: idx + 1,
      donorId: donor.donorId,
      fullName: donor.fullName,
      bloodGroup: donor.bloodGroup,
      district: donor.district,
      upazila: donor.upazila,
      totalDonations: donor.totalDonations,
      points: profile.earnedPoints,
      tier: profile.currentTierLabelBn,
      tierColor: profile.currentTierColor,
      badgeTitle: badge?.titleBn || 'রক্তবন্ধু',
    };
  });
}

/**
 * Validates the authenticity of a blood donor appreciation certificate
 */
export function verifyCertificateAuthenticity(
  query: string,
  donors: Donor[],
  config: GamificationSettingsConfig
): {
  isValid: boolean;
  donor?: Donor;
  gamification?: DonorGamificationProfile;
  message: string;
} {
  if (!query || !query.trim()) {
    return { isValid: false, message: 'অনুগ্রহ করে সঠিক ডোনার আইডি বা কোড প্রদান করুন।' };
  }

  const clean = query.trim().toLowerCase();
  const donor = donors.find(
    (d) =>
      d.donorId.toLowerCase() === clean ||
      d.id.toLowerCase() === clean ||
      d.phone === clean
  );

  if (!donor) {
    return { isValid: false, message: 'প্রদত্ত আইডি অনুসারে কোনো রক্তদাতার রেকর্ড পাওয়া যায়নি।' };
  }

  const profile = calculateDonorGamification(donor, config);

  if (!profile.isEligibleForCertificate) {
    return {
      isValid: false,
      donor,
      gamification: profile,
      message: 'রক্তদাতা এখনো সনদপত্র অর্জনের ন্যূনতম শর্ত (১টি রক্তদান বা ভেরিফিকেশন) পূরণ করেননি।',
    };
  }

  return {
    isValid: true,
    donor,
    gamification: profile,
    message: 'সনদপত্রটি ১০০% আসল ও ভেরিফাইড।',
  };
}
