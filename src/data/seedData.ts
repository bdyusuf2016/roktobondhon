import type {
  BloodGroup,
  BloodRequest,
  Donation,
  Donor,
  User,
  FundDonation,
  PaymentMethodConfig,
  FundDisbursement,
  DonationCauseConfig,
  RolePermissionMatrix,
  PermissionDefinition,
  BloodCamp,
  DonorBadge,
} from '../types';
import { generateBloodRequestId, generateDonorId } from '../services/idGenerator';

const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const LOCATIONS = [
  { district: 'ঢাকা', upazila: 'ধামরাই', area: 'ধামরাই সদর', code: 'DHM' },
  { district: 'ঢাকা', upazila: 'ধামরাই', area: 'কুশুরা', code: 'DHM' },
  { district: 'ঢাকা', upazila: 'ধামরাই', area: 'রোয়াইল', code: 'DHM' },
  { district: 'ঢাকা', upazila: 'ধামরাই', area: 'বালিয়া', code: 'DHM' },
  { district: 'ঢাকা', upazila: 'সাভার', area: 'সাভার বাজার', code: 'SVR' },
  { district: 'ঢাকা', upazila: 'সাভার', area: 'আশুলিয়া', code: 'SVR' },
  { district: 'ঢাকা', upazila: 'সাভার', area: 'আমিনবাজার', code: 'SVR' },
  { district: 'ঢাকা', upazila: 'সাভার', area: 'বিরুলিয়া', code: 'SVR' },
  { district: 'মানিকগঞ্জ', upazila: 'মানিকগঞ্জ সদর', area: 'বাস স্ট্যান্ড', code: 'MNK' },
  { district: 'মানিকগঞ্জ', upazila: 'মানিকগঞ্জ সদর', area: 'বেউথা', code: 'MNK' },
  { district: 'মানিকগঞ্জ', upazila: 'সিংগাইর', area: 'সিংগাইর বাজার', code: 'SNG' },
  { district: 'মানিকগঞ্জ', upazila: 'সিংগাইর', area: 'চারিগ্রাম', code: 'SNG' },
  { district: 'মানিকগঞ্জ', upazila: 'সাটুরিয়া', area: 'বালিয়াটি', code: 'SAT' },
  { district: 'মানিকগঞ্জ', upazila: 'শিবালয়', area: 'আরিচা ঘাট', code: 'SHV' },
  { district: 'মানিকগঞ্জ', upazila: 'হরিরামপুর', area: 'ঝিটকা', code: 'HRP' },
];

const BANGLA_FIRST_NAMES = [
  'রাকিবুল', 'তানভীর', 'মেহেদী', 'শাকিব', 'আরিফুল', 'আসিফ', 'রিফাত', 'সজীব', 'ফারহান', 'নাহিদ',
  'সালমান', 'জাহিদুল', 'ইমরান', 'কামরুল', 'তৌফিক', 'শাহিন', 'নাজমুল', 'ফাহিম', 'মামুন', 'আহসান',
  'নুসরাত', 'সুমাইয়া', 'তাসনিম', 'ফারজানা', 'সাদিয়া', 'জান্নাতুল', 'মারিয়া', 'তামান্না', 'রোকসানা', 'শারমিন'
];

const BANGLA_LAST_NAMES = [
  'হাসান', 'আহমেদ', 'ইসলাম', 'রহমান', 'চৌধুরী', 'খান', 'হোসেন', 'শিকদার', 'মোল্লা', 'তালুকদার',
  'সরকার', 'শেখ', 'বেগম', 'আক্তার', 'মিয়া'
];

const HOSPITALS = [
  'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
  'এনাম মেডিকেল কলেজ হাসপাতাল, সাভার',
  'সাভার উপজেলা স্বাস্থ্য কমপ্লেক্স',
  'মানিকগঞ্জ ২৫০ শয্যা বিশিষ্ট জেলা হাসপাতাল',
  'কর্নেল মালেক মেডিকেল কলেজ হাসপাতাল, মানিকগঞ্জ',
  'সিংগাইর উপজেলা স্বাস্থ্য কমপ্লেক্স',
  'সাটুরিয়া উপজেলা স্বাস্থ্য কমপ্লেক্স',
  'শহীদ সোহরাওয়ার্দী মেডিকেল কলেজ হাসপাতাল'
];

export function generateSeedDonors(): Donor[] {
  const donors: Donor[] = [];

  for (let i = 1; i <= 100; i++) {
    const fn = BANGLA_FIRST_NAMES[(i - 1) % BANGLA_FIRST_NAMES.length];
    const ln = BANGLA_LAST_NAMES[(i * 3) % BANGLA_LAST_NAMES.length];
    const fullName = `${fn} ${ln}`;
    const bloodGroup = BLOOD_GROUPS[(i - 1) % BLOOD_GROUPS.length];
    const loc = LOCATIONS[(i - 1) % LOCATIONS.length];
    const isMale = i % 4 !== 0;
    const totalDonations = (i % 8) + 1;
    const isAvailable = i % 5 !== 0;
    const isEmergency = i % 3 === 0;
    const isVerified = i % 6 !== 0; // ~83% verified

    const donorId = generateDonorId(loc.code, 1000 + i);

    // Calculate dates
    const daysAgo = (i * 7) % 180;
    const lastDonationDate = isAvailable && daysAgo < 90
      ? undefined
      : new Date(Date.now() - (90 + daysAgo) * 86400000).toISOString().split('T')[0];

    donors.push({
      id: `seed-donor-${i}`,
      userId: `user-donor-${i}`,
      donorId,
      fullName,
      photoUrl: `https://images.unsplash.com/photo-${1534528741775 + (i % 20)}?auto=format&fit=crop&w=150&q=80`,
      bloodGroup,
      gender: isMale ? 'male' : 'female',
      dateOfBirth: `199${(i % 9) + 1}-0${((i % 8) + 1)}-15`,
      phone: `+88017${(10000000 + i * 7391).toString().slice(0, 8)}`,
      email: `donor${i}@example.com`,
      division: 'Dhaka',
      district: loc.district,
      upazila: loc.upazila,
      area: loc.area,
      availability: isAvailable,
      emergencyAvailable: isEmergency,
      lastDonationDate,
      totalDonations,
      verificationStatus: isVerified ? 'verified' : (i % 2 === 0 ? 'pending' : 'unverified'),
      verifiedBy: isVerified ? 'Admin Coordinator' : undefined,
      verifiedAt: isVerified ? new Date(Date.now() - i * 86400000).toISOString() : undefined,
      organizationId: 'org-roktobondon',
      branchId: loc.district === 'Manikganj' ? 'br-mnk' : (loc.upazila === 'Dhamrai' ? 'br-dhm' : 'br-svr'),
      privacy: {
        showPhone: i % 3 !== 0,
        showGender: true,
        showAge: false,
        allowDirectContact: true,
      },
      createdAt: new Date(Date.now() - (120 + i) * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return donors;
}

export function generateSeedRequests(): BloodRequest[] {
  const requests: BloodRequest[] = [];
  const levels: BloodRequest['emergencyLevel'][] = ['CRITICAL', 'URGENT', 'NORMAL', 'LOW'];

  const patients = [
    { name: 'আব্দুর রহিম', relation: 'বাবা' },
    { name: 'রোকেয়া বেগম', relation: 'মা' },
    { name: 'শামীম ওসমান', relation: 'ভাই' },
    { name: 'সাবরিনা আক্তার', relation: 'বোন' },
    { name: 'আহমেদ কবির', relation: 'রোগী নিজেই' },
    { name: 'তাহমিনা চৌধুরী', relation: 'স্ত্রী' },
    { name: 'শিশু আরিয়ান', relation: 'সন্তান' },
    { name: 'মোস্তাফিজুর রহমান', relation: 'চাচা' },
  ];

  for (let i = 1; i <= 20; i++) {
    const p = patients[(i - 1) % patients.length];
    const bloodGroup = BLOOD_GROUPS[(i * 2) % BLOOD_GROUPS.length];
    const loc = LOCATIONS[(i * 2) % LOCATIONS.length];
    const hospital = HOSPITALS[(i - 1) % HOSPITALS.length];
    const emergencyLevel = levels[(i - 1) % levels.length];
    const status: BloodRequest['status'] = i <= 6 ? 'active' : (i <= 10 ? 'matched' : (i <= 16 ? 'fulfilled' : 'pending'));

    const requiredDate = new Date(Date.now() + (i <= 4 ? 0 : (i * 86400000))).toISOString().split('T')[0];

    requests.push({
      id: `seed-req-${i}`,
      requestId: generateBloodRequestId(180 + i),
      userId: `user-patient-${i}`,
      patientName: p.name,
      bloodGroup,
      requiredUnits: (i % 3) + 1,
      requiredDate,
      requiredTime: `${(i % 12) + 1}:00 ${i % 2 === 0 ? 'AM' : 'PM'}`,
      hospital,
      division: 'Dhaka',
      district: loc.district,
      upazila: loc.upazila,
      area: loc.area,
      contactPerson: `মোঃ শফিকুল (${p.relation})`,
      contactNumber: `+88018${(20000000 + i * 8329).toString().slice(0, 8)}`,
      relationship: p.relation,
      emergencyLevel,
      notes: i % 2 === 0 ? 'জরুরি অপারেশনের জন্য রক্তের প্রয়োজন। হিমোগ্লোবিন অনেক কম।' : 'থ্যালাসেমিয়া রোগীর নিয়মিত রক্ত পরিসঞ্চালন।',
      status,
      verification: {
        isVerified: i > 2,
        verifiedBy: i > 2 ? 'অর্গানাইজেশন ভলান্টিয়ার' : undefined,
        verifiedAt: i > 2 ? new Date().toISOString() : undefined,
      },
      organizationId: 'org-roktobondon',
      createdAt: new Date(Date.now() - (24 - i) * 3600000).toISOString(),
      expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
    });
  }

  return requests;
}

export function generateSeedDonations(donors: Donor[], requests: BloodRequest[]): Donation[] {
  const donations: Donation[] = [];

  for (let i = 1; i <= 50; i++) {
    const donor = donors[(i * 2) % donors.length];
    const req = requests[(i - 1) % requests.length];
    const daysAgo = i * 4;

    donations.push({
      id: `seed-don-${i}`,
      donorId: donor.donorId,
      donorUserId: donor.userId,
      donorName: donor.fullName,
      bloodGroup: donor.bloodGroup,
      requestId: req?.requestId || `BD-2026-0000${i}`,
      donationDate: new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0],
      hospital: HOSPITALS[i % HOSPITALS.length],
      units: 1,
      donationType: i % 7 === 0 ? 'Platelets' : 'Whole Blood',
      verifiedBy: 'সাভার-ধামরাই ভলান্টিয়ার টিম',
      verificationDate: new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0],
      notes: 'সফলভাবে স্বেচ্ছায় রক্তদান সম্পন্ন হয়েছে।',
    });
  }

  return donations;
}

export const INITIAL_DEMO_USERS: User[] = [
  {
    id: 'user-superadmin',
    fullName: 'সুপার এডমিন (রক্ত দান পরিবার কালামপুর)',
    email: 'admin@roktobondon.org',
    phone: '+8801700000001',
    role: 'super_admin',
    organizationId: 'org-roktobondon',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-mod-dhm',
    fullName: 'কবির হোসেন (মডারেটর, ধামরাই)',
    email: 'dhamrai@roktobondon.org',
    phone: '+8801700000002',
    role: 'moderator',
    organizationId: 'org-roktobondon',
    branchId: 'br-dhm',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-donor-me',
    fullName: 'তানভীর আহমেদ (রক্তদাতা)',
    email: 'tanvir@example.com',
    phone: '+8801711223344',
    role: 'donor',
    organizationId: 'org-roktobondon',
    branchId: 'br-svr',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'user-recipient-me',
    fullName: 'ফারুক চৌধুরী (গ্রহীতা)',
    email: 'faruk@example.com',
    phone: '+8801811998877',
    role: 'recipient',
    organizationId: 'org-roktobondon',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    id: 'pay-bkash',
    name: 'bKash',
    nameBn: 'বিকাশ (bKash)',
    type: 'bKash',
    accountNumber: '01712-345678',
    accountType: 'merchant',
    instructionsBn: 'বিকাশ অ্যাপে "Make Payment" অপশনে গিয়ে নম্বরটি লিখুন অথবা পার্সোনাল একাউন্ট থেকে "Send Money" করুন। রেফারেন্সে আপনার নাম বা ফোন দিন।',
    isActive: true,
  },
  {
    id: 'pay-nagad',
    name: 'Nagad',
    nameBn: 'নগদ (Nagad)',
    type: 'Nagad',
    accountNumber: '01912-345678',
    accountType: 'personal',
    instructionsBn: 'নগদ অ্যাপ বা *167# ডায়াল করে "Send Money" করুন। সফল পেমেন্টের পর প্রাপ্ত Transaction ID টি ফর্মে প্রদান করুন।',
    isActive: true,
  },
  {
    id: 'pay-rocket',
    name: 'Rocket',
    nameBn: 'রকেট (Rocket)',
    type: 'Rocket',
    accountNumber: '01812-345678-9',
    accountType: 'personal',
    instructionsBn: 'রকেট অ্যাপ বা *322# ডায়াল করে "Send Money" করুন। ট্রানজেকশন আইডি সংরক্ষণ করুন।',
    isActive: true,
  },
  {
    id: 'pay-bank',
    name: 'Bank Transfer',
    nameBn: 'ইসলামী ব্যাংক বাংলাদেশ পিএলসি',
    type: 'Bank',
    accountNumber: '২০৫০-১২৩৪-৫৬৭৮-৯০০০',
    accountType: 'merchant',
    instructionsBn: 'একাউন্ট নাম: রক্ত দান পরিবার কালামপুর। শাখা: ধামরাই শাখা, ঢাকা। রাউটিং নম্বর: ১২৫২৬xxxx। ব্যাংকিং অ্যাপ বা সরাসরি ব্রাঞ্চে জমা দেওয়া যাবে।',
    isActive: true,
  },
];

export const INITIAL_DONATION_CAUSES: DonationCauseConfig[] = [
  {
    id: 'emergency_patient',
    nameBn: 'জরুরি দুস্থ রোগী ও রক্ত পরিসঞ্চালন তহবিল',
    descriptionBn: 'ধামরাই, সাভার ও মানিকগঞ্জের অসহায় রোগীদের জরুরি রক্তের ব্যাগ, ল্যাব পরীক্ষা ও যাতায়াত অনুদান।',
    targetAmount: 50000,
    raisedAmount: 28500,
    isActive: true,
  },
  {
    id: 'blood_bags_kits',
    nameBn: 'রক্তের ব্যাগ, ক্রসমেচিং ও ল্যাব কিটস ফান্ড',
    descriptionBn: 'জরুরি প্রয়োজনে রক্তের ব্যাগ ও গ্রুপিং/ক্রসমেচিং কিট বিনামূল্যে সরবরাহ।',
    targetAmount: 30000,
    raisedAmount: 16000,
    isActive: true,
  },
  {
    id: 'volunteer_campaign',
    nameBn: 'স্বেচ্ছাসেবী রক্তদান ক্যাম্প ও ডোনার কার্ড ফান্ড',
    descriptionBn: 'কলেজ, বিশ্ববিদ্যালয় ও বাজারভিত্তিক রক্তদান ক্যাম্পেইন এবং ডোনার আইডি কার্ড তৈরি।',
    targetAmount: 25000,
    raisedAmount: 14000,
    isActive: true,
  },
  {
    id: 'general',
    nameBn: 'প্ল্যাটফর্ম পরিচালনা ও সার্বিক মানবসেবা তহবিল',
    descriptionBn: 'সার্ভার খরচ, ২৪/৭ হটলাইন পরিচালনা ও স্বেচ্ছাসেবক টিম সাপোর্ট।',
    targetAmount: 20000,
    raisedAmount: 9500,
    isActive: true,
  },
];

export const INITIAL_FUND_DONATIONS: FundDonation[] = [
  {
    id: 'fdon-001',
    donorName: 'মোঃ আব্দুল্লাহ আল মামুন',
    donorPhone: '01712998877',
    donorEmail: 'mamun@example.com',
    amount: 2500,
    paymentMethod: 'bKash',
    transactionId: 'BL9X45TR81',
    accountNumber: '01712***877',
    fundCause: 'emergency_patient',
    area: 'কালামপুর বাজার, ধামরাই',
    message: 'জরুরি রোগীদের জন্য ক্ষুদ্র অনুদান। আল্লাহ সবার মঙ্গল করুন।',
    isAnonymous: false,
    status: 'verified',
    verifiedBy: 'সুপার এডমিন',
    verifiedAt: '2026-09-01T10:30:00.000Z',
    createdAt: '2026-09-01T10:15:00.000Z',
    organizationId: 'org-roktobondon',
  },
  {
    id: 'fdon-002',
    donorName: 'একজন শুভানুধ্যায়ী',
    donorPhone: '01819665544',
    amount: 5000,
    paymentMethod: 'Nagad',
    transactionId: 'NG8K33MZ19',
    accountNumber: '01819***544',
    fundCause: 'blood_bags_kits',
    area: 'সাভার',
    message: 'অসহায় মানুষের জীবন বাঁচাতে রক্ত দান পরিবার কালামপুরের উদ্যোগকে সাধুবাদ জানাই।',
    isAnonymous: true,
    status: 'verified',
    verifiedBy: 'সুপার এডমিন',
    verifiedAt: '2026-09-02T14:20:00.000Z',
    createdAt: '2026-09-02T14:00:00.000Z',
    organizationId: 'org-roktobondon',
  },
  {
    id: 'fdon-003',
    donorName: 'প্রকৌশলী রেজওয়ান কবির',
    donorPhone: '01912443322',
    donorEmail: 'rezwan@example.com',
    amount: 3000,
    paymentMethod: 'Bank',
    transactionId: 'TXN-IBBL-984210',
    accountNumber: 'IBBL-****-5678',
    fundCause: 'volunteer_campaign',
    area: 'মানিকগঞ্জ সদর',
    message: 'কলেজ ক্যাম্পেইনের জন্য শুভেচ্ছা অনুদান।',
    isAnonymous: false,
    status: 'verified',
    verifiedBy: 'কবির হোসেন (মডারেটর)',
    verifiedAt: '2026-09-03T16:00:00.000Z',
    createdAt: '2026-09-03T15:30:00.000Z',
    organizationId: 'org-roktobondon',
  },
  {
    id: 'fdon-004',
    donorName: 'সুমাইয়া জাহান',
    donorPhone: '01735112233',
    amount: 1000,
    paymentMethod: 'bKash',
    transactionId: 'BK7Q91LK02',
    accountNumber: '01735***233',
    fundCause: 'general',
    area: 'ধামরাই',
    isAnonymous: false,
    status: 'verified',
    verifiedBy: 'সুপার এডমিন',
    verifiedAt: '2026-09-04T11:10:00.000Z',
    createdAt: '2026-09-04T10:45:00.000Z',
    organizationId: 'org-roktobondon',
  },
];

export const INITIAL_FUND_DISBURSEMENTS: FundDisbursement[] = [
  {
    id: 'disb-001',
    title: 'কালামপুর সড়ক দুর্ঘটনায় আহত রোগীর জন্য ২ ব্যাগ রক্তের ক্রসমেচিং ও ল্যাব টেস্ট',
    cause: 'emergency_patient',
    amount: 1500,
    recipient: 'কালামপুর জেনারেল হাসপাতাল (রোগী: শফিকুল ইসলাম)',
    area: 'কালামপুর বাজার, ধামরাই',
    approvedBy: 'সুপার এডমিন (রক্ত দান পরিবার কালামপুর)',
    voucherNo: 'VCH-2026-001',
    date: '2026-09-02',
    notes: 'জরুরি বিভাগে সরাসরি পরিশোধ করা হয়েছে। রোগীর পরিবারের আর্থিক সামর্থ্য ছিল না।',
  },
  {
    id: 'disb-002',
    title: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্সে ডেলিভারি রোগীর রক্তের ব্যাগ ও স্যালাইন সহায়তা',
    cause: 'emergency_patient',
    amount: 2200,
    recipient: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স (রোগী: রাবেয়া খাতুন)',
    area: 'ধামরাই',
    approvedBy: 'কবির হোসেন (মডারেটর, ধামরাই)',
    voucherNo: 'VCH-2026-002',
    date: '2026-09-03',
    notes: 'সিজারিয়ান জরুরি রক্তের ব্যাগ ও মেডিকেশন কিট সরবরাহ।',
  },
  {
    id: 'disb-003',
    title: 'সাভার এলাকায় রক্তদান সচেতনতামূলক ক্যাম্পেইনের ব্যানার, লিফলেট ও ডোনার কার্ড',
    cause: 'volunteer_campaign',
    amount: 3500,
    recipient: 'সাভার ভলান্টিয়ার টিম ও প্রিন্টিং প্রেস',
    area: 'সাভার',
    approvedBy: 'সুপার এডমিন (রক্ত দান পরিবার কালামপুর)',
    voucherNo: 'VCH-2026-003',
    date: '2026-09-04',
    notes: '৫০০টি সচেতনতা লিফলেট ও ৫০ জন নতুন ডোনারের কার্ড প্রিন্টিং।',
  },
];

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  {
    key: 'manage_donors',
    labelBn: 'রক্তদাতা তথ্য যাচাই ও অনুমোদন',
    descriptionBn: 'নতুন রক্তদাতার তথ্য যাচাই, একাউন্ট অনুমোদন এবং প্রয়োজনে স্থগিতকরণ।',
    category: 'blood',
  },
  {
    key: 'manage_requests',
    labelBn: 'রক্তের জরুরি আবেদন অনুমোদন',
    descriptionBn: 'জরুরি রক্তের আবেদন রিভিউ, সত্যায়ন এবং স্ট্যাটাস পরিবর্তন।',
    category: 'blood',
  },
  {
    key: 'record_donation',
    labelBn: 'রক্তদান সম্পন্ন রেকর্ড লিপিবদ্ধকরণ',
    descriptionBn: 'হাসপাতালে রক্তদান সম্পন্ন হওয়া নিশ্চিত করে ডোনার প্রোফাইলে রেকর্ড সংরক্ষণ।',
    category: 'blood',
  },
  {
    key: 'manage_hospitals',
    labelBn: 'হাসপাতাল ও ব্লাড ব্যাংক ডিরেক্টরি',
    descriptionBn: 'হাসপাতালের নাম, ঠিকানা, হটলাইন যোগ, হালনাগাদ ও মুছে ফেলা।',
    category: 'directory',
  },
  {
    key: 'manage_branches',
    labelBn: 'শাখা ও চ্যাপ্টার ব্যবস্থাপনা',
    descriptionBn: 'ধামরাই, সাভার, মানিকগঞ্জসহ নতুন উপজেলা শাখা ও সমন্বয়ক নিয়োগ।',
    category: 'directory',
  },
  {
    key: 'manage_funds',
    labelBn: 'আর্থিক অনুদান যাচাই ও অনুমোদন',
    descriptionBn: 'বিকাশ, নগদ, ব্যাংকের মাধ্যমে প্রাপ্ত আর্থিক অনুদানের TrxID যাচাই ও ভেরিফিকেশন।',
    category: 'funds',
  },
  {
    key: 'manage_disbursements',
    labelBn: 'রোগী সহায়তা ও ব্যয় ভাউচার এন্ট্রি',
    descriptionBn: 'তহবিল থেকে রক্তের ব্যাগ, ওষুধ সহায়তা বা ক্যাম্পেইন খরচের ভাউচার অনুমোদন।',
    category: 'funds',
  },
  {
    key: 'manage_payment_methods',
    labelBn: 'পেমেন্ট মেথড ও অনুদান খাত কনফিগার',
    descriptionBn: 'বিকাশ, নগদ বা ব্যাংক একাউন্ট নম্বর ও অনুদান খাত যোগ/সম্পাদনা।',
    category: 'funds',
  },
  {
    key: 'manage_users',
    labelBn: 'ইউজার ও টিম মেম্বার একাউন্ট',
    descriptionBn: 'নতুন এডমিন/স্বেচ্ছাসেবক যোগ, ভূমিকা নির্ধারণ ও একাউন্ট মুছে ফেলা।',
    category: 'system',
  },
  {
    key: 'manage_roles_matrix',
    labelBn: 'রোল ও পারমিশন ম্যাট্রিক্স নিয়ন্ত্রণ',
    descriptionBn: 'কোন রোল কোন ফিচার ব্যবহার করতে পারবে তা ডায়নামিকভাবে পরিবর্তন।',
    category: 'system',
  },
  {
    key: 'manage_settings',
    labelBn: 'হেডার, ফুটার ও প্ল্যাটফর্ম সেটিংস',
    descriptionBn: 'ওয়েবসাইটের নাম, স্লোগান, নোটিশ ব্যানার, হটলাইন ও কভারেজ এলাকা পরিবর্তন।',
    category: 'system',
  },
  {
    key: 'manage_backup',
    labelBn: 'ডাটাবেজ ব্যাকআপ ও রিস্টোর',
    descriptionBn: 'সম্পূর্ণ প্ল্যাটফর্মের ডেটা JSON ফাইলে ডাউনলোড এবং পূর্বের ব্যাকআপ থেকে রিস্টোর।',
    category: 'system',
  },
  {
    key: 'view_audit_logs',
    labelBn: 'নিরাপত্তা ও অডিট ট্রেইল পরিদর্শন',
    descriptionBn: 'সকল ইউজার অ্যাক্টিভিটি, অনুমোদন ও সিস্টেম সিকিউরিটি ইভেন্ট লগ দেখা।',
    category: 'system',
  },
];

export const DEFAULT_PERMISSION_MATRIX: RolePermissionMatrix = {
  super_admin: {
    manage_donors: true,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: true,
    manage_branches: true,
    manage_funds: true,
    manage_disbursements: true,
    manage_payment_methods: true,
    manage_users: true,
    manage_roles_matrix: true,
    manage_settings: true,
    manage_backup: true,
    view_audit_logs: true,
  },
  admin: {
    manage_donors: true,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: true,
    manage_branches: true,
    manage_funds: true,
    manage_disbursements: true,
    manage_payment_methods: true,
    manage_users: true,
    manage_roles_matrix: false,
    manage_settings: true,
    manage_backup: true,
    view_audit_logs: true,
  },
  moderator: {
    manage_donors: true,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: true,
    manage_branches: false,
    manage_funds: true,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: false,
  },
  volunteer: {
    manage_donors: false,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: false,
    manage_branches: false,
    manage_funds: false,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: false,
  },
  donor: {
    manage_donors: false,
    manage_requests: false,
    record_donation: false,
    manage_hospitals: false,
    manage_branches: false,
    manage_funds: false,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: false,
  },
  recipient: {
    manage_donors: false,
    manage_requests: false,
    record_donation: false,
    manage_hospitals: false,
    manage_branches: false,
    manage_funds: false,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: false,
  },
};

export const DONOR_BADGES_LIST: DonorBadge[] = [
  {
    id: 'badge-bronze',
    titleBn: 'রক্তদূত (১ম রক্তদান)',
    titleEn: 'First-time Lifesaver',
    level: 'bronze',
    minDonations: 1,
    iconName: 'Droplet',
    descriptionBn: 'প্রথম রক্তদানের মাধ্যমে মানবতার সেবায় নিজের যাত্রা শুরু করার সম্মাননা।',
    color: '#cd7f32',
  },
  {
    id: 'badge-silver',
    titleBn: 'জীবনরক্ষক (৩+ রক্তদান)',
    titleEn: 'Life Guardian',
    level: 'silver',
    minDonations: 3,
    iconName: 'HeartHandshake',
    descriptionBn: 'একাধিকবার রক্ত দিয়ে বহু মানুষের জীবন বাঁচাতে এগিয়ে আসার স্বীকৃতি।',
    color: '#94a3b8',
  },
  {
    id: 'badge-gold',
    titleBn: 'রক্তবীর (৫+ রক্তদান)',
    titleEn: 'Blood Hero',
    level: 'gold',
    minDonations: 5,
    iconName: 'Award',
    descriptionBn: 'নিয়মিত রক্তদান করে সমাজ ও জরুরি স্বাস্থ্যসেবায় অসাধারণ অবদান রাখা।',
    color: '#eab308',
  },
  {
    id: 'badge-platinum',
    titleBn: 'মহাবীর (১০+ রক্তদান)',
    titleEn: 'Super Champion',
    level: 'platinum',
    minDonations: 10,
    iconName: 'ShieldCheck',
    descriptionBn: '১০ বারের বেশি স্বেচ্ছায় রক্ত দিয়ে মানুষের বিপদের নির্ভরযোগ্য ভরসাস্থল।',
    color: '#06b6d4',
  },
  {
    id: 'badge-legend',
    titleBn: 'প্লাটিনাম কিংবদন্তি (১৫+ রক্তদান)',
    titleEn: 'Platinum Legend',
    level: 'legend',
    minDonations: 15,
    iconName: 'Crown',
    descriptionBn: 'রক্তদানের অনন্য মাইলফলক স্পর্শকারী একজন অনুপ্রেরণাদায়ী মানবতার প্রতীক।',
    color: '#ec4899',
  },
];

export const INITIAL_BLOOD_CAMPS: BloodCamp[] = [
  {
    id: 'camp-dhm-01',
    titleBn: 'ধামরাই সরকারি কলেজ প্রাঙ্গণ বিশেষ রক্তদান ক্যাম্প',
    titleEn: 'Dhamrai Govt. College Special Blood Donation Camp',
    organizerName: 'রক্ত দান পরিবার কালামপুর ও যুব রেড ক্রিসেন্ট',
    partnerHospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Dhamrai',
    venueAddress: 'ধামরাই সরকারি কলেজ অডিটোরিয়াম, ধামরাই, ঢাকা',
    startDate: '2026-09-25',
    endDate: '2026-09-25',
    startTime: '০৯:০০ AM',
    endTime: '০৫:০০ PM',
    targetUnits: 100,
    collectedUnits: 0,
    contactPerson: 'মেহেদী হাসান (সমন্বয়ক)',
    contactPhone: '01711223344',
    bannerUrl: '',
    descriptionBn: 'ধামরাই ও সংলগ্ন এলাকার জরুরি রোগীদের রক্তের সংকট দূর করতে বিনামূল্যে ব্লাড গ্রুপিং ও স্বেচ্ছায় রক্তদান ক্যাম্প। সকল রক্তদাতাকে সনদপত্র ও উপহার প্রদান করা হবে।',
    status: 'upcoming',
    registeredCount: 38,
    mapUrl: 'https://maps.google.com/?q=Dhamrai+Govt+College',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'camp-svr-02',
    titleBn: 'সাভার যুব উৎসব ও ফ্রি ব্লাড ডোনেশন ড্রাইভ',
    titleEn: 'Savar Youth Festival & Blood Donation Drive',
    organizerName: 'রক্ত দান পরিবার কালামপুর সাভার শাখা',
    partnerHospital: 'এনাম মেডিকেল কলেজ হাসপাতাল',
    division: 'Dhaka',
    district: 'Dhaka',
    upazila: 'Savar',
    venueAddress: 'সাভার পৌর কমিউনিটি সেন্টার, সাভার বাজার, ঢাকা',
    startDate: '2026-10-05',
    endDate: '2026-10-05',
    startTime: '১০:০০ AM',
    endTime: '০৪:৩০ PM',
    targetUnits: 150,
    collectedUnits: 0,
    contactPerson: 'তানভীর আহমেদ',
    contactPhone: '01822334455',
    bannerUrl: '',
    descriptionBn: 'থ্যালাসেমিয়া রোগী ও প্রসূতি মায়েদের জরুরি রক্তের যোগান দিতে এই বিশেষ রক্তদান ক্যাম্পিংয়ের আয়োজন করা হয়েছে।',
    status: 'upcoming',
    registeredCount: 52,
    mapUrl: 'https://maps.google.com/?q=Savar+Bazar',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'camp-mnk-03',
    titleBn: 'মানিকগঞ্জ জেলা উৎসব রক্তদান মেলা',
    titleEn: 'Manikganj District Blood Drive Fair',
    organizerName: 'রক্ত দান পরিবার কালামপুর মানিকগঞ্জ শাখা',
    partnerHospital: 'কর্নেল মালেক মেডিকেল কলেজ হাসপাতাল, মানিকগঞ্জ',
    division: 'Dhaka',
    district: 'Manikganj',
    upazila: 'Manikganj Sadar',
    venueAddress: 'মানিকগঞ্জ জেলা পরিষদ মিলনায়তন, বাসস্ট্যান্ড রোড',
    startDate: '2026-08-15',
    endDate: '2026-08-15',
    startTime: '০৯:৩০ AM',
    endTime: '০৬:০০ PM',
    targetUnits: 120,
    collectedUnits: 114,
    contactPerson: 'রিফাত চৌধুরী',
    contactPhone: '01933445566',
    bannerUrl: '',
    descriptionBn: 'মানিকগঞ্জের সকল সাধারণ মানুষ ও শিক্ষার্থীদের অংশগ্রহণে সফলভাবে সম্পন্ন হওয়া ক্যাম্প।',
    status: 'completed',
    registeredCount: 114,
    mapUrl: 'https://maps.google.com/?q=Manikganj+Bus+Stand',
    createdAt: new Date().toISOString(),
  },
];



