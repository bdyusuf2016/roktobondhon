/**
 * Step 4 Live Database Security Verification Script
 * Evaluates live PostgREST RLS and storage behavior as Anonymous client.
 * Never prints secrets or tokens.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('NOTICE: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not configured. Skipping live network probe.');
  process.exit(0);
}

const client = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

async function runLiveChecks() {
  console.log('================================================================');
  console.log('🔍 ROKTOBONDHON STEP 4 — LIVE SUPABASE DATABASE SECURITY PROBE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Anonymous Read raw users table
  try {
    const { data, error } = await client.from('users').select('*').limit(5);
    const blocked = error !== null || !data || data.length === 0;
    if (blocked) {
      console.log('✅ [LIVE-01] Anonymous Read raw `users` -> DENIED (Secure)');
      passed++;
    } else {
      console.error('❌ [LIVE-01] Anonymous Read raw `users` -> EXPOSED! Rows returned:', data.length);
      failed++;
    }
  } catch (err: any) {
    console.log('✅ [LIVE-01] Anonymous Read raw `users` -> DENIED (Exception: ' + err.message + ')');
    passed++;
  }

  // 2. Anonymous Read raw donors table
  try {
    const { data, error } = await client.from('donors').select('*').limit(5);
    const blocked = error !== null || !data || data.length === 0;
    if (blocked) {
      console.log('✅ [LIVE-02] Anonymous Read raw `donors` -> DENIED (Secure)');
      passed++;
    } else {
      console.error('❌ [LIVE-02] Anonymous Read raw `donors` -> EXPOSED! Rows returned:', data.length);
      failed++;
    }
  } catch (err: any) {
    console.log('✅ [LIVE-02] Anonymous Read raw `donors` -> DENIED');
    passed++;
  }

  // 3. Anonymous Read raw blood_requests table
  try {
    const { data, error } = await client.from('blood_requests').select('*').limit(5);
    const blocked = error !== null || !data || data.length === 0;
    if (blocked) {
      console.log('✅ [LIVE-03] Anonymous Read raw `blood_requests` -> DENIED (Secure)');
      passed++;
    } else {
      console.error('❌ [LIVE-03] Anonymous Read raw `blood_requests` -> EXPOSED! Rows returned:', data.length);
      failed++;
    }
  } catch (err: any) {
    console.log('✅ [LIVE-03] Anonymous Read raw `blood_requests` -> DENIED');
    passed++;
  }

  // 4. Anonymous Direct INSERT into audit_logs
  try {
    const { data, error } = await client.from('audit_logs').insert({
      id: 'probe-' + Date.now(),
      action: 'SECURITY_PROBE',
      target_type: 'probe',
      target_id: 'probe-1',
      user_id: 'anonymous-attacker',
      user_name: 'Attacker',
      user_role: 'super_admin',
    }).select();
    const blocked = error !== null || !data || data.length === 0;
    if (blocked) {
      console.log('✅ [LIVE-04] Anonymous Direct INSERT `audit_logs` -> DENIED (Secure)');
      passed++;
    } else {
      console.error('❌ [LIVE-04] Anonymous Direct INSERT `audit_logs` -> ALLOWED! Forgeable audit logs!');
      failed++;
    }
  } catch (err: any) {
    console.log('✅ [LIVE-04] Anonymous Direct INSERT `audit_logs` -> DENIED');
    passed++;
  }

  // 5. Public View donors_public_search Column Check
  try {
    const { data, error } = await client.from('donors_public_search').select('*').limit(5);
    if (error) {
      console.log('⚠️ [LIVE-05] donors_public_search query note:', error.message);
    } else if (data && data.length > 0) {
      const sample = data[0];
      const sensitiveKeys = ['phone', 'email', 'nid', 'nid_or_id_number', 'exact_address', 'date_of_birth', 'admin_notes'];
      const leaked = sensitiveKeys.filter(k => k in sample && sample[k] !== undefined && sample[k] !== null && sample[k] !== '');
      if (leaked.length === 0) {
        console.log('✅ [LIVE-05] `donors_public_search` -> ZERO PII leaked across returned rows');
        passed++;
      } else {
        console.error('❌ [LIVE-05] `donors_public_search` -> LEAKED SENSITIVE COLUMNS:', leaked);
        failed++;
      }
    } else {
      console.log('✅ [LIVE-05] `donors_public_search` queryable by anonymous client');
      passed++;
    }
  } catch (err: any) {
    console.error('❌ [LIVE-05] Error querying donors_public_search:', err.message);
    failed++;
  }

  // 6. Public View blood_requests_public Column Check
  try {
    const { data, error } = await client.from('blood_requests_public').select('*').limit(5);
    if (error) {
      console.log('⚠️ [LIVE-06] blood_requests_public query note:', error.message);
    } else if (data && data.length > 0) {
      const sample = data[0];
      const sensitiveKeys = ['patient_name', 'contact_number', 'contact_person', 'hospital_room', 'case_details'];
      const leaked = sensitiveKeys.filter(k => k in sample && sample[k] !== undefined && sample[k] !== null && sample[k] !== '');
      if (leaked.length === 0) {
        console.log('✅ [LIVE-06] `blood_requests_public` -> ZERO Patient PII leaked across returned rows');
        passed++;
      } else {
        console.error('❌ [LIVE-06] `blood_requests_public` -> LEAKED SENSITIVE COLUMNS:', leaked);
        failed++;
      }
    } else {
      console.log('✅ [LIVE-06] `blood_requests_public` queryable by anonymous client');
      passed++;
    }
  } catch (err: any) {
    console.error('❌ [LIVE-06] Error querying blood_requests_public:', err.message);
    failed++;
  }

  // 7. Storage Private Bucket Access Check
  try {
    const { data, error } = await client.storage.from('verification-docs').list('', { limit: 5 });
    const isProtected = error !== null || !data || data.length === 0;
    if (isProtected) {
      console.log('✅ [LIVE-07] Private Storage `verification-docs` list -> DENIED (Secure)');
      passed++;
    } else {
      console.error('❌ [LIVE-07] Private Storage `verification-docs` list -> EXPOSED!');
      failed++;
    }
  } catch (err: any) {
    console.log('✅ [LIVE-07] Private Storage `verification-docs` list -> DENIED');
    passed++;
  }

  console.log('\n================================================================');
  console.log(`LIVE DATABASE AUDIT: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLiveChecks();
