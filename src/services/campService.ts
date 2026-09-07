import type { BloodCamp, CampRegistration } from '../types';

export interface CampFilterParams {
  status?: 'all' | 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  district?: string;
  searchTerm?: string;
}

export interface CampMetrics {
  totalCamps: number;
  upcomingCamps: number;
  ongoingCamps: number;
  completedCamps: number;
  totalTargetUnits: number;
  totalCollectedUnits: number;
  totalRegistrations: number;
  fulfillmentRate: number;
}

/**
 * Filter blood donation camps based on status, location, and search text
 */
export function filterCamps(camps: BloodCamp[], params?: CampFilterParams): BloodCamp[] {
  if (!params) return camps;
  const { status = 'all', district = 'all', searchTerm = '' } = params;

  return camps.filter((camp) => {
    // Status match
    if (status !== 'all' && camp.status !== status) {
      return false;
    }

    // District match
    if (district !== 'all' && camp.district !== district) {
      return false;
    }

    // Search term match
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const matchTitle = camp.titleBn?.toLowerCase().includes(q) || camp.titleEn?.toLowerCase().includes(q);
      const matchVenue = camp.venueAddress?.toLowerCase().includes(q) || camp.upazila?.toLowerCase().includes(q);
      const matchOrganizer = camp.organizerName?.toLowerCase().includes(q);
      const matchContact = camp.contactPerson?.toLowerCase().includes(q) || camp.contactPhone?.includes(q);

      if (!matchTitle && !matchVenue && !matchOrganizer && !matchContact) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate aggregate performance and readiness metrics across all blood drives
 */
export function calculateCampMetrics(camps: BloodCamp[]): CampMetrics {
  const totalCamps = camps.length;
  let upcomingCamps = 0;
  let ongoingCamps = 0;
  let completedCamps = 0;
  let totalTargetUnits = 0;
  let totalCollectedUnits = 0;
  let totalRegistrations = 0;

  for (const camp of camps) {
    if (camp.status === 'upcoming') upcomingCamps++;
    else if (camp.status === 'ongoing') ongoingCamps++;
    else if (camp.status === 'completed') completedCamps++;

    totalTargetUnits += camp.targetUnits || 0;
    totalCollectedUnits += camp.collectedUnits || 0;
    totalRegistrations += camp.registeredCount || 0;
  }

  const fulfillmentRate =
    totalTargetUnits > 0
      ? Math.min(100, Math.round((totalCollectedUnits / totalTargetUnits) * 100))
      : 0;

  return {
    totalCamps,
    upcomingCamps,
    ongoingCamps,
    completedCamps,
    totalTargetUnits,
    totalCollectedUnits,
    totalRegistrations,
    fulfillmentRate,
  };
}

/**
 * Validate a new or edited blood camp payload
 */
export function validateCampPayload(camp: Partial<BloodCamp>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!camp.titleBn || !camp.titleBn.trim()) {
    errors.push('ক্যাম্পের বাংলা নাম প্রদান করা আবশ্যক।');
  }
  if (!camp.venueAddress || !camp.venueAddress.trim()) {
    errors.push('ক্যাম্পের ভেন্যু ও পূর্ণাঙ্গ ঠিকানা প্রদান করা আবশ্যক।');
  }
  if (!camp.district || !camp.district.trim()) {
    errors.push('জেলা নির্বাচন করা আবশ্যক।');
  }
  if (!camp.startDate) {
    errors.push('শুরুর তারিখ নির্ধারণ করা আবশ্যক।');
  }
  if (!camp.targetUnits || camp.targetUnits <= 0) {
    errors.push('লক্ষ্যমাত্রা (টার্গেট ইউনিট) অন্তত ১ ব্যাগ হতে হবে।');
  }
  if (!camp.contactPhone || camp.contactPhone.length < 11) {
    errors.push('সঠিক ১১ ডিজিটের মোবাইল নম্বর প্রদান করুন।');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
