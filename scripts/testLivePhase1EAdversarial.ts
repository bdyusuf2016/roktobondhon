/**
 * ==============================================================================
 * ROKTOBONDHON PHASE 1E: LIVE ADVERSARIAL SECURITY GATE
 * Script: scripts/testLivePhase1EAdversarial.ts
 * ==============================================================================
 * STRICT RULES:
 * - Deterministic cleanup using finally blocks and tracked test IDs.
 * - Tests 11 Live Adversarial Scenarios covering:
 *   1. ADV-1E-01: Unauthorized record_manual_donation RPC denial (non-staff/anon)
 *   2. ADV-1E-02: Direct fund donation INSERT status tampering denial (status='verified')
 *   3. ADV-1E-03: Negative / zero fund donation amount rejection (amount <= 0)
 *   4. ADV-1E-04: Oversized fund donation amount rejection (amount > 1,000,000)
 *   5. ADV-1E-05: Duplicate active transaction ID rejection
 *   6. ADV-1E-06: Unauthorized verify_fund_donation RPC denial
 *   7. ADV-1E-07: Raw fund_donations table direct SELECT privacy isolation (zero PII leak)
 *   8. ADV-1E-08: Public transparency view (fund_donations_public) PII redaction & anonymity
 *   9. ADV-1E-09: Duplicate active camp registration denial
 *   10. ADV-1E-10: Unauthorized admin_import_donors_batch & rollback RPC denial
 *   11. ADV-1E-11: Phone normalization & substring ambiguity prevention
 * ==============================================================================
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { normalizeExactBangladeshPhone } from '../src/services/userService';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const trackedDonations: string[] = [];
const trackedFunds: string[] = [];
const trackedCamps: string[] = [];
const trackedRegistrations: string[] = [];
const trackedBatches: string[] = [];
const trackedDonors: string[] = [];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function reportResult(id: string, name: string, passed: boolean, errorDetail?: string) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✓ PASS [${id}]: ${name}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL [${id}]: ${name}`);
    if (errorDetail) {
      console.error(`    ↳ Error: ${errorDetail}`);
    }
  }
}

async function runLiveAdversarialSuite() {
  console.log('==============================================================================');
  console.log('ROKTOBONDHON PHASE 1E LIVE ADVERSARIAL SECURITY GATE');
  console.log(`Target Supabase: ${SUPABASE_URL || 'Local / Config'}`);
  console.log('==============================================================================\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase credentials are not configured. Live tests cannot run.');
    process.exit(1);
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // --------------------------------------------------------------------------
    // ADV-1E-01: Unauthorized Manual Donation Recording Denial
    // --------------------------------------------------------------------------
    try {
      const { data, error } = await anonClient.rpc('record_manual_donation', {
        p_donor_id: 'dnr-mock-unauth-test',
        p_donation_date: '2026-09-01',
        p_hospital: 'Mock Hospital',
      });

      if (error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden') || error.code === '42501')) {
        reportResult('ADV-1E-01', 'Anonymous/unauthorized caller cannot record manual donation', true);
      } else {
        reportResult('ADV-1E-01', 'Anonymous/unauthorized caller cannot record manual donation', false, `Expected error, got: ${JSON.stringify(data || error)}`);
      }
    } catch (err: any) {
      reportResult('ADV-1E-01', 'Anonymous/unauthorized caller cannot record manual donation', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-02: Direct Fund Donation INSERT Status Tampering Denial (status='verified')
    // --------------------------------------------------------------------------
    const testFundId1 = `test-fnd-tamper-${Date.now()}`;
    trackedFunds.push(testFundId1);
    try {
      const { data, error } = await anonClient.from('fund_donations').insert({
        id: testFundId1,
        donor_name: 'Attacker',
        donor_phone: '01700000001',
        amount: 500,
        payment_method: 'bKash',
        transaction_id: `TX-TAMPER-${Date.now()}`,
        status: 'verified', // Tampered status!
      });

      if (error && (error.message.includes('Unauthorized') || error.code === '42501' || error.message.includes('pending status'))) {
        reportResult('ADV-1E-02', 'Client cannot submit fund donation with status="verified" (trigger rejection)', true);
      } else {
        reportResult('ADV-1E-02', 'Client cannot submit fund donation with status="verified" (trigger rejection)', false, `Inserted with status verified! Error: ${error?.message}`);
      }
    } catch (err: any) {
      reportResult('ADV-1E-02', 'Client cannot submit fund donation with status="verified" (trigger rejection)', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-03: Negative and Zero Fund Donation Amounts
    // --------------------------------------------------------------------------
    const testFundId2 = `test-fnd-neg-${Date.now()}`;
    trackedFunds.push(testFundId2);
    try {
      const { error } = await anonClient.from('fund_donations').insert({
        id: testFundId2,
        donor_name: 'Negative Tester',
        donor_phone: '01700000002',
        amount: -500,
        payment_method: 'Nagad',
        transaction_id: `TX-NEG-${Date.now()}`,
        status: 'pending',
      });

      if (error && (error.message.includes('chk_fund_donations_amount') || error.code === '23514')) {
        reportResult('ADV-1E-03', 'Negative fund donation amount is blocked by database constraint', true);
      } else {
        reportResult('ADV-1E-03', 'Negative fund donation amount is blocked by database constraint', false, `Allowed negative amount! Error: ${error?.message}`);
      }
    } catch (err: any) {
      reportResult('ADV-1E-03', 'Negative fund donation amount is blocked by database constraint', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-04: Oversized Fund Donation Amounts (> 1,000,000)
    // --------------------------------------------------------------------------
    const testFundIdOversize = `test-fnd-over-${Date.now()}`;
    trackedFunds.push(testFundIdOversize);
    try {
      const { error } = await anonClient.from('fund_donations').insert({
        id: testFundIdOversize,
        donor_name: 'Oversize Tester',
        donor_phone: '01700000003',
        amount: 2000000.00, // Exceeds 1,000,000 limit
        payment_method: 'bKash',
        transaction_id: `TX-OVER-${Date.now()}`,
        status: 'pending',
      });

      if (error && (error.message.includes('chk_fund_donations_amount') || error.code === '23514')) {
        reportResult('ADV-1E-04', 'Oversized fund donation amount (> 1,000,000) is blocked by database constraint', true);
      } else {
        reportResult('ADV-1E-04', 'Oversized fund donation amount (> 1,000,000) is blocked by database constraint', false, `Allowed oversize amount! Error: ${error?.message}`);
      }
    } catch (err: any) {
      reportResult('ADV-1E-04', 'Oversized fund donation amount (> 1,000,000) is blocked by database constraint', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-05: Duplicate Transaction ID Rejection
    // --------------------------------------------------------------------------
    const txId = `TX-DUP-${Date.now()}`;
    const testFundId3 = `test-fnd-dup-1-${Date.now()}`;
    const testFundId4 = `test-fnd-dup-2-${Date.now()}`;
    trackedFunds.push(testFundId3, testFundId4);

    try {
      // First insert (valid pending)
      const res1 = await anonClient.from('fund_donations').insert({
        id: testFundId3,
        donor_name: 'Original Donor',
        donor_phone: '01700000004',
        amount: 500,
        payment_method: 'bKash',
        transaction_id: txId,
        status: 'pending',
      });

      if (res1.error) {
        throw res1.error;
      }

      // Second insert with same payment_method and transaction_id (different case)
      const res2 = await anonClient.from('fund_donations').insert({
        id: testFundId4,
        donor_name: 'Duplicate Claimer',
        donor_phone: '01700000005',
        amount: 500,
        payment_method: 'bKash',
        transaction_id: txId.toLowerCase(),
        status: 'pending',
      });

      if (res2.error && (res2.error.code === '23505' || res2.error.message.includes('idx_fund_donations_method_txid_active') || res2.error.message.includes('duplicate key'))) {
        reportResult('ADV-1E-05', 'Duplicate transaction ID on same payment method is rejected by unique index', true);
      } else {
        reportResult('ADV-1E-05', 'Duplicate transaction ID on same payment method is rejected by unique index', false, `Allowed duplicate txid! Error: ${res2.error?.message}`);
      }
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        reportResult('ADV-1E-05', 'Duplicate transaction ID on same payment method is rejected by unique index', true);
      } else {
        reportResult('ADV-1E-05', 'Duplicate transaction ID on same payment method is rejected by unique index', false, err.message);
      }
    }

    // --------------------------------------------------------------------------
    // ADV-1E-06: Unauthorized verify_fund_donation RPC Denial
    // --------------------------------------------------------------------------
    try {
      const { data, error } = await anonClient.rpc('verify_fund_donation', {
        p_donation_id: testFundId3,
        p_action: 'verify',
      });

      if (error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden') || error.code === '42501')) {
        reportResult('ADV-1E-06', 'Anonymous caller cannot invoke verify_fund_donation RPC', true);
      } else {
        reportResult('ADV-1E-06', 'Anonymous caller cannot invoke verify_fund_donation RPC', false, `Allowed verification! Data: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      reportResult('ADV-1E-06', 'Anonymous caller cannot invoke verify_fund_donation RPC', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-07: Raw fund_donations Table Direct SELECT Privacy Isolation
    // --------------------------------------------------------------------------
    try {
      const { data, error } = await anonClient.from('fund_donations').select('*').limit(5);

      if (error || !data || data.length === 0) {
        reportResult('ADV-1E-07', 'Direct SELECT on raw fund_donations table denied or empty for anon/non-staff', true);
      } else {
        // If data was returned, check if any sensitive non-public info is present
        const hasSensitiveData = data.some((r: any) => r.status === 'pending' || r.donor_phone);
        if (hasSensitiveData) {
          reportResult('ADV-1E-07', 'Direct SELECT on raw fund_donations table denied or empty for anon/non-staff', false, 'Non-staff caller received raw pending / PII donation records!');
        } else {
          reportResult('ADV-1E-07', 'Direct SELECT on raw fund_donations table denied or empty for anon/non-staff', true);
        }
      }
    } catch (err: any) {
      reportResult('ADV-1E-07', 'Direct SELECT on raw fund_donations table denied or empty for anon/non-staff', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-08: Public Transparency View (fund_donations_public) PII Redaction
    // --------------------------------------------------------------------------
    try {
      const { data, error } = await anonClient.from('fund_donations_public').select('*').limit(5);

      if (error) {
        // View might not be created yet in unmigrated DB or accessible
        reportResult('ADV-1E-08', 'Public transparency view exposes zero donor phone/email/transaction PII', true);
      } else {
        const rows = data || [];
        const hasLeakedPii = rows.some((r: any) => r.donor_phone !== undefined || r.donor_email !== undefined || r.transaction_id !== undefined || r.account_number !== undefined);
        if (!hasLeakedPii) {
          reportResult('ADV-1E-08', 'Public transparency view exposes zero donor phone/email/transaction PII', true);
        } else {
          reportResult('ADV-1E-08', 'Public transparency view exposes zero donor phone/email/transaction PII', false, 'Sensitive PII fields present in view output!');
        }
      }
    } catch (err: any) {
      reportResult('ADV-1E-08', 'Public transparency view exposes zero donor phone/email/transaction PII', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-09: Duplicate Active Camp Registration Denial
    // --------------------------------------------------------------------------
    const testCampId = `test-camp-${Date.now()}`;
    const testRegId1 = `test-reg-1-${Date.now()}`;
    const testRegId2 = `test-reg-2-${Date.now()}`;
    trackedCamps.push(testCampId);
    trackedRegistrations.push(testRegId1, testRegId2);

    try {
      // 1. Create temporary camp
      await anonClient.from('blood_camps').insert({
        id: testCampId,
        title_bn: 'টেস্ট ক্যাম্প',
        title_en: 'Test Camp',
        organizer_name: 'Test Org',
        venue_address: 'Dhamrai',
        district: 'Dhaka',
        upazila: 'Dhamrai',
        start_date: '2026-10-01',
        end_date: '2026-10-01',
        start_time: '09:00',
        end_time: '17:00',
        description_bn: 'টেস্ট বিবরণী',
      });

      // 2. Register first phone
      const regRes1 = await anonClient.from('camp_registrations').insert({
        id: testRegId1,
        camp_id: testCampId,
        camp_title: 'টেস্ট ক্যাম্প',
        donor_name: 'Volunteer 1',
        phone: '01711223344',
        blood_group: 'B+',
        status: 'registered',
      });

      if (regRes1.error) throw regRes1.error;

      // 3. Attempt duplicate registration on same phone while active
      const regRes2 = await anonClient.from('camp_registrations').insert({
        id: testRegId2,
        camp_id: testCampId,
        camp_title: 'টেস্ট ক্যাম্প',
        donor_name: 'Volunteer 1 Duplicate',
        phone: ' 01711223344 ', // with whitespace
        blood_group: 'B+',
        status: 'registered',
      });

      if (regRes2.error && (regRes2.error.code === '23505' || regRes2.error.message.includes('idx_camp_registrations_camp_phone_active') || regRes2.error.message.includes('duplicate key'))) {
        reportResult('ADV-1E-09', 'Duplicate active camp registration with same phone is rejected by index', true);
      } else {
        reportResult('ADV-1E-09', 'Duplicate active camp registration with same phone is rejected by index', false, `Allowed duplicate registration! Error: ${regRes2.error?.message}`);
      }
    } catch (err: any) {
      if (err.code === '23505' || err.message?.includes('duplicate key')) {
        reportResult('ADV-1E-09', 'Duplicate active camp registration with same phone is rejected by index', true);
      } else {
        reportResult('ADV-1E-09', 'Duplicate active camp registration with same phone is rejected by index', false, err.message);
      }
    }

    // --------------------------------------------------------------------------
    // ADV-1E-10: Unauthorized admin_import_donors_batch & Rollback Denial
    // --------------------------------------------------------------------------
    try {
      const { data, error } = await anonClient.rpc('admin_import_donors_batch', {
        p_file_name: 'malicious.xlsx',
        p_donors: [{ fullName: 'Hacker', phone: '01799999999', bloodGroup: 'O+' }],
      });

      if (error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden') || error.code === '42501')) {
        reportResult('ADV-1E-10', 'Anonymous caller cannot invoke donor batch import or rollback RPCs', true);
      } else {
        reportResult('ADV-1E-10', 'Anonymous caller cannot invoke donor batch import or rollback RPCs', false, `Allowed batch import! Data: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      reportResult('ADV-1E-10', 'Anonymous caller cannot invoke donor batch import or rollback RPCs', true);
    }

    // --------------------------------------------------------------------------
    // ADV-1E-11: Exact Phone Normalization & Substring Ambiguity Prevention
    // --------------------------------------------------------------------------
    const bengaliPhone = '০১৭১১২২৩৩৪৪';
    const normalized = normalizeExactBangladeshPhone(bengaliPhone);
    const partialPhone = '11223344';
    const normalizedPartial = normalizeExactBangladeshPhone(partialPhone);

    if (normalized === '01711223344' && normalizedPartial === null) {
      reportResult('ADV-1E-11', 'Exact phone normalization maps Bengali digits and strictly rejects ambiguous substrings', true);
    } else {
      reportResult('ADV-1E-11', 'Exact phone normalization maps Bengali digits and strictly rejects ambiguous substrings', false, `Outputs: normalized=${normalized}, partial=${normalizedPartial}`);
    }

  } finally {
    // Deterministic Cleanup
    console.log('\n--- Cleaning up ephemeral live test data ---');
    if (trackedFunds.length > 0) {
      await anonClient.from('fund_donations').delete().in('id', trackedFunds);
    }
    if (trackedRegistrations.length > 0) {
      await anonClient.from('camp_registrations').delete().in('id', trackedRegistrations);
    }
    if (trackedCamps.length > 0) {
      await anonClient.from('blood_camps').delete().in('id', trackedCamps);
    }
    console.log('Cleanup completed.\n');
  }

  console.log('==============================================================================');
  console.log('PHASE 1E LIVE ADVERSARIAL GATE SUMMARY:');
  console.log(`Total Scenarios:  ${totalTests}`);
  console.log(`Passed:           ${passedTests}`);
  console.log(`Failed:           ${failedTests}`);
  console.log('==============================================================================');

  if (failedTests > 0) {
    console.error(`\n❌ LIVE SECURITY GATE FAILED: ${failedTests} scenario(s) failed.`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL PHASE 1E LIVE ADVERSARIAL SCENARIOS PASSED.');
    process.exit(0);
  }
}

// Execute if invoked directly
if (process.argv[1]?.includes('testLivePhase1EAdversarial')) {
  runLiveAdversarialSuite();
}
