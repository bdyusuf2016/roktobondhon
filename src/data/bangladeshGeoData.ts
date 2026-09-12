/**
 * Comprehensive Geographic Data of Bangladesh
 * Covers all 8 Divisions, all 64 Districts, and Upazilas.
 * Supports both Bengali and English naming with fuzzy matching.
 */

export interface DivisionItem {
  id: string;
  nameBn: string;
  nameEn: string;
}

export interface DistrictItem {
  id: string;
  divisionId: string;
  nameBn: string;
  nameEn: string;
  upazilas: string[];
}

export const BANGLADESH_DIVISIONS: DivisionItem[] = [
  { id: 'dhaka', nameBn: 'ঢাকা', nameEn: 'Dhaka' },
  { id: 'chattogram', nameBn: 'চট্টগ্রাম', nameEn: 'Chattogram' },
  { id: 'rajshahi', nameBn: 'রাজশাহী', nameEn: 'Rajshahi' },
  { id: 'khulna', nameBn: 'খুলনা', nameEn: 'Khulna' },
  { id: 'barishal', nameBn: 'বরিশাল', nameEn: 'Barishal' },
  { id: 'sylhet', nameBn: 'সিলেট', nameEn: 'Sylhet' },
  { id: 'rangpur', nameBn: 'রংপুর', nameEn: 'Rangpur' },
  { id: 'mymensingh', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh' },
];

export const BANGLADESH_DISTRICTS: DistrictItem[] = [
  // ----------------------------------------------------
  // DHAKA DIVISION (১৩ জেলা)
  // ----------------------------------------------------
  {
    id: 'dhaka',
    divisionId: 'dhaka',
    nameBn: 'ঢাকা',
    nameEn: 'Dhaka',
    upazilas: [
      'ধামরাই',
      'সাভার',
      'কেরানীগঞ্জ',
      'নবাবগঞ্জ',
      'দোহার',
      'ঢাকা উত্তর সিটি কর্পোরেশন',
      'ঢাকা দক্ষিণ সিটি কর্পোরেশন',
      'মিরপুর',
      'উত্তরা',
      'গুলশান',
      'মোহাম্মদপুর',
      'ধানমন্ডি',
      'মতিঝিল',
      'যাত্রাবাড়ী',
      'পুরান ঢাকা',
    ],
  },
  {
    id: 'gazipur',
    divisionId: 'dhaka',
    nameBn: 'গাজীপুর',
    nameEn: 'Gazipur',
    upazilas: ['গাজীপুর সদর', 'কালিয়াকৈর', 'শ্রীপুর', 'কাপাসিয়া', 'কালীগঞ্জ', 'টঙ্গী'],
  },
  {
    id: 'manikganj',
    divisionId: 'dhaka',
    nameBn: 'মানিকগঞ্জ',
    nameEn: 'Manikganj',
    upazilas: ['মানিকগঞ্জ সদর', 'সাটুরিয়া', 'সিংগাইর', 'শিবালয়', 'ঘিওর', 'হরিরামপুর', 'দৌলতপুর'],
  },
  {
    id: 'narayanganj',
    divisionId: 'dhaka',
    nameBn: 'নারায়ণগঞ্জ',
    nameEn: 'Narayanganj',
    upazilas: ['নারায়ণগঞ্জ সদর', 'রূপগঞ্জ', 'সোনারগাঁও', 'আড়াইহাজার', 'বন্দর'],
  },
  {
    id: 'munshiganj',
    divisionId: 'dhaka',
    nameBn: 'মুন্সীগঞ্জ',
    nameEn: 'Munshiganj',
    upazilas: ['মুন্সীগঞ্জ সদর', 'শ্রীনগর', 'সিরাজদিখান', 'লৌহজং', 'টঙ্গীবাড়ী', 'গজারিয়া'],
  },
  {
    id: 'narsingdi',
    divisionId: 'dhaka',
    nameBn: 'নরসিংদী',
    nameEn: 'Narsingdi',
    upazilas: ['নরসিংদী সদর', 'পলাশ', 'শিবপুর', 'মনোহরদী', 'বেলাবো', 'রায়পুরা'],
  },
  {
    id: 'tangail',
    divisionId: 'dhaka',
    nameBn: 'টাঙ্গাইল',
    nameEn: 'Tangail',
    upazilas: [
      'টাঙ্গাইল সদর',
      'মির্জাপুর',
      'দেলদুয়ার',
      'সখিপুর',
      'বাসাইল',
      'নাগরপুর',
      'কালিহাতী',
      'ঘাটাইল',
      'ভূঞাপুর',
      'মধুপুর',
      'ধনবাড়ী',
      'গোপালপুর',
    ],
  },
  {
    id: 'kishoreganj',
    divisionId: 'dhaka',
    nameBn: 'কিশোরগঞ্জ',
    nameEn: 'Kishoreganj',
    upazilas: [
      'কিশোরগঞ্জ সদর',
      'বাজিতপুর',
      'ভৈরব',
      'হোসেনপুর',
      'কটিয়াদী',
      'কুলিয়ারচর',
      'পাকুন্দিয়া',
      'তাড়াইল',
      'করিমগঞ্জ',
      'ইটনা',
      'মিঠামইন',
      'অষ্টগ্রাম',
      'নিকলী',
    ],
  },
  {
    id: 'faridpur',
    divisionId: 'dhaka',
    nameBn: 'ফরিদপুর',
    nameEn: 'Faridpur',
    upazilas: [
      'ফরিদপুর সদর',
      'মধুখালী',
      'বোয়ালমারী',
      'আলফাডাঙ্গা',
      'নগরকান্দা',
      'সালথা',
      'সদরপুর',
      'চরভদ্রাসন',
      'ভাঙ্গা',
    ],
  },
  {
    id: 'gopalganj',
    divisionId: 'dhaka',
    nameBn: 'গোপালগঞ্জ',
    nameEn: 'Gopalganj',
    upazilas: ['গোপালগঞ্জ সদর', 'টুঙ্গিপাড়া', 'কোটালীপাড়া', 'কাশিয়ানী', 'মুকসুদপুর'],
  },
  {
    id: 'madaripur',
    divisionId: 'dhaka',
    nameBn: 'মাদারীপুর',
    nameEn: 'Madaripur',
    upazilas: ['মাদারীপুর সদর', 'শিবচর', 'কালকিনি', 'রাজৈর', 'ডাসার'],
  },
  {
    id: 'rajbari',
    divisionId: 'dhaka',
    nameBn: 'রাজবাড়ী',
    nameEn: 'Rajbari',
    upazilas: ['রাজবাড়ী সদর', 'গোয়ালন্দ', 'পাংশা', 'বালিয়াকান্দি', 'কালুখালী'],
  },
  {
    id: 'shariatpur',
    divisionId: 'dhaka',
    nameBn: 'শরীয়তপুর',
    nameEn: 'Shariatpur',
    upazilas: ['শরীয়তপুর সদর', 'নড়িয়া', 'জাজিরা', 'গোসাইরহাট', 'ডামুড্যা', 'ভেদরগঞ্জ'],
  },

  // ----------------------------------------------------
  // CHATTOGRAM DIVISION (১১ জেলা)
  // ----------------------------------------------------
  {
    id: 'chattogram',
    divisionId: 'chattogram',
    nameBn: 'চট্টগ্রাম',
    nameEn: 'Chattogram',
    upazilas: [
      'চট্টগ্রাম কোতোয়ালী',
      'পাঁচলাইশ',
      'হালিশহর',
      'চান্দগাঁও',
      'ডবলমুরিং',
      'পতেঙ্গা',
      'পাহাড়তলী',
      'খুলশী',
      'আগ্রাবাদ',
      'হাটহাজারী',
      'রাউজান',
      'রাঙ্গুনিয়া',
      'ফটিকছড়ি',
      'সীতাকুণ্ড',
      'মীরসরাই',
      'পটিয়া',
      'বোয়ালখালী',
      'আনোয়ারা',
      'চন্দনাইশ',
      'বাঁশখালী',
      'সাতকানিয়া',
      'লোহাগাড়া',
      'সন্দ্বীপ',
      'কর্ণফুলী',
    ],
  },
  {
    id: 'coxsbazar',
    divisionId: 'chattogram',
    nameBn: 'কক্সবাজার',
    nameEn: "Cox's Bazar",
    upazilas: [
      'কক্সবাজার সদর',
      'চকরিয়া',
      'মহেশখালী',
      'টেকনাফ',
      'উখিয়া',
      'রামু',
      'কুতুবদিয়া',
      'পেকুয়া',
      'ঈদগাঁও',
    ],
  },
  {
    id: 'cumilla',
    divisionId: 'chattogram',
    nameBn: 'কুমিল্লা',
    nameEn: 'Cumilla',
    upazilas: [
      'কুমিল্লা আদর্শ সদর',
      'সদর দক্ষিণ',
      'দাউদকান্দি',
      'চান্দিনা',
      'মুরাদনগর',
      'দেবিদ্বার',
      'হোমনা',
      'তিতাস',
      'মেঘনা',
      'বুড়িচং',
      'ব্রাহ্মণপাড়া',
      'বরুড়া',
      'লাকসাম',
      'নাঙ্গলকোট',
      'চৌদ্দগ্রাম',
      'মনোহরগঞ্জ',
      'লালমাই',
    ],
  },
  {
    id: 'feni',
    divisionId: 'chattogram',
    nameBn: 'ফেনী',
    nameEn: 'Feni',
    upazilas: ['ফেনী সদর', 'দাগনভূঞা', 'সোনাগাজী', 'ছাগলনাইয়া', 'পরশুরাম', 'ফুলগাজী'],
  },
  {
    id: 'brahmanbaria',
    divisionId: 'chattogram',
    nameBn: 'ব্রাহ্মণবাড়িয়া',
    nameEn: 'Brahmanbaria',
    upazilas: [
      'ব্রাহ্মণবাড়িয়া সদর',
      'আশুগঞ্জ',
      'সরাইল',
      'কসবা',
      'আখাউড়া',
      'নবীনগর',
      'বাঞ্ছারামপুর',
      'নাসিরনগর',
      'বিজয়নগর',
    ],
  },
  {
    id: 'chandpur',
    divisionId: 'chattogram',
    nameBn: 'চাঁদপুর',
    nameEn: 'Chandpur',
    upazilas: [
      'চাঁদপুর সদর',
      'হাজীগঞ্জ',
      'শাহরাস্তি',
      'মতলব উত্তর',
      'মতলব দক্ষিণ',
      'ফরিদগঞ্জ',
      'কচুয়া',
      'হাইমচর',
    ],
  },
  {
    id: 'noakhali',
    divisionId: 'chattogram',
    nameBn: 'নোয়াখালী',
    nameEn: 'Noakhali',
    upazilas: [
      'নোয়াখালী সদর (সুধারাম)',
      'বেগমগঞ্জ',
      'সেনবাগ',
      'চাটখিল',
      'কোম্পানীগঞ্জ',
      'হাতিয়া',
      'সোনাইমুড়ী',
      'সুবর্ণচর',
      'কবিরহাট',
    ],
  },
  {
    id: 'lakshmipur',
    divisionId: 'chattogram',
    nameBn: 'লক্ষ্মীপুর',
    nameEn: 'Lakshmipur',
    upazilas: ['লক্ষ্মীপুর সদর', 'রায়পুর', 'রামগঞ্জ', 'রামগতি', 'কমলনগর'],
  },
  {
    id: 'rangamati',
    divisionId: 'chattogram',
    nameBn: 'রাঙ্গামাটি',
    nameEn: 'Rangamati',
    upazilas: [
      'রাঙ্গামাটি সদর',
      'কাপ্তাই',
      'বাঘাইছড়ি',
      'বরকল',
      'জুরাছড়ি',
      'বিলাইছড়ি',
      'কাউখালী',
      'নানিয়ারচর',
      'রাজস্থলী',
      'লংগদু',
    ],
  },
  {
    id: 'khagrachhari',
    divisionId: 'chattogram',
    nameBn: 'খাগড়াছড়ি',
    nameEn: 'Khagrachhari',
    upazilas: [
      'খাগড়াছড়ি সদর',
      'দীঘিনালা',
      'পানছড়ি',
      'মহালছড়ি',
      'মাটিরাঙ্গা',
      'রামগড়',
      'মানিকছড়ি',
      'লক্ষ্মীছড়ি',
      'গুইমারা',
    ],
  },
  {
    id: 'bandarban',
    divisionId: 'chattogram',
    nameBn: 'বান্দরবান',
    nameEn: 'Bandarban',
    upazilas: ['বান্দরবান সদর', 'রুমা', 'থানচি', 'রোয়াংছড়ি', 'লামা', 'আলীকদম', 'নাইক্ষ্যংছড়ি'],
  },

  // ----------------------------------------------------
  // RAJSHAHI DIVISION (৮ জেলা)
  // ----------------------------------------------------
  {
    id: 'rajshahi',
    divisionId: 'rajshahi',
    nameBn: 'রাজশাহী',
    nameEn: 'Rajshahi',
    upazilas: [
      'বোয়ালিয়া',
      'মতিহার',
      'রাজপাড়া',
      'শাহ মখদুম',
      'পবা',
      'গোদাগাড়ী',
      'তানোর',
      'মোহনপুর',
      'বাগমারা',
      'দুর্গাপুর',
      'পুঠিয়া',
      'চারঘাট',
      'বাঘা',
    ],
  },
  {
    id: 'bogura',
    divisionId: 'rajshahi',
    nameBn: 'বগুড়া',
    nameEn: 'Bogura',
    upazilas: [
      'বগুড়া সদর',
      'শেরপুর',
      'শিবগঞ্জ',
      'সোনাতলা',
      'গাবতলী',
      'সারিয়াকান্দি',
      'ধুনট',
      'নন্দীগ্রাম',
      'আদমদীঘি',
      'দুপচাঁচিয়া',
      'কাহালু',
      'শাজাহানপুর',
    ],
  },
  {
    id: 'pabna',
    divisionId: 'rajshahi',
    nameBn: 'পাবনা',
    nameEn: 'Pabna',
    upazilas: [
      'পাবনা সদর',
      'ঈশ্বরদী',
      'আটঘরিয়া',
      'চাটমোহর',
      'ভাঙ্গুড়া',
      'ফরিদপুর',
      'বেড়া',
      'সাঁথিয়া',
      'সুজানগর',
    ],
  },
  {
    id: 'sirajganj',
    divisionId: 'rajshahi',
    nameBn: 'সিরাজগঞ্জ',
    nameEn: 'Sirajganj',
    upazilas: [
      'সিরাজগঞ্জ সদর',
      'শাহজাদপুর',
      'উল্লাপাড়া',
      'রায়গঞ্জ',
      'বেলকুচি',
      'তাড়াশ',
      'কামারখন্দ',
      'কাজীপুর',
      'চৌহালী',
    ],
  },
  {
    id: 'naogaon',
    divisionId: 'rajshahi',
    nameBn: 'নওগাঁ',
    nameEn: 'Naogaon',
    upazilas: [
      'নওগাঁ সদর',
      'মহাদেবপুর',
      'মান্দা',
      'পত্নীতলা',
      'বদলগাছী',
      'নিয়ামতপুর',
      'রানীনগর',
      'আত্রাই',
      'ধামইরহাট',
      'সাপাহার',
      'পোরশা',
    ],
  },
  {
    id: 'natore',
    divisionId: 'rajshahi',
    nameBn: 'নাটোর',
    nameEn: 'Natore',
    upazilas: ['নাটোর সদর', 'সিংড়া', 'গুরুদাসপুর', 'বড়াইগ্রাম', 'লালপুর', 'বাগাতিপাড়া', 'নলডাঙ্গা'],
  },
  {
    id: 'chapainawabganj',
    divisionId: 'rajshahi',
    nameBn: 'চাঁপাইনবাবগঞ্জ',
    nameEn: 'Chapai Nawabganj',
    upazilas: ['চাঁপাইনবাবগঞ্জ সদর', 'শিবগঞ্জ', 'গোমস্তাপুর', 'নাচোল', 'ভোলাহাট'],
  },
  {
    id: 'joypurhat',
    divisionId: 'rajshahi',
    nameBn: 'জয়পুরহাট',
    nameEn: 'Joypurhat',
    upazilas: ['জয়পুরহাট সদর', 'পাঁচবিবি', 'কালাই', 'ক্ষেতলাল', 'আক্কেলপুর'],
  },

  // ----------------------------------------------------
  // KHULNA DIVISION (১০ জেলা)
  // ----------------------------------------------------
  {
    id: 'khulna',
    divisionId: 'khulna',
    nameBn: 'খুলনা',
    nameEn: 'Khulna',
    upazilas: [
      'খুলনা সদর',
      'সোনাডাঙ্গা',
      'খালিশপুর',
      'দৌলতপুর',
      'খানজাহান আলী',
      'বটিয়াঘাটা',
      'দাকোপ',
      'ডুমুরিয়া',
      'দিঘলিয়া',
      'কয়রা',
      'পাইকগাছা',
      'ফুলতলা',
      'রূপসা',
      'তেরখাদা',
    ],
  },
  {
    id: 'jashore',
    divisionId: 'khulna',
    nameBn: 'যশোর',
    nameEn: 'Jashore',
    upazilas: ['যশোর সদর', 'ঝিকরগাছা', 'শার্শা', 'মণিরামপুর', 'কেশবপুর', 'অভয়নগর', 'বাঘারপাড়া', 'চৌগাছা'],
  },
  {
    id: 'kushtia',
    divisionId: 'khulna',
    nameBn: 'কুষ্টিয়া',
    nameEn: 'Kushtia',
    upazilas: ['কুষ্টিয়া সদর', 'কুমারখালী', 'খোকসা', 'মিরপুর', 'ভেড়ামারা', 'দৌলতপুর'],
  },
  {
    id: 'satkhira',
    divisionId: 'khulna',
    nameBn: 'সাতক্ষীরা',
    nameEn: 'Satkhira',
    upazilas: ['সাতক্ষীরা সদর', 'কলারোয়া', 'তালা', 'দেবহাটা', 'কালিগঞ্জ', 'আশাশুনি', 'শ্যামনগর'],
  },
  {
    id: 'jhenaidah',
    divisionId: 'khulna',
    nameBn: 'ঝিনাইদহ',
    nameEn: 'Jhenaidah',
    upazilas: ['ঝিনাইদহ সদর', 'শৈলকুপা', 'হরিণাকুণ্ডু', 'কালীগঞ্জ', 'কোটচাঁদপুর', 'মহেশপুর'],
  },
  {
    id: 'chuadanga',
    divisionId: 'khulna',
    nameBn: 'চুয়াডাঙ্গা',
    nameEn: 'Chuadanga',
    upazilas: ['চুয়াডাঙ্গা সদর', 'আলমডাঙ্গা', 'দামুড়হুদা', 'জীবননগর'],
  },
  {
    id: 'meherpur',
    divisionId: 'khulna',
    nameBn: 'মেহেরপুর',
    nameEn: 'Meherpur',
    upazilas: ['মেহেরপুর সদর', 'গাংনী', 'মুজিবনগর'],
  },
  {
    id: 'magura',
    divisionId: 'khulna',
    nameBn: 'মাগুরা',
    nameEn: 'Magura',
    upazilas: ['মাগুরা সদর', 'শ্রীপুর', 'মহম্মদপুর', 'শালিখা'],
  },
  {
    id: 'narail',
    divisionId: 'khulna',
    nameBn: 'নড়াইল',
    nameEn: 'Narail',
    upazilas: ['নড়াইল সদর', 'লোহাগড়া', 'কালিয়া'],
  },
  {
    id: 'bagerhat',
    divisionId: 'khulna',
    nameBn: 'বাগেরহাট',
    nameEn: 'Bagerhat',
    upazilas: ['বাগেরহাট সদর', 'ফকিরহাট', 'মোল্লাহাট', 'কচুয়া', 'রামপাল', 'মোংলা', 'মোরেলগঞ্জ', 'শরণখোলা', 'চিতলমারী'],
  },

  // ----------------------------------------------------
  // BARISHAL DIVISION (৬ জেলা)
  // ----------------------------------------------------
  {
    id: 'barishal',
    divisionId: 'barishal',
    nameBn: 'বরিশাল',
    nameEn: 'Barishal',
    upazilas: [
      'বরিশাল কোতোয়ালী',
      'এয়ারপোর্ট',
      'কাউনিয়া',
      'বন্দর',
      'বাকেরগঞ্জ',
      'বাবুগঞ্জ',
      'উজিরপুর',
      'বানারীপাড়া',
      'গৌরনদী',
      'আগৈলঝাড়া',
      'মুলাদী',
      'হিজলা',
      'মেহেন্দীগঞ্জ',
    ],
  },
  {
    id: 'patuakhali',
    divisionId: 'barishal',
    nameBn: 'পটুয়াখালী',
    nameEn: 'Patuakhali',
    upazilas: ['পটুয়াখালী সদর', 'বাউফল', 'গলাচিপা', 'কলাপাড়া', 'মির্জাগঞ্জ', 'দশমিনা', 'দুমকি', 'রাঙ্গাবালী'],
  },
  {
    id: 'bhola',
    divisionId: 'barishal',
    nameBn: 'ভোলা',
    nameEn: 'Bhola',
    upazilas: ['ভোলা সদর', 'দৌলতখান', 'বোরহানউদ্দিন', 'তজুমদ্দিন', 'লালমোহন', 'চরফ্যাশন', 'মনপুরা'],
  },
  {
    id: 'pirojpur',
    divisionId: 'barishal',
    nameBn: 'পিরোজপুর',
    nameEn: 'Pirojpur',
    upazilas: ['পিরোজপুর সদর', 'মঠবাড়িয়া', 'ভান্ডারিয়া', 'নাজিরপুর', 'নেছারাবাদ (স্বরূপকাঠি)', 'কাউখালী', 'ইন্দুরকানী'],
  },
  {
    id: 'barguna',
    divisionId: 'barishal',
    nameBn: 'বরগুনা',
    nameEn: 'Barguna',
    upazilas: ['বরগুনা সদর', 'আমতলী', 'তালতলী', 'পাথরঘাটা', 'বেতাগী', 'বামনা'],
  },
  {
    id: 'jhalakathi',
    divisionId: 'barishal',
    nameBn: 'ঝালকাঠি',
    nameEn: 'Jhalakathi',
    upazilas: ['ঝালকাঠি সদর', 'নলছিটি', 'রাজাপুর', 'কাঁঠালিয়া'],
  },

  // ----------------------------------------------------
  // SYLHET DIVISION (৪ জেলা)
  // ----------------------------------------------------
  {
    id: 'sylhet',
    divisionId: 'sylhet',
    nameBn: 'সিলেট',
    nameEn: 'Sylhet',
    upazilas: [
      'সিলেট কোতোয়ালী',
      'শাহপরাণ',
      'দক্ষিণ সুরমা',
      'জালালাবাদ',
      'ওসমানীনগর',
      'বালাগঞ্জ',
      'বিশ্বনাথ',
      'বিয়ানীবাজার',
      'গোলাপগঞ্জ',
      'ফেঞ্চুগঞ্জ',
      'জকিগঞ্জ',
      'কানাইঘাট',
      'কোম্পানীগঞ্জ',
      'গোয়াইনঘাট',
      'জৈন্তাপুর',
    ],
  },
  {
    id: 'moulvibazar',
    divisionId: 'sylhet',
    nameBn: 'মৌলভীবাজার',
    nameEn: 'Moulvibazar',
    upazilas: ['মৌলভীবাজার সদর', 'শ্রীমঙ্গল', 'কমলগঞ্জ', 'কুলাউড়া', 'বড়লেখা', 'জুড়ী', 'রাজনগর'],
  },
  {
    id: 'habiganj',
    divisionId: 'sylhet',
    nameBn: 'হবিগঞ্জ',
    nameEn: 'Habiganj',
    upazilas: ['হবিগঞ্জ সদর', 'মাধবপুর', 'চুনারুঘাট', 'বাহুবল', 'নবীগঞ্জ', 'বানিয়াচং', 'আজমিরীগঞ্জ', 'লাখাই', 'শায়েস্তাগঞ্জ'],
  },
  {
    id: 'sunamganj',
    divisionId: 'sylhet',
    nameBn: 'সুনামগঞ্জ',
    nameEn: 'Sunamganj',
    upazilas: [
      'সুনামগঞ্জ সদর',
      'জগন্নাথপুর',
      'ছাতক',
      'দোয়ারাবাজার',
      'শান্তিগঞ্জ',
      'দিরাই',
      'শাল্লা',
      'ধর্মপাশা',
      'জামালগঞ্জ',
      'তাহিরপুর',
      'বিশ্বম্ভরপুর',
      'মধ্যনগর',
    ],
  },

  // ----------------------------------------------------
  // RANGPUR DIVISION (৮ জেলা)
  // ----------------------------------------------------
  {
    id: 'rangpur',
    divisionId: 'rangpur',
    nameBn: 'রংপুর',
    nameEn: 'Rangpur',
    upazilas: ['রংপুর সদর', 'গংগাচড়া', 'বদরগঞ্জ', 'তারাগঞ্জ', 'পীরগঞ্জ', 'পীরগাছা', 'কাউনিয়া', 'মিঠাপুকুর'],
  },
  {
    id: 'dinajpur',
    divisionId: 'rangpur',
    nameBn: 'দিনাজপুর',
    nameEn: 'Dinajpur',
    upazilas: [
      'দিনাজপুর সদর',
      'বিরল',
      'বোচাগঞ্জ',
      'কাহারোল',
      'বীরগঞ্জ',
      'খানসামা',
      'চিরিরবন্দর',
      'পার্বতীপুর',
      'ফুলবাড়ী',
      'নবাবগঞ্জ',
      'বিরামপুর',
      'হাকিমপুর',
      'ঘোড়াঘাট',
    ],
  },
  {
    id: 'gaibandha',
    divisionId: 'rangpur',
    nameBn: 'গাইবান্ধা',
    nameEn: 'Gaibandha',
    upazilas: ['গাইবান্ধা সদর', 'সাদুল্লাপুর', 'পলাশবাড়ী', 'গোবিন্দগঞ্জ', 'সুন্দরগঞ্জ', 'সাঘাটা', 'ফুলছড়ি'],
  },
  {
    id: 'kurigram',
    divisionId: 'rangpur',
    nameBn: 'কুড়িগ্রাম',
    nameEn: 'Kurigram',
    upazilas: ['কুড়িগ্রাম সদর', 'উলিপুর', 'নাগেশ্বরী', 'ভূরুঙ্গামারী', 'ফুলবাড়ী', 'রাজারহাট', 'চিলমারী', 'রৌমারী', 'চর রাজীবপুর'],
  },
  {
    id: 'lalmonirhat',
    divisionId: 'rangpur',
    nameBn: 'লালমনিরহাট',
    nameEn: 'Lalmonirhat',
    upazilas: ['লালমনিরহাট সদর', 'আদিতমারী', 'কালীগঞ্জ', 'হাতীবান্ধা', 'পাটগ্রাম'],
  },
  {
    id: 'nilphamari',
    divisionId: 'rangpur',
    nameBn: 'নীলফামারী',
    nameEn: 'Nilphamari',
    upazilas: ['নীলফামারী সদর', 'সৈয়দপুর', 'ডোমার', 'ডিমলা', 'জলঢাকা', 'কিশোরগঞ্জ'],
  },
  {
    id: 'panchagarh',
    divisionId: 'rangpur',
    nameBn: 'পঞ্চগড়',
    nameEn: 'Panchagarh',
    upazilas: ['পঞ্চগড় সদর', 'তেঁতুলিয়া', 'বোদা', 'দেবীগঞ্জ', 'আটোয়ারী'],
  },
  {
    id: 'thakurgaon',
    divisionId: 'rangpur',
    nameBn: 'ঠাকুরগাঁও',
    nameEn: 'Thakurgaon',
    upazilas: ['ঠাকুরগাঁও সদর', 'পীরগঞ্জ', 'বালিয়াডাঙ্গী', 'রাণীশংকৈল', 'হরিপুর'],
  },

  // ----------------------------------------------------
  // MYMENSINGH DIVISION (৪ জেলা)
  // ----------------------------------------------------
  {
    id: 'mymensingh',
    divisionId: 'mymensingh',
    nameBn: 'ময়মনসিংহ',
    nameEn: 'Mymensingh',
    upazilas: [
      'ময়মনসিংহ সদর (কোতোয়ালী)',
      'মুক্তাগাছা',
      'ফুলবাড়িয়া',
      'ত্রিশাল',
      'ভালুকা',
      'গফরগাঁও',
      'নান্দাইল',
      'ঈশ্বরগঞ্জ',
      'গৌরীপুর',
      'ফুলপুর',
      'তারাকান্দা',
      'ধোবাউড়া',
      'হালুয়াঘাট',
    ],
  },
  {
    id: 'jamalpur',
    divisionId: 'mymensingh',
    nameBn: 'জামালপুর',
    nameEn: 'Jamalpur',
    upazilas: ['জামালপুর সদর', 'সরিষাবাড়ী', 'মেলান্দহ', 'ইসলামপুর', 'দেওয়ানগঞ্জ', 'বকশীগঞ্জ', 'মাদারগঞ্জ'],
  },
  {
    id: 'sherpur',
    divisionId: 'mymensingh',
    nameBn: 'শেরপুর',
    nameEn: 'Sherpur',
    upazilas: ['শেরপুর সদর', 'নালিতাবাড়ী', 'নকলা', 'ঝিনাইগাতী', 'শ্রীবরদী'],
  },
  {
    id: 'netrokona',
    divisionId: 'mymensingh',
    nameBn: 'নেত্রকোণা',
    nameEn: 'Netrokona',
    upazilas: [
      'নেত্রকোণা সদর',
      'পূর্বধলা',
      'দুর্গাপুর',
      'কলমাকান্দা',
      'বারহাট্টা',
      'আটপাড়া',
      'মোহনগঞ্জ',
      'মদন',
      'খালিয়াজুড়ি',
      'কেন্দুয়া',
    ],
  },
];

/**
 * Get districts, optionally filtered by division ID
 */
export function getDistrictsByDivision(divisionId?: string): DistrictItem[] {
  if (!divisionId) return BANGLADESH_DISTRICTS;
  const clean = divisionId.toLowerCase().trim();
  return BANGLADESH_DISTRICTS.filter(
    (d) => d.divisionId.toLowerCase() === clean || d.nameEn.toLowerCase() === clean
  );
}

/**
 * Find district item by name (Bengali or English, case-insensitive)
 */
export function findDistrict(districtName: string): DistrictItem | undefined {
  if (!districtName) return undefined;
  const clean = districtName.toLowerCase().trim();
  return BANGLADESH_DISTRICTS.find(
    (d) =>
      d.id === clean ||
      d.nameBn.toLowerCase() === clean ||
      d.nameEn.toLowerCase() === clean ||
      clean.includes(d.nameBn.toLowerCase()) ||
      clean.includes(d.nameEn.toLowerCase()) ||
      d.nameEn.toLowerCase().includes(clean)
  );
}

/**
 * Get upazilas for a district name
 */
export function getUpazilasForDistrict(districtName: string): string[] {
  const district = findDistrict(districtName);
  return district ? district.upazilas : [];
}

/**
 * Check if two district references match (supports English vs Bengali vs partial matching)
 */
export function isDistrictMatch(donorDistrict?: string, searchDistrict?: string): boolean {
  if (!searchDistrict) return true;
  if (!donorDistrict) return false;

  const cleanDonor = donorDistrict.toLowerCase().trim();
  const cleanSearch = searchDistrict.toLowerCase().trim();

  if (cleanDonor === cleanSearch) return true;

  const d1 = findDistrict(cleanDonor);
  const d2 = findDistrict(cleanSearch);

  if (d1 && d2) {
    return d1.id === d2.id;
  }

  return cleanDonor.includes(cleanSearch) || cleanSearch.includes(cleanDonor);
}

/**
 * Check if two upazilas match
 */
export function isUpazilaMatch(donorUpazila?: string, searchUpazila?: string): boolean {
  if (!searchUpazila) return true;
  if (!donorUpazila) return false;

  const cleanDonor = donorUpazila.toLowerCase().trim();
  const cleanSearch = searchUpazila.toLowerCase().trim();

  if (cleanDonor === cleanSearch) return true;

  return cleanDonor.includes(cleanSearch) || cleanSearch.includes(cleanDonor);
}
