import * as XLSX from 'xlsx';
import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { Donor, BloodGroup, Gender } from '../types';
import type {
  DonorImportMapping,
  DonorImportRowValidation,
  NormalizedImportedDonor,
  DonorImportBatchSummary,
  DonorImportExecutionResult,
  DuplicateClassification,
} from '../types/donorImport';
import { generateDonorId, getLocationCode } from './idGenerator';

// Target System Field Definitions
export const ROKTOBONDON_IMPORT_FIELDS = [
  { key: 'fullName', label: 'নাম (Full Name)', required: true, aliases: ['name', 'donor_name', 'full_name', 'নাম', 'ডোনার নাম', 'রক্তদাতার নাম', 'নামঃ'] },
  { key: 'phone', label: 'মোবাইল নম্বর (Phone)', required: true, aliases: ['phone', 'mobile', 'phone_number', 'contact', 'mobile_no', 'মোবাইল', 'ফোন', 'মোবাইল নম্বর', 'ফোন নম্বর', 'যোগাযোগ'] },
  { key: 'alternatePhone', label: 'বিকল্প মোবাইল (Alternate Phone)', required: false, aliases: ['alt_phone', 'alternate_phone', 'emergency_contact', 'বিকল্প মোবাইল', 'বিকল্প ফোন', 'জরুরি যোগাযোগ'] },
  { key: 'bloodGroup', label: 'রক্তের গ্রুপ (Blood Group)', required: true, aliases: ['blood', 'blood_group', 'group', 'blood_type', 'রক্তের গ্রুপ', 'গ্রুপ', 'রক্ত'] },
  { key: 'gender', label: 'লিঙ্গ (Gender)', required: false, aliases: ['gender', 'sex', 'লিঙ্গ', 'জেন্ডার'] },
  { key: 'dateOfBirth', label: 'জন্মতারিখ (Date of Birth)', required: false, aliases: ['dob', 'birth_date', 'date_of_birth', 'জন্মতারিখ', 'জন্ম তারিখ'] },
  { key: 'exactAddress', label: 'ঠিকানা (Address)', required: false, aliases: ['address', 'present_address', 'village', 'ঠিকানা', 'গ্রাম', 'বর্তমান ঠিকানা'] },
  { key: 'area', label: 'এলাকা (Area / Union)', required: false, aliases: ['area', 'union', 'ward', 'এলাকা', 'ইউনিয়ন', 'ওয়ার্ড', 'মহল্লা'] },
  { key: 'upazila', label: 'উপজেলা (Upazila)', required: false, aliases: ['upazila', 'thana', 'subdistrict', 'উপজেলা', 'থানা'] },
  { key: 'district', label: 'জেলা (District)', required: false, aliases: ['district', 'zilla', 'জেলা'] },
  { key: 'lastDonationDate', label: 'সর্বশেষ রক্তদানের তারিখ (Last Donation Date)', required: false, aliases: ['last_donation', 'last_donation_date', 'last_donated', 'last donation', 'last donation date', 'সর্বশেষ রক্তদান', 'সর্বশেষ রক্তদানের তারিখ'] },
  { key: 'totalDonations', label: 'মোট রক্তদান (Total Donations)', required: false, aliases: ['total_donations', 'total_donation', 'total donations', 'total donation', 'total_donated', 'total donated', 'donation_count', 'times_donated', 'মোট রক্তদান', 'রক্তদানের সংখ্যা', 'মোট দান'] },
  { key: 'availability', label: 'উপলব্ধতা (Availability)', required: false, aliases: ['available', 'availability', 'is_available', 'উপলভ্যতা', 'প্রস্তুত'] },
  { key: 'notes', label: 'মন্তব্য / নোট (Notes)', required: false, aliases: ['notes', 'admin_notes', 'remarks', 'comment', 'মন্তব্য', 'নোট'] },
];

/**
 * Normalizes blood group string into standard enum
 */
export function normalizeBloodGroup(raw: any): BloodGroup | null {
  if (!raw) return null;
  const str = String(raw).trim().toUpperCase();

  // Standard symbols
  if (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(str)) {
    return str as BloodGroup;
  }

  // Common aliases
  const cleaned = str
    .replace(/\s+/g, '')
    .replace(/VE/g, '')
    .replace(/POSITIVE/g, '+')
    .replace(/NEGATIVE/g, '-')
    .replace(/POS/g, '+')
    .replace(/NEG/g, '-')
    .replace(/পজিটিভ/g, '+')
    .replace(/নেগেটিভ/g, '-')
    .replace(/এবি/g, 'AB')
    .replace(/এ/g, 'A')
    .replace(/বি/g, 'B')
    .replace(/ও/g, 'O');

  if (['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(cleaned)) {
    return cleaned as BloodGroup;
  }

  // Pos / Neg variations
  if (/^A\s*\+/i.test(str) || /^A\s*POS/i.test(str)) return 'A+';
  if (/^A\s*-/i.test(str) || /^A\s*NEG/i.test(str)) return 'A-';
  if (/^B\s*\+/i.test(str) || /^B\s*POS/i.test(str)) return 'B+';
  if (/^B\s*-/i.test(str) || /^B\s*NEG/i.test(str)) return 'B-';
  if (/^AB\s*\+/i.test(str) || /^AB\s*POS/i.test(str)) return 'AB+';
  if (/^AB\s*-/i.test(str) || /^AB\s*NEG/i.test(str)) return 'AB-';
  if (/^O\s*\+/i.test(str) || /^O\s*POS/i.test(str)) return 'O+';
  if (/^O\s*-/i.test(str) || /^O\s*NEG/i.test(str)) return 'O-';

  return null;
}

/**
 * Normalizes Bangladesh Phone numbers to 11-digit 01XXXXXXXXX format
 */
export function normalizeBangladeshPhone(raw: any): string | null {
  if (!raw) return null;
  let str = String(raw).trim();

  // Convert Bengali digits to English
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  str = str.replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);

  // Remove spaces, hyphens, plus, parenthesis
  let digits = str.replace(/[^0-9]/g, '');

  if (digits.startsWith('880')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('+880')) {
    digits = digits.slice(3);
  }

  if (digits.length === 10 && digits.startsWith('1')) {
    digits = '0' + digits;
  }

  // Must be 11 digits starting with valid BD mobile operator prefixes: 013, 014, 015, 016, 017, 018, 019
  if (/^01[3-9]\d{8}$/.test(digits)) {
    return digits;
  }

  return null;
}

/**
 * Normalizes dates from various formats (DD/MM/YYYY, YYYY-MM-DD, Excel serials) into YYYY-MM-DD
 */
export function normalizeDate(raw: any): string | null {
  if (!raw) return null;

  // Handle Excel numeric serial dates (e.g. 44561)
  if (typeof raw === 'number' && raw > 1000 && raw < 100000) {
    try {
      const utc_days = Math.floor(raw - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      if (!isNaN(date_info.getTime())) {
        return date_info.toISOString().split('T')[0];
      }
    } catch {
      // ignore
    }
  }

  let str = String(raw).trim();
  // Convert Bengali digits
  const bnToEnMap: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  str = str.replace(/[০-৯]/g, (char) => bnToEnMap[char] || char);

  // Match YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return str;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1930 && year <= 2030) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Attempt Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() >= 1930 && parsed.getFullYear() <= 2030) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Normalizes gender string
 */
export function normalizeGender(raw: any): Gender | undefined {
  if (!raw) return undefined;
  const str = String(raw).trim().toLowerCase();
  if (['male', 'm', 'পুরুষ', 'ছেলে'].includes(str)) return 'male';
  if (['female', 'f', 'নারী', 'মহিলা', 'মেয়ে'].includes(str)) return 'female';
  if (['other', 'অন্যান্য'].includes(str)) return 'other';
  return undefined;
}

/**
 * Automatically suggests column mappings based on headers
 */
export function suggestColumnMappings(headers: string[]): DonorImportMapping {
  const mapping: DonorImportMapping = {};

  for (const header of headers) {
    const cleanHeader = header.trim().toLowerCase().replace(/[\s_\-:\(\)]+/g, '');

    // First pass: Exact match with alias
    let matchedFieldKey: string | null = null;
    for (const field of ROKTOBONDON_IMPORT_FIELDS) {
      const exactMatch = field.aliases.some((alias) => {
        const cleanAlias = alias.toLowerCase().replace(/[\s_\-:\(\)]+/g, '');
        return cleanHeader === cleanAlias;
      });

      if (exactMatch) {
        matchedFieldKey = field.key;
        break;
      }
    }

    // Second pass: Fuzzy substring match (for longer headers) if no exact match found
    if (!matchedFieldKey) {
      for (const field of ROKTOBONDON_IMPORT_FIELDS) {
        const subMatch = field.aliases.some((alias) => {
          const cleanAlias = alias.toLowerCase().replace(/[\s_\-:\(\)]+/g, '');
          // Only allow inclusion match if alias has at least 4 characters to avoid false positives with short keywords
          return cleanAlias.length >= 4 && (cleanHeader.includes(cleanAlias) || cleanAlias.includes(cleanHeader));
        });

        if (subMatch) {
          matchedFieldKey = field.key;
          break;
        }
      }
    }

    if (matchedFieldKey) {
      mapping[header] = matchedFieldKey;
    }
  }

  return mapping;
}

/**
 * Parse an uploaded .xlsx, .xls, or .csv file (supports browser File, ArrayBuffer, or Buffer)
 */
export async function parseImportFile(fileOrBuffer: File | ArrayBuffer | Uint8Array | Buffer): Promise<{
  sheets: string[];
  selectedSheet: string;
  rows: Record<string, any>[];
  headers: string[];
}> {
  let data: ArrayBuffer | Uint8Array | Buffer;
  if (typeof (fileOrBuffer as any).arrayBuffer === 'function') {
    data = await (fileOrBuffer as File).arrayBuffer();
  } else {
    data = fileOrBuffer as ArrayBuffer | Uint8Array | Buffer;
  }

  const workbook = XLSX.read(data, { type: 'array', cellDates: false });

  const sheetNames = workbook.SheetNames;
  if (!sheetNames || sheetNames.length === 0) {
    throw new Error('ফাইলে কোনো ওয়ার্কশীট খুঁজে পাওয়া যায়নি।');
  }

  const selectedSheet = sheetNames[0];
  const worksheet = workbook.Sheets[selectedSheet];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (rows.length === 0) {
    throw new Error('নির্বাচিত ওয়ার্কশীটে কোনো তথ্য বা সারি পাওয়া যায়নি।');
  }

  const headers = Object.keys(rows[0] || {});

  return {
    sheets: sheetNames,
    selectedSheet,
    rows,
    headers,
  };
}

/**
 * Validates each imported row and performs multi-tier duplicate classification
 */
export function validateAndClassifyRows(
  rawRows: Record<string, any>[],
  mappings: DonorImportMapping,
  existingDonors: Donor[]
): DonorImportRowValidation[] {
  // Build lookup indexes for fast duplicate check
  const phoneToDonorMap = new Map<string, Donor>();
  const namePhoneToDonorMap = new Map<string, Donor>();
  const nameDobToDonorMap = new Map<string, Donor>();

  for (const d of existingDonors) {
    if (d.phone) {
      const p = normalizeBangladeshPhone(d.phone);
      if (p) phoneToDonorMap.set(p, d);
    }
    const cleanName = (d.fullName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (d.phone && cleanName) {
      const p = normalizeBangladeshPhone(d.phone);
      if (p) namePhoneToDonorMap.set(`${cleanName}_${p}`, d);
    }
    if (d.dateOfBirth && cleanName) {
      nameDobToDonorMap.set(`${cleanName}_${d.dateOfBirth}`, d);
    }
  }

  const seenInBatchPhones = new Set<string>();

  return rawRows.map((row, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract values based on mapping
    const rawFullName = row[Object.keys(mappings).find((k) => mappings[k] === 'fullName') || ''];
    const rawPhone = row[Object.keys(mappings).find((k) => mappings[k] === 'phone') || ''];
    const rawAltPhone = row[Object.keys(mappings).find((k) => mappings[k] === 'alternatePhone') || ''];
    const rawBloodGroup = row[Object.keys(mappings).find((k) => mappings[k] === 'bloodGroup') || ''];
    const rawGender = row[Object.keys(mappings).find((k) => mappings[k] === 'gender') || ''];
    const rawDob = row[Object.keys(mappings).find((k) => mappings[k] === 'dateOfBirth') || ''];
    const rawAddress = row[Object.keys(mappings).find((k) => mappings[k] === 'exactAddress') || ''];
    const rawArea = row[Object.keys(mappings).find((k) => mappings[k] === 'area') || ''];
    const rawUpazila = row[Object.keys(mappings).find((k) => mappings[k] === 'upazila') || ''];
    const rawDistrict = row[Object.keys(mappings).find((k) => mappings[k] === 'district') || ''];
    const rawLastDonation = row[Object.keys(mappings).find((k) => mappings[k] === 'lastDonationDate') || ''];
    const rawTotalDonations = row[Object.keys(mappings).find((k) => mappings[k] === 'totalDonations') || ''];
    const rawNotes = row[Object.keys(mappings).find((k) => mappings[k] === 'notes') || ''];

    // 1. Validate Name
    const fullName = String(rawFullName || '').trim();
    if (!fullName) {
      errors.push('রক্তদাতার নাম অনুপস্থিত');
    }

    // 2. Validate & Normalize Phone
    const phone = normalizeBangladeshPhone(rawPhone);
    if (!phone) {
      errors.push(`মোবাইল নম্বর অবৈধ বা অনুপস্থিত: "${rawPhone || ''}"`);
    }

    // 3. Alternate Phone (Optional)
    const alternatePhone = rawAltPhone ? normalizeBangladeshPhone(rawAltPhone) || undefined : undefined;

    // 4. Validate & Normalize Blood Group
    const bloodGroup = normalizeBloodGroup(rawBloodGroup);
    if (!bloodGroup) {
      errors.push(`রক্তের গ্রুপ সঠিক নয়: "${rawBloodGroup || ''}" (A+, B+, O+, AB+, ইত্যাদি দিন)`);
    }

    // 5. Normalize Dates
    const dateOfBirth = rawDob ? normalizeDate(rawDob) || undefined : undefined;
    if (rawDob && !dateOfBirth) {
      warnings.push(`জন্মতারিখের ফরম্যাট অস্পষ্ট: "${rawDob}" (বাদ দেওয়া হয়েছে)`);
    }

    const lastDonationDate = rawLastDonation ? normalizeDate(rawLastDonation) || undefined : undefined;
    if (rawLastDonation && !lastDonationDate) {
      warnings.push(`সর্বশেষ রক্তদানের তারিখ অস্পষ্ট: "${rawLastDonation}"`);
    }

    // 6. Total Donations
    let totalDonations = 0;
    if (rawTotalDonations !== undefined && rawTotalDonations !== '') {
      const parsedCount = parseInt(String(rawTotalDonations).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsedCount) && parsedCount >= 0) {
        totalDonations = parsedCount;
      }
    } else if (lastDonationDate) {
      totalDonations = 1;
    }

    // 7. Duplicate Detection & Classification
    let classification: DuplicateClassification = 'NEW';
    let matchedDonor: Donor | undefined;
    let matchReason: string | undefined;

    if (phone) {
      if (seenInBatchPhones.has(phone)) {
        classification = 'EXACT_DUPLICATE';
        matchReason = 'এই ফাইলটিতেই একই মোবাইল নম্বর একাধিকবার রয়েছে';
      } else if (phoneToDonorMap.has(phone)) {
        matchedDonor = phoneToDonorMap.get(phone);
        const cleanName = fullName.toLowerCase().replace(/\s+/g, ' ');
        const existingName = (matchedDonor?.fullName || '').toLowerCase().replace(/\s+/g, ' ');

        if (cleanName === existingName) {
          classification = 'EXACT_DUPLICATE';
          matchReason = `ডাটাবেজে একই নাম ও ফোন নম্বরে রক্তদাতা বিদ্যমান (ID: ${matchedDonor?.donorId})`;
        } else {
          classification = 'CONFLICT';
          matchReason = `একই নম্বরে অন্য রক্তদাতা নিবন্ধিত (${matchedDonor?.fullName}, ID: ${matchedDonor?.donorId})`;
        }
      } else {
        // Check strong secondary combination: Name + DOB
        const cleanName = fullName.toLowerCase().replace(/\s+/g, ' ');
        if (dateOfBirth && nameDobToDonorMap.has(`${cleanName}_${dateOfBirth}`)) {
          matchedDonor = nameDobToDonorMap.get(`${cleanName}_${dateOfBirth}`);
          classification = 'POSSIBLE_DUPLICATE';
          matchReason = `একই নাম ও জন্মতারিখে ডোনার বিদ্যমান (ID: ${matchedDonor?.donorId})`;
        }
        seenInBatchPhones.add(phone);
      }
    }

    // Construct Status
    let status: 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE' = 'VALID';
    if (errors.length > 0) {
      status = 'ERROR';
    } else if (classification === 'EXACT_DUPLICATE' || classification === 'CONFLICT') {
      status = 'DUPLICATE';
    } else if (warnings.length > 0 || classification === 'POSSIBLE_DUPLICATE') {
      status = 'WARNING';
    }

    const normalizedData: NormalizedImportedDonor | undefined =
      errors.length === 0 && bloodGroup && phone
        ? {
            rowNumber,
            fullName,
            phone,
            alternatePhone,
            bloodGroup,
            gender: normalizeGender(rawGender),
            dateOfBirth,
            exactAddress: String(rawAddress || '').trim() || undefined,
            area: String(rawArea || '').trim() || undefined,
            upazila: String(rawUpazila || 'ধামরাই').trim(),
            district: String(rawDistrict || 'ঢাকা').trim(),
            lastDonationDate,
            totalDonations,
            availability: true,
            notes: String(rawNotes || '').trim() || undefined,
          }
        : undefined;

    return {
      rowNumber,
      rawData: row,
      normalizedData,
      status,
      classification,
      errors,
      warnings,
      matchedExistingDonorId: matchedDonor?.donorId,
      matchedExistingDonorName: matchedDonor?.fullName,
      matchReason,
    };
  });
}

/**
 * Generates an official Excel (.xlsx) Import Template
 */
export function generateDonorImportTemplateExcel(): Blob {
  const headers = [
    'নাম (Full Name)',
    'মোবাইল নম্বর (Phone)',
    'বিকল্প মোবাইল (Alternate Phone)',
    'রক্তের গ্রুপ (Blood Group)',
    'লিঙ্গ (Gender)',
    'জন্মতারিখ (Date of Birth)',
    'ঠিকানা (Address)',
    'এলাকা (Area)',
    'উপজেলা (Upazila)',
    'জেলা (District)',
    'সর্বশেষ রক্তদানের তারিখ (Last Donation Date)',
    'মোট রক্তদান (Total Donations)',
    'মন্তব্য (Notes)',
  ];

  const sampleRows = [
    [
      'মোহাম্মদ আনিসুর রহমান',
      '01712345678',
      '01812345678',
      'A+',
      'Male',
      '1995-05-12',
      'কালামপুর বাজার সংলগ্ন',
      'কালামপুর',
      'ধামরাই',
      'ঢাকা',
      '2026-01-15',
      '3',
      'নিয়মিত স্বেচ্ছাসেবী রক্তদাতা',
    ],
    [
      'ফাতেমা আক্তার',
      '01912345678',
      '',
      'O+',
      'Female',
      '1998-10-20',
      'কুশুরা ইউনিয়ন',
      'কুশুরা',
      'ধামরাই',
      'ঢাকা',
      '',
      '1',
      'জরুরিতে পাওয়া যাবে',
    ],
    [
      'Md. Tanvir Hossain',
      '01612345678',
      '',
      'B+',
      'Male',
      '1992-03-08',
      'সাভার বাজার রোড',
      'সাভার',
      'সাভার',
      'ঢাকা',
      '2025-11-10',
      '5',
      'জরুরি রক্তদাতা',
    ],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Name
    { wch: 18 }, // Phone
    { wch: 20 }, // Alt Phone
    { wch: 16 }, // Blood Group
    { wch: 12 }, // Gender
    { wch: 16 }, // DOB
    { wch: 30 }, // Address
    { wch: 18 }, // Area
    { wch: 15 }, // Upazila
    { wch: 15 }, // District
    { wch: 22 }, // Last Date
    { wch: 15 }, // Total
    { wch: 30 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Donor Import Template');

  const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Generates an official CSV Import Template
 */
export function generateDonorImportTemplateCsv(): Blob {
  const headers = [
    'name',
    'phone',
    'alternate_phone',
    'blood_group',
    'gender',
    'date_of_birth',
    'address',
    'area',
    'upazila',
    'district',
    'last_donation_date',
    'total_donations',
    'notes',
  ];

  const sampleRows = [
    ['Md. Anisur Rahman', '01712345678', '01812345678', 'A+', 'Male', '1995-05-12', 'Kalampur Bazar', 'Kalampur', 'Dhamrai', 'Dhaka', '2026-01-15', '3', 'Regular donor'],
    ['Fatema Akter', '01912345678', '', 'O+', 'Female', '1998-10-20', 'Kushura', 'Kushura', 'Dhamrai', 'Dhaka', '', '1', 'Emergency available'],
  ];

  const csvContent = [
    headers.join(','),
    ...sampleRows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  return new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Generates a downloadable Error & Duplicate CSV Report
 */
export function generateErrorReportCsv(
  items: Array<{ rowNumber: number; name?: string; phone?: string; status: string; reason: string }>
): Blob {
  const headers = ['Row Number', 'Name', 'Phone', 'Status', 'Error / Reason'];
  const rows = items.map((i) => [
    i.rowNumber,
    `"${(i.name || '').replace(/"/g, '""')}"`,
    `"${(i.phone || '').replace(/"/g, '""')}"`,
    `"${i.status}"`,
    `"${(i.reason || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  return new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
}

/**
 * Executes server-side Donor Import via secure Supabase RPC (or fallback)
 */
export async function executeDonorImport(
  filename: string,
  validDonors: NormalizedImportedDonor[],
  duplicateDetails: Array<{ rowNumber: number; name?: string; phone?: string; status: string; reason: string }>,
  currentUser: { id: string; fullName?: string; role?: string }
): Promise<DonorImportExecutionResult> {
  const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('admin_import_donors_batch', {
        p_filename: filename,
        p_donors: validDonors,
        p_skipped_details: duplicateDetails,
      });

      if (error) {
        console.error('Error invoking admin_import_donors_batch RPC:', error);
        throw new Error(error.message || 'ডাটাবেজে তথ্য আমদানির সময় ত্রুটি ঘটেছে।');
      }

      return {
        success: true,
        batchId: data?.batch_id || batchId,
        totalProcessed: validDonors.length + duplicateDetails.length,
        importedCount: data?.imported_count ?? validDonors.length,
        skippedCount: data?.skipped_count ?? duplicateDetails.length,
        duplicateCount: data?.duplicate_count ?? duplicateDetails.filter((d) => d.status === 'DUPLICATE').length,
        errorCount: data?.error_count ?? duplicateDetails.filter((d) => d.status === 'ERROR').length,
        importedDonors: data?.imported_donors || [],
        errors: duplicateDetails,
      };
    } catch (err: any) {
      console.error('Exception in executeDonorImport:', err);
      throw err;
    }
  }

  // Fallback for local simulation mode
  const importedDonors = validDonors.map((d, index) => {
    const locCode = getLocationCode(d.upazila, d.district);
    const donorId = generateDonorId(locCode, 1000 + index);
    return {
      id: `donor-import-${Date.now()}-${index}`,
      donorId,
      userId: null,
      fullName: d.fullName,
      phone: d.phone,
      alternatePhone: d.alternatePhone,
      bloodGroup: d.bloodGroup,
      gender: d.gender || 'male',
      dateOfBirth: d.dateOfBirth,
      exactAddress: d.exactAddress || '',
      area: d.area || '',
      upazila: d.upazila || 'ধামরাই',
      district: d.district || 'ঢাকা',
      division: 'Dhaka',
      lastDonationDate: d.lastDonationDate,
      totalDonations: d.totalDonations || 0,
      verificationStatus: 'pending' as const,
      availability: true,
      emergencyAvailable: false,
      organizationId: 'org-roktobondon',
      branchId: 'br-dhm',
      importBatchId: batchId,
      source: 'imported',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    success: true,
    batchId,
    totalProcessed: validDonors.length + duplicateDetails.length,
    importedCount: importedDonors.length,
    skippedCount: duplicateDetails.length,
    duplicateCount: duplicateDetails.filter((d) => d.status === 'DUPLICATE').length,
    errorCount: duplicateDetails.filter((d) => d.status === 'ERROR').length,
    importedDonors,
    errors: duplicateDetails,
  };
}

/**
 * Fetch list of historical import batches
 */
export async function getDonorImportBatches(): Promise<DonorImportBatchSummary[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('donor_import_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching donor import batches:', error);
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        filename: row.filename,
        importedBy: row.imported_by,
        importedByName: row.imported_by_name,
        totalRows: Number(row.total_rows) || 0,
        successCount: Number(row.success_count) || 0,
        duplicateCount: Number(row.duplicate_count) || 0,
        errorCount: Number(row.error_count) || 0,
        status: row.status,
        createdAt: row.created_at,
        rolledBackAt: row.rolled_back_at,
        rolledBackBy: row.rolled_back_by,
        errorDetails: row.error_details || [],
      }));
    } catch (err) {
      console.error('Exception fetching donor import batches:', err);
      return [];
    }
  }

  return [];
}

/**
 * Safely rollback an unverified import batch
 */
export async function rollbackDonorImportBatch(batchId: string): Promise<{ success: boolean; deletedCount: number }> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc('admin_rollback_import_batch', {
      p_batch_id: batchId,
    });

    if (error) {
      console.error('Error rolling back import batch:', error);
      throw new Error(error.message || 'ব্যাচ রোলব্যাক করতে ব্যর্থ হয়েছে।');
    }

    return {
      success: Boolean(data?.success),
      deletedCount: Number(data?.deleted_count) || 0,
    };
  }

  return { success: true, deletedCount: 0 };
}
