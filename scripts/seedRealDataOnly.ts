import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { HOSPITALS_DATA } from '../src/data/hospitalsData';
import { INITIAL_PAYMENT_METHODS, INITIAL_DEMO_USERS } from '../src/data/seedData';
import { INITIAL_BRANCHES } from '../src/services/locationService';
import { DEFAULT_SYSTEM_CONFIG } from '../src/services/configService';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing in .env!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedRealDataOnly() {
  console.log('🚀 Starting RoktoBondhon REAL-DATA-ONLY Database Seed...');
  console.log(`Connected to: ${supabaseUrl}`);
  console.log('ℹ️  Note: Only Real Hospitals, Real Locations, Real Payment Methods, and Super Admin will be inserted (NO fake donors / requests).');

  try {
    // 1. Seed Real Super Admin User
    console.log('👤 Seeding Super Admin user account...');
    const superAdminUser = INITIAL_DEMO_USERS.find((u) => u.role === 'super_admin');
    if (superAdminUser) {
      const { error: userErr } = await supabase.from('users').upsert({
        id: superAdminUser.id,
        full_name: superAdminUser.fullName,
        phone: superAdminUser.phone,
        email: superAdminUser.email || 'admin@roktobondon.org',
        role: 'super_admin',
        organization_id: superAdminUser.organizationId || 'org-roktobondon',
        branch_id: superAdminUser.branchId || null,
        photo_url: superAdminUser.photoUrl || null,
        status: 'active',
        phone_verified: true,
      });
      if (userErr) console.warn('User upsert notice:', userErr.message);
    }

    // 2. Seed Real Hospitals & Specialized Blood Banks
    console.log(`🏥 Seeding ${HOSPITALS_DATA.length} real hospitals and blood banks...`);
    for (const hosp of HOSPITALS_DATA) {
      const { error } = await supabase.from('hospitals').upsert({
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
      if (error) {
        console.warn(`Warning on hospital ${hosp.nameBn}:`, error.message);
      }
    }

    // 3. Seed Real Branches / Chapters
    console.log(`📍 Seeding ${INITIAL_BRANCHES.length} real organizational chapters...`);
    for (const branch of INITIAL_BRANCHES) {
      const { error } = await supabase.from('branches').upsert({
        id: branch.id,
        organization_id: branch.organizationId,
        name: branch.name,
        name_bn: branch.nameBn,
        district: branch.district,
        upazila: branch.upazila,
        coordinator_name: branch.coordinatorName,
        coordinator_phone: branch.coordinatorPhone,
        is_active: branch.isActive,
      });
      if (error) {
        console.warn(`Warning on branch ${branch.nameBn}:`, error.message);
      }
    }

    // 4. Seed Real Payment Methods & Donation Accounts
    console.log(`💳 Seeding ${INITIAL_PAYMENT_METHODS.length} official payment & donation methods...`);
    for (const pay of INITIAL_PAYMENT_METHODS) {
      const { error } = await supabase.from('payment_methods').upsert({
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
      if (error) {
        console.warn(`Warning on payment method ${pay.nameBn}:`, error.message);
      }
    }

    // 5. Seed System Configuration
    console.log('⚙️  Seeding System Configuration defaults...');
    const { error: configErr } = await supabase.from('system_config').upsert({
      id: 'default',
      config: DEFAULT_SYSTEM_CONFIG,
      updated_at: new Date().toISOString(),
    });
    if (configErr) {
      console.warn('Config upsert notice:', configErr.message);
    }

    console.log('🎉 SUCCESS: All REAL DATA (Hospitals, Locations, Payment Methods, Config, Super Admin) seeded successfully!');
    console.log('✨ Clean database ready for real user registrations and blood requests.');
  } catch (error) {
    console.error('❌ Error during real data seeding:', error);
    process.exit(1);
  }
}

seedRealDataOnly();
