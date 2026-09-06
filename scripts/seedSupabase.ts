import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  generateSeedDonors,
  generateSeedRequests,
  generateSeedDonations,
  INITIAL_DEMO_USERS,
  INITIAL_PAYMENT_METHODS,
  INITIAL_DONATION_CAUSES,
  INITIAL_FUND_DONATIONS,
  INITIAL_FUND_DISBURSEMENTS,
  INITIAL_BLOOD_CAMPS,
} from '../src/data/seedData';
import { HOSPITALS_DATA } from '../src/data/hospitalsData';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing in .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedDatabase() {
  console.log('🚀 Starting RoktoBondhon Supabase Database Seed...');
  console.log(`Connected to: ${supabaseUrl}`);

  try {
    // 1. Seed Users
    console.log('📦 Seeding initial demo users...');
    for (const u of INITIAL_DEMO_USERS) {
      await supabase.from('users').upsert({
        id: u.id,
        full_name: u.fullName,
        phone: u.phone,
        email: u.email || null,
        role: u.role,
        organization_id: u.organizationId,
        branch_id: u.branchId || null,
        photo_url: u.photoUrl || null,
        status: u.status || 'active',
        phone_verified: u.phoneVerified || false,
      });
    }

    // 2. Seed Donors
    console.log('📦 Seeding donors...');
    const donors = generateSeedDonors();
    for (const d of donors) {
      await supabase.from('donors').upsert({
        id: d.id,
        donor_id: d.donorId,
        user_id: d.userId || d.id,
        full_name: d.fullName,
        photo_url: d.photoUrl || null,
        blood_group: d.bloodGroup,
        division: d.division || 'Dhaka',
        district_id: d.districtId || 'dist-dhaka',
        district: d.district,
        upazila_id: d.upazilaId || 'upa-dhamrai',
        upazila: d.upazila,
        area_id: d.areaId || null,
        area: d.area,
        location_label: d.locationLabel || null,
        availability: d.availability,
        emergency_available: d.emergencyAvailable,
        last_donation_date: d.lastDonationDate || null,
        first_donation_date: d.firstDonationDate || null,
        total_donations: d.totalDonations || 0,
        verification_status: d.verificationStatus,
        organization_id: d.organizationId || 'org-roktobondon',
        branch_id: d.branchId || 'br-dhm',
        phone: d.phone,
        email: d.email || null,
        gender: d.gender || null,
        date_of_birth: d.dateOfBirth || null,
        exact_address: d.exactAddress || null,
        emergency_contact: d.emergencyContact || null,
        admin_notes: d.adminNotes || null,
        nid_or_id_number: d.nidOrIdNumber || null,
        privacy: d.privacy,
      });
    }

    // 3. Seed Blood Requests
    console.log('📦 Seeding blood requests...');
    const requests = generateSeedRequests();
    for (const req of requests) {
      await supabase.from('blood_requests').upsert({
        id: req.id,
        request_id: req.requestId,
        user_id: req.userId,
        patient_name: req.patientName,
        blood_group: req.bloodGroup,
        required_units: req.requiredUnits,
        required_date: req.requiredDate,
        required_time: req.requiredTime,
        hospital: req.hospital,
        division: req.division,
        district: req.district,
        upazila: req.upazila,
        area: req.area,
        contact_person: req.contactPerson,
        contact_number: req.contactNumber,
        relationship: req.relationship,
        emergency_level: req.emergencyLevel,
        notes: req.notes || null,
        status: req.status,
        is_verified: req.verification.isVerified,
        verified_by: req.verification.verifiedBy || null,
        verified_at: req.verification.verifiedAt || null,
        organization_id: req.organizationId || 'org-roktobondon',
        expires_at: req.expiresAt || null,
        created_at: req.createdAt,
      });
    }

    // 4. Seed Donations
    console.log('📦 Seeding donations history...');
    const donations = generateSeedDonations(donors, requests);
    for (const don of donations) {
      await supabase.from('donations').upsert({
        id: don.id,
        donor_id: don.donorId,
        donor_user_id: don.donorUserId,
        donor_name: don.donorName,
        blood_group: don.bloodGroup,
        request_id: don.requestId || null,
        donation_date: don.donationDate,
        hospital: don.hospital,
        units: don.units,
        donation_type: don.donationType,
        verified_by: don.verifiedBy,
        verification_date: don.verificationDate,
        notes: don.notes || null,
      });
    }

    // 5. Seed Hospitals
    console.log('📦 Seeding hospitals directory...');
    for (const hosp of HOSPITALS_DATA) {
      await supabase.from('hospitals').upsert({
        id: hosp.id,
        name_bn: hosp.nameBn,
        name_en: hosp.nameEn,
        category: hosp.category,
        district: hosp.district,
        upazila: hosp.upazila,
        address: hosp.address,
        hotline: hosp.hotline,
        emergency_phone: hosp.emergencyPhone || null,
        ambulance_phone: hosp.ambulancePhone || null,
        has_blood_bank: hosp.hasBloodBank,
        has_icu: hosp.hasICU,
        is_open_24_hours: hosp.isOpen24Hours,
        map_url: hosp.mapUrl || null,
        notes: hosp.notes || null,
        is_community_added: hosp.isCommunityAdded || false,
        verification_status: hosp.verificationStatus || 'verified',
      });
    }

    // 6. Seed Payment Methods
    console.log('📦 Seeding payment methods...');
    for (const pay of INITIAL_PAYMENT_METHODS) {
      await supabase.from('payment_methods').upsert({
        id: pay.id,
        name: pay.name,
        name_bn: pay.nameBn,
        type: pay.type,
        account_number: pay.accountNumber,
        account_type: pay.accountType,
        instructions_bn: pay.instructionsBn,
        qr_code_url: pay.qrCodeUrl || null,
        is_active: pay.isActive,
      });
    }

    // 7. Seed Blood Camps
    console.log('📦 Seeding blood camps...');
    for (const camp of INITIAL_BLOOD_CAMPS) {
      await supabase.from('blood_camps').upsert({
        id: camp.id,
        title_bn: camp.titleBn,
        title_en: camp.titleEn,
        organizer_name: camp.organizerName,
        partner_hospital: camp.partnerHospital || null,
        division: camp.division,
        district: camp.district,
        upazila: camp.upazila,
        venue_address: camp.venueAddress,
        start_date: camp.startDate,
        end_date: camp.endDate,
        start_time: camp.startTime,
        end_time: camp.endTime,
        target_units: camp.targetUnits,
        collected_units: camp.collectedUnits || 0,
        contact_person: camp.contactPerson || null,
        contact_phone: camp.contactPhone || null,
        banner_url: camp.bannerUrl || null,
        description_bn: camp.descriptionBn,
        status: camp.status,
        registered_count: camp.registeredCount,
        map_url: camp.mapUrl || null,
      });
    }

    console.log('✅ Supabase Database Seeded Successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();
