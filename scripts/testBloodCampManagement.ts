import {
  filterCamps,
  calculateCampMetrics,
  validateCampPayload,
} from '../src/services/campService';
import type { BloodCamp } from '../src/types';

console.log('🧪 Starting Phase 17 — Blood Camp & Event Management Governance Verification...\n');

const mockCamps: BloodCamp[] = [
  {
    id: 'camp-1',
    titleBn: 'ধামরাই ফ্রি ব্লাড গ্রুপিং ও স্বেচ্ছাসেবী রক্তদান ক্যাম্পেইন',
    titleEn: 'Dhamrai Free Blood Donation Camp',
    organizerName: 'রক্ত দান পরিবার কালামপুর',
    partnerHospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    division: 'Dhaka',
    district: 'ঢাকা',
    upazila: 'ধামরাই',
    venueAddress: 'ধামরাই সরকারি কলেজ মাঠ',
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    startTime: '09:00 AM',
    endTime: '04:00 PM',
    targetUnits: 100,
    collectedUnits: 45,
    registeredCount: 52,
    contactPerson: 'মো: আরিফুল ইসলাম',
    contactPhone: '01712345678',
    descriptionBn: 'ধামরাই উপজেলার মুমূর্ষু রোগীদের প্রয়োজনে রক্তের সমাবেশ।',
    status: 'upcoming',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'camp-2',
    titleBn: 'সাভার জরুরি রক্তদান ক্যাম্প',
    titleEn: 'Savar Emergency Blood Drive',
    organizerName: 'সাভার যুব সংঘ ও রক্ত দান পরিবার কালামপুর',
    partnerHospital: 'এনাম মেডিকেল কলেজ হাসপাতাল',
    division: 'Dhaka',
    district: 'ঢাকা',
    upazila: 'সাভার',
    venueAddress: 'সাভার পৌরসভা চত্বর',
    startDate: '2026-09-06',
    endDate: '2026-09-06',
    startTime: '10:00 AM',
    endTime: '05:00 PM',
    targetUnits: 80,
    collectedUnits: 60,
    registeredCount: 70,
    contactPerson: 'মো: সাকিল আহমেদ',
    contactPhone: '01812345678',
    descriptionBn: 'জরুরি রোগীদের জন্য রক্ত সংগ্রহ কর্মসূচি।',
    status: 'ongoing',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'camp-3',
    titleBn: 'মানিকগঞ্জ সিংগাইর রক্তদান ক্যাম্প',
    titleEn: 'Manikganj Singair Blood Drive',
    organizerName: 'সিংগাইর মানবকল্যাণ সংস্থা',
    partnerHospital: 'সিংগাইর উপজেলা স্বাস্থ্য কমপ্লেক্স',
    division: 'Dhaka',
    district: 'মানিকগঞ্জ',
    upazila: 'সিংগাইর',
    venueAddress: 'সিংগাইর পাইলট উচ্চ বিদ্যালয়',
    startDate: '2026-08-20',
    endDate: '2026-08-20',
    startTime: '09:00 AM',
    endTime: '03:00 PM',
    targetUnits: 50,
    collectedUnits: 55,
    registeredCount: 48,
    contactPerson: 'হাসান মাহমুদ',
    contactPhone: '01912345678',
    descriptionBn: 'সম্পন্ন রক্তদান কর্মসূচি।',
    status: 'completed',
    createdAt: new Date().toISOString(),
  },
];

// Test 1: Metrics calculation
console.log('1️⃣ Testing Camp Aggregate Metrics Calculation:');
const metrics = calculateCampMetrics(mockCamps);
console.log('Metrics summary:', metrics);
if (metrics.totalCamps !== 3) throw new Error(`Expected 3 total camps, got ${metrics.totalCamps}`);
if (metrics.upcomingCamps !== 1) throw new Error(`Expected 1 upcoming camp, got ${metrics.upcomingCamps}`);
if (metrics.ongoingCamps !== 1) throw new Error(`Expected 1 ongoing camp, got ${metrics.ongoingCamps}`);
if (metrics.completedCamps !== 1) throw new Error(`Expected 1 completed camp, got ${metrics.completedCamps}`);
if (metrics.totalTargetUnits !== 230) throw new Error(`Expected 230 target units, got ${metrics.totalTargetUnits}`);
if (metrics.totalCollectedUnits !== 160) throw new Error(`Expected 160 collected units, got ${metrics.totalCollectedUnits}`);
if (metrics.totalRegistrations !== 170) throw new Error(`Expected 170 registrations, got ${metrics.totalRegistrations}`);
console.log('✅ Aggregate metrics calculation passed!\n');

// Test 2: Filtering logic
console.log('2️⃣ Testing Filter Logic (Status, District, Search Term):');
const upcomingOnly = filterCamps(mockCamps, { status: 'upcoming' });
if (upcomingOnly.length !== 1 || upcomingOnly[0].id !== 'camp-1') {
  throw new Error('Filtering by upcoming status failed');
}

const manikganjOnly = filterCamps(mockCamps, { district: 'মানিকগঞ্জ' });
if (manikganjOnly.length !== 1 || manikganjOnly[0].id !== 'camp-3') {
  throw new Error('Filtering by district failed');
}

const searchResults = filterCamps(mockCamps, { searchTerm: 'সাভার' });
if (searchResults.length !== 1 || searchResults[0].id !== 'camp-2') {
  throw new Error('Filtering by searchTerm failed');
}
console.log('✅ Camp filtering logic passed!\n');

// Test 3: Payload Validation
console.log('3️⃣ Testing Camp Payload Validation:');
const invalidCamp: Partial<BloodCamp> = {
  titleBn: '',
  venueAddress: '',
  targetUnits: 0,
  contactPhone: '123',
};
const invalidResult = validateCampPayload(invalidCamp);
if (invalidResult.isValid || invalidResult.errors.length === 0) {
  throw new Error('Validation failed to catch invalid payload');
}
console.log('Caught expected validation errors:', invalidResult.errors.length);

const validCamp: Partial<BloodCamp> = {
  titleBn: 'ধামরাই স্বেচ্ছাসেবী রক্তদান ক্যাম্প',
  venueAddress: 'ধামরাই বাজার',
  district: 'ঢাকা',
  startDate: '2026-09-20',
  targetUnits: 50,
  contactPhone: '01711223344',
};
const validResult = validateCampPayload(validCamp);
if (!validResult.isValid) {
  throw new Error(`Valid payload failed validation: ${validResult.errors.join(', ')}`);
}
console.log('✅ Payload validator passed!\n');

console.log('🎉 Phase 17 — Blood Camp & Event Management Control verification successful!');
