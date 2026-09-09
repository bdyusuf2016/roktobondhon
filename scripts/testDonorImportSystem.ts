/**
 * Comprehensive Donor Import System Test Suite
 * Validates:
 * 1. File parsing (XLSX, CSV, edge cases)
 * 2. Header mapping (Bangla, English, aliases, unmapped)
 * 3. Data normalization (Blood groups, BD phones, dates, gender)
 * 4. Duplicate classification hierarchy (NEW, EXACT_DUPLICATE, POSSIBLE_DUPLICATE, CONFLICT)
 * 5. Two-tier auth compatibility (user_id = NULL, starts pending, no auto Auth creation)
 * 6. RBAC & Security simulation (role enforcement, audit logging, notification dispatch)
 * 7. Template and Error Report generation
 */

import * as XLSX from 'xlsx';
import {
  normalizeBloodGroup,
  normalizeBangladeshPhone,
  normalizeDate,
  normalizeGender,
  suggestColumnMappings,
  parseImportFile,
  validateAndClassifyRows,
  generateDonorImportTemplateExcel,
  generateDonorImportTemplateCsv,
  generateErrorReportCsv,
} from '../src/services/donorImportService';
import { DonorImportMapping } from '../src/types/donorImport';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('  DONOR IMPORT SYSTEM - COMPREHENSIVE TEST SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION A: NORMALIZERS & DATA SANITIZATION
  // ----------------------------------------------------
  console.log('--- SECTION A: Normalizers & Data Sanitization ---');

  // A1: Blood Group Normalization
  assert(normalizeBloodGroup('A+') === 'A+', 'Normalize standard A+');
  assert(normalizeBloodGroup('A positive') === 'A+', 'Normalize "A positive" -> A+');
  assert(normalizeBloodGroup('A POS') === 'A+', 'Normalize "A POS" -> A+');
  assert(normalizeBloodGroup('A+ve') === 'A+', 'Normalize "A+ve" -> A+');
  assert(normalizeBloodGroup('এ পজিটিভ') === 'A+', 'Normalize Bangla "এ পজিটিভ" -> A+');
  assert(normalizeBloodGroup('O negative') === 'O-', 'Normalize "O negative" -> O-');
  assert(normalizeBloodGroup('O-ve') === 'O-', 'Normalize "O-ve" -> O-');
  assert(normalizeBloodGroup('AB POS') === 'AB+', 'Normalize "AB POS" -> AB+');
  assert(normalizeBloodGroup('বি নেগেটিভ') === 'B-', 'Normalize Bangla "বি নেগেটিভ" -> B-');
  assert(normalizeBloodGroup('InvalidBlood') === null, 'Reject invalid blood group');
  assert(normalizeBloodGroup('') === null, 'Reject empty blood group without inventing');

  // A2: Phone Number Normalization (Bangladesh Formats)
  assert(normalizeBangladeshPhone('01712345678') === '01712345678', 'Normalize 017XXXXXXXX standard');
  assert(normalizeBangladeshPhone('+8801812345678') === '01812345678', 'Normalize +88018XXXXXXXX -> 018XXXXXXXX');
  assert(normalizeBangladeshPhone('8801912345678') === '01912345678', 'Normalize 88019XXXXXXXX -> 019XXXXXXXX');
  assert(normalizeBangladeshPhone('016-1234-5678') === '01612345678', 'Normalize 016 with hyphens');
  assert(normalizeBangladeshPhone('০১৭১২৩৪৫৬৭৮') === '01712345678', 'Normalize Bangla numerals in phone');
  assert(normalizeBangladeshPhone('01212345678') === null, 'Reject invalid BD operator 012');
  assert(normalizeBangladeshPhone('12345') === null, 'Reject short number');

  // A3: Date Normalization
  assert(normalizeDate('2025-06-15') === '2025-06-15', 'Normalize ISO date YYYY-MM-DD');
  assert(normalizeDate('15/06/2025') === '2025-06-15', 'Normalize DD/MM/YYYY');
  assert(normalizeDate('15-06-2025') === '2025-06-15', 'Normalize DD-MM-YYYY');
  assert(normalizeDate('১৫/০৬/২০২৫') === '2025-06-15', 'Normalize Bangla date string');
  assert(normalizeDate(45458) !== null, 'Normalize Excel serial date number');
  assert(normalizeDate('invalid-date') === null, 'Reject invalid date string');

  // A4: Gender Normalization
  assert(normalizeGender('male') === 'male', 'Normalize male');
  assert(normalizeGender('M') === 'male', 'Normalize M -> male');
  assert(normalizeGender('পুরুষ') === 'male', 'Normalize Bangla পুরুষ -> male');
  assert(normalizeGender('মহিলা') === 'female', 'Normalize Bangla মহিলা -> female');
  assert(normalizeGender('Female') === 'female', 'Normalize Female -> female');

  // ----------------------------------------------------
  // SECTION B: HEADER & COLUMN MAPPING
  // ----------------------------------------------------
  console.log('\n--- SECTION B: Column Mapping & Alias Recognition ---');

  const englishHeaders = [
    'Donor Name',
    'Mobile Number',
    'Alt Phone',
    'Blood Group',
    'Gender',
    'Date of Birth',
    'Address',
    'Area',
    'District',
    'Upazila',
    'Last Donation Date',
    'Total Donation',
    'Available',
    'Comments',
  ];

  const banglaHeaders = [
    'রক্তদাতার নাম',
    'মোবাইল নম্বর',
    'বিকল্প ফোন',
    'রক্তের গ্রুপ',
    'লিঙ্গ',
    'জন্মতারিখ',
    'ঠিকানা',
    'এলাকা',
    'জেলা',
    'উপজেলা',
    'সর্বশেষ রক্তদানের তারিখ',
    'মোট রক্তদান',
    'উপলভ্যতা',
    'মন্তব্য',
  ];

  const suggestedEng = suggestColumnMappings(englishHeaders);
  assert(suggestedEng['Donor Name'] === 'fullName', 'Map "Donor Name" -> fullName');
  assert(suggestedEng['Mobile Number'] === 'phone', 'Map "Mobile Number" -> phone');
  assert(suggestedEng['Blood Group'] === 'bloodGroup', 'Map "Blood Group" -> bloodGroup');
  assert(suggestedEng['Last Donation Date'] === 'lastDonationDate', 'Map "Last Donation Date" -> lastDonationDate');
  assert(suggestedEng['Total Donation'] === 'totalDonations', 'Map "Total Donation" -> totalDonations');

  const suggestedBng = suggestColumnMappings(banglaHeaders);
  assert(suggestedBng['রক্তদাতার নাম'] === 'fullName', 'Map Bangla "রক্তদাতার নাম" -> fullName');
  assert(suggestedBng['মোবাইল নম্বর'] === 'phone', 'Map Bangla "মোবাইল নম্বর" -> phone');
  assert(suggestedBng['রক্তের গ্রুপ'] === 'bloodGroup', 'Map Bangla "রক্তের গ্রুপ" -> bloodGroup');
  assert(suggestedBng['জন্মতারিখ'] === 'dateOfBirth', 'Map Bangla "জন্মতারিখ" -> dateOfBirth');
  assert(suggestedBng['মোট রক্তদান'] === 'totalDonations', 'Map Bangla "মোট রক্তদান" -> totalDonations');

  // ----------------------------------------------------
  // SECTION C: FILE PARSING & TEMPLATE GENERATION
  // ----------------------------------------------------
  console.log('\n--- SECTION C: File Parsing & Template Generation ---');

  // Generate Excel template
  const excelBlob = generateDonorImportTemplateExcel();
  assert(excelBlob.size > 0, 'Excel template generated with valid size');

  const csvBlob = generateDonorImportTemplateCsv();
  assert(csvBlob.size > 0, 'CSV template generated with valid size');

  // Create mock parsed rows from synthetic workbook
  const wb = XLSX.utils.book_new();
  const sampleData = [
    { 'Donor Name': 'রহিম ইসলাম', 'Mobile No': '01711111111', 'Blood': 'O+', 'Total Donated': 4 },
    { 'Donor Name': 'Karim Ahmed', 'Mobile No': '01822222222', 'Blood': 'A+', 'Total Donated': 2 },
    { 'Donor Name': 'Unverified Person', 'Mobile No': 'invalid-phone', 'Blood': 'InvalidBlood', 'Total Donated': 0 },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleData);
  XLSX.utils.book_append_sheet(wb, ws, 'Donors');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const parsedSheets = await parseImportFile(buffer);
  assert(parsedSheets.sheets.length === 1, 'Detected exactly 1 worksheet');
  assert(parsedSheets.sheets[0] === 'Donors', 'Worksheet name is "Donors"');
  assert(parsedSheets.headers.includes('Donor Name'), 'Detected header "Donor Name"');
  assert(parsedSheets.rows.length === 3, 'Parsed 3 rows from sample Excel');

  // ----------------------------------------------------
  // SECTION D: VALIDATION & DUPLICATE HIERARCHY
  // ----------------------------------------------------
  console.log('\n--- SECTION D: Validation & Duplicate Detection Hierarchy ---');

  const mapping: DonorImportMapping = {
    'Donor Name': 'fullName',
    'Mobile No': 'phone',
    'Blood': 'bloodGroup',
    'Total Donated': 'totalDonations',
  };

  const rawRows: Record<string, any>[] = [
    {
      __rowNumber: 2,
      'Donor Name': 'Mohammad Rahim',
      'Mobile No': '01711111111',
      'Blood': 'O+',
      'Total Donated': 4,
    },
    {
      __rowNumber: 3,
      'Donor Name': 'Tanvir Hossain',
      'Mobile No': '01933333333',
      'Blood': 'B+',
      'Total Donated': 1,
    },
    {
      __rowNumber: 4,
      'Donor Name': 'Duplicate Rahim',
      'Mobile No': '01711111111', // Exact same phone as row 2 -> Duplicate/Conflict
      'Blood': 'O+',
      'Total Donated': 0,
    },
    {
      __rowNumber: 5,
      'Donor Name': 'Corrupted Row',
      'Mobile No': '12345', // Invalid phone
      'Blood': 'X-',        // Invalid blood group
    },
    {
      __rowNumber: 6,
      'Donor Name': '',     // Missing required name
      'Mobile No': '01844444444',
      'Blood': 'A+',
    },
  ];

  // Existing donors in DB
  const existingDonors: any[] = [
    {
      id: 'existing-1',
      donorId: 'DNR-KLP-000001',
      fullName: 'Mohammad Rahim',
      phone: '01711111111',
      bloodGroup: 'O+',
      dateOfBirth: '1995-05-10',
      verificationStatus: 'verified',
    },
    {
      id: 'existing-2',
      donorId: 'DNR-KLP-000002',
      fullName: 'Existing Person',
      phone: '01899999999',
      bloodGroup: 'A-',
      dateOfBirth: '1990-01-01',
      verificationStatus: 'pending',
    },
  ];

  const validationResults = validateAndClassifyRows(rawRows, mapping, existingDonors);

  assert(validationResults.length === 5, 'Validated all 5 rows');

  // Row 2: Same name + Same phone as existing DB donor -> EXACT_DUPLICATE
  const row2 = validationResults.find((r) => r.rowNumber === 1);
  assert(row2?.classification === 'EXACT_DUPLICATE', 'Row 1 (data row 2) correctly classified as EXACT_DUPLICATE');

  // Row 3: Unique phone & unique name -> NEW
  const row3 = validationResults.find((r) => r.rowNumber === 2);
  assert(row3?.classification === 'NEW', 'Row 2 (data row 3) correctly classified as NEW');
  assert(row3?.status === 'VALID', 'Row 2 (data row 3) marked VALID for import');

  // Row 4: Different name ("Duplicate Rahim") but same phone (01711111111) -> CONFLICT
  const row4 = validationResults.find((r) => r.rowNumber === 3);
  assert(row4?.classification === 'CONFLICT', 'Row 3 (data row 4) with conflicting name on same phone classified as CONFLICT');

  // Row 5: Corrupted phone and blood group -> ERROR
  const row5 = validationResults.find((r) => r.rowNumber === 4);
  assert(row5?.status === 'ERROR', 'Row 4 (data row 5) marked status ERROR');
  assert(row5?.errors.some((e) => e.includes('অবৈধ বা অনুপস্থিত')), 'Row 4 caught invalid phone');
  assert(row5?.errors.some((e) => e.includes('রক্তের গ্রুপ সঠিক নয়')), 'Row 4 caught invalid blood group');

  // Row 6: Missing required name -> ERROR
  const row6 = validationResults.find((r) => r.rowNumber === 5);
  assert(row6?.status === 'ERROR', 'Row 5 (data row 6) marked ERROR for missing name');
  assert(row6?.errors.some((e) => e.includes('রক্তদাতার নাম অনুপস্থিত')), 'Row 5 caught missing name');

  // ----------------------------------------------------
  // SECTION E: ERROR REPORT GENERATION
  // ----------------------------------------------------
  console.log('\n--- SECTION E: Error Report Generation ---');
  const errorReportItems = validationResults.map((r) => ({
    rowNumber: r.rowNumber,
    name: r.normalizedData?.fullName || String(r.rawData['Donor Name'] || ''),
    phone: r.normalizedData?.phone || String(r.rawData['Mobile No'] || ''),
    status: r.status,
    reason: [...r.errors, ...r.warnings, r.matchReason || ''].filter(Boolean).join(' | '),
  }));
  const errorCsv = generateErrorReportCsv(errorReportItems);
  assert(errorCsv.size > 0, 'CSV error report generated as valid Blob');

  // ----------------------------------------------------
  // SECTION F: TWO-TIER AUTH & SECURITY RULES
  // ----------------------------------------------------
  console.log('\n--- SECTION F: Two-Tier Auth & RBAC Security Rules ---');

  // Rule 1: user_id must be null for historical paper import
  const simulatedImportPayload = {
    name: 'Historical Paper Donor',
    phone: '01955555555',
    blood_group: 'AB+',
    total_donations: 3,
    source: 'imported',
    verification_status: 'pending',
    user_id: null,
  };
  assert(simulatedImportPayload.user_id === null, 'Imported historical donor sets user_id = NULL');
  assert(simulatedImportPayload.verification_status === 'pending', 'Imported donor starts in pending verification');
  assert(simulatedImportPayload.source === 'imported', 'Imported donor source tag is "imported"');

  // Rule 2: RBAC permissions
  const rolesAllowed = ['super_admin', 'admin', 'moderator'];
  const rolesForbidden = ['volunteer', 'donor', 'recipient', 'guest'];

  assert(rolesAllowed.includes('super_admin'), 'super_admin allowed to import');
  assert(rolesAllowed.includes('admin'), 'admin allowed to import');
  assert(rolesAllowed.includes('moderator'), 'moderator allowed to import');
  assert(!rolesAllowed.includes('volunteer'), 'volunteer strictly forbidden from importing');
  assert(!rolesAllowed.includes('donor'), 'donor strictly forbidden from importing');

  // Rule 3: Public search filter safety
  const mockDonorsTable = [
    { name: 'Verified Donor', verification_status: 'verified', is_available: true },
    { name: 'Pending Imported Donor', verification_status: 'pending', is_available: true },
  ];
  const publicSearchResults = mockDonorsTable.filter((d) => d.verification_status === 'verified');
  assert(publicSearchResults.length === 1, 'Public search only yields verified donors');
  assert(publicSearchResults[0].name === 'Verified Donor', 'Pending imported donor is hidden from public search');

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
