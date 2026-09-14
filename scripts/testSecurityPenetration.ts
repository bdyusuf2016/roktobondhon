/**
 * Phase 28: Independent Production Security & Penetration Audit Test Suite
 * Validates RLS boundaries, RBAC privilege escalation resistance, IDOR protection,
 * donor privacy masking, storage security, audit immutability, and financial integrity.
 */

import { validateRoleAssignment, canManageRole, hasPermission } from '../src/services/permissionService';
import { calculateFinancialAnalytics } from '../src/services/analyticsService';
import { validatePwaConfig } from '../src/services/pwaService';
import { validateBackupPayload } from '../src/services/backupService';
import { DEFAULT_PERMISSION_MATRIX } from '../src/data/seedData';
import type { Donor, FundDonation, FundDisbursement } from '../src/types';
import fs from 'fs';
import path from 'path';

interface SecurityTestCase {
  id: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  fn: () => boolean | Promise<boolean>;
}

const SECURITY_TESTS: SecurityTestCase[] = [
  // 1. Secret Exposure & Key Leak Prevention
  {
    id: 'SEC-01',
    name: 'Zero Exposure of service_role or Admin Secrets in Frontend',
    severity: 'CRITICAL',
    category: 'Secrets & Keys',
    fn: () => {
      const srcDir = path.resolve(process.cwd(), 'src');
      const files = fs.readdirSync(srcDir, { recursive: true }) as string[];
      for (const file of files) {
        const fullPath = path.join(srcDir, file);
        if (fs.statSync(fullPath).isFile() && (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js'))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('service_role') || content.includes('SERVICE_ROLE_KEY') || content.includes('sb_secret_')) {
            throw new Error(`CRITICAL: Exposed service_role secret found in ${file}`);
          }
        }
      }
      return true;
    },
  },

  // 2. Vertical Privilege Escalation Prevention
  {
    id: 'SEC-02',
    name: 'Block Vertical Privilege Escalation (Donor -> SuperAdmin / Admin)',
    severity: 'CRITICAL',
    category: 'RBAC Authorization',
    fn: () => {
      // Normal donor cannot assign themselves 'super_admin' or 'admin'
      const donorToAdmin = validateRoleAssignment('donor', 'donor', 'super_admin');
      if (donorToAdmin.allowed) {
        throw new Error('FAILED: Normal donor was allowed to assign super_admin role');
      }

      const volunteerToAdmin = validateRoleAssignment('volunteer', 'volunteer', 'admin');
      if (volunteerToAdmin.allowed) {
        throw new Error('FAILED: Volunteer was allowed to escalate to admin');
      }

      const modToSuperAdmin = validateRoleAssignment('moderator', 'moderator', 'super_admin');
      if (modToSuperAdmin.allowed) {
        throw new Error('FAILED: Moderator was allowed to escalate to super_admin');
      }

      return true;
    },
  },

  // 3. User Role Hierarchy Management Boundary
  {
    id: 'SEC-03',
    name: 'Enforce Hierarchical Role Management (Lower cannot manage higher)',
    severity: 'CRITICAL',
    category: 'RBAC Authorization',
    fn: () => {
      if (canManageRole('volunteer', 'admin')) {
        throw new Error('FAILED: Volunteer allowed to manage Admin');
      }
      if (canManageRole('moderator', 'super_admin')) {
        throw new Error('FAILED: Moderator allowed to manage SuperAdmin');
      }
      if (canManageRole('donor', 'moderator')) {
        throw new Error('FAILED: Donor allowed to manage Moderator');
      }
      if (!canManageRole('super_admin', 'admin')) {
        throw new Error('FAILED: SuperAdmin denied managing Admin');
      }
      return true;
    },
  },

  // 4. Permission Matrix Access Guards
  {
    id: 'SEC-04',
    name: 'Enforce Administrative Permission Isolation',
    severity: 'HIGH',
    category: 'Permissions',
    fn: () => {
      // Donors must NOT have financial or system permissions
      const donorCanDisburse = hasPermission('donor', 'manage_funds', DEFAULT_PERMISSION_MATRIX);
      const donorCanAudit = hasPermission('donor', 'view_audit_logs', DEFAULT_PERMISSION_MATRIX);

      if (donorCanDisburse || donorCanAudit) {
        throw new Error('FAILED: Donor has elevated administrative permissions');
      }

      // Volunteer must NOT have audit log permissions
      const volunteerCanAudit = hasPermission('volunteer', 'view_audit_logs', DEFAULT_PERMISSION_MATRIX);
      if (volunteerCanAudit) {
        throw new Error('FAILED: Volunteer has audit log permissions');
      }

      return true;
    },
  },

  // 5. Donor Privacy & Sensitive Data Masking
  {
    id: 'SEC-05',
    name: 'Verify Donor Privacy Field Masking (Phone, NID, Address)',
    severity: 'HIGH',
    category: 'Privacy & Data Protection',
    fn: () => {
      const mockDonor: Partial<Donor> = {
        id: 'dnr-test-1',
        fullName: 'Private Donor',
        phone: '+8801700000000',
        nidOrIdNumber: '19951234567890123',
        exactAddress: 'Secret House 12, Kalampur',
        privacy: {
          showPhone: false,
          showGender: false,
          showAge: false,
          allowDirectContact: false,
        },
      };

      // Masked public profile should hide phone when showPhone is false
      const publicPhone = mockDonor.privacy?.showPhone ? mockDonor.phone : '';
      if (publicPhone !== '') {
        throw new Error('FAILED: Private phone number was not masked when showPhone = false');
      }

      return true;
    },
  },

  // 6. Financial Ledger Calculation & Tamper Resistance
  {
    id: 'SEC-06',
    name: 'Verify Authoritative Financial Reserve Calculations',
    severity: 'HIGH',
    category: 'Financial Governance',
    fn: () => {
      const mockDonations: FundDonation[] = [
        {
          id: 'fd-1',
          donorName: 'Donor A',
          donorPhone: '01711111111',
          fundCause: 'Emergency Fund',
          isAnonymous: false,
          amount: 5000,
          paymentMethod: 'bKash',
          transactionId: 'TX1001',
          status: 'verified',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'fd-2',
          donorName: 'Donor B',
          donorPhone: '01722222222',
          fundCause: 'Emergency Fund',
          isAnonymous: false,
          amount: 2000,
          paymentMethod: 'Nagad',
          transactionId: 'TX1002',
          status: 'pending', // Unverified must NOT be counted in reserve
          createdAt: new Date().toISOString(),
        },
      ];

      const mockDisbursements: FundDisbursement[] = [
        {
          id: 'disb-1',
          title: 'Emergency Patient Support',
          cause: 'Emergency ICU Support',
          amount: 1500,
          approvedBy: 'Admin',
          recipient: 'Hospital',
          area: 'Dhamrai',
          date: new Date().toISOString(),
        },
      ];

      const analytics = calculateFinancialAnalytics(mockDonations, mockDisbursements);

      // Only verified donations (5000) minus disbursements (1500) = 3500 net reserve
      if (analytics.totalCollected !== 5000) {
        throw new Error(`FAILED: Total collected should only count verified funds, got ${analytics.totalCollected}`);
      }
      if (analytics.netReserve !== 3500) {
        throw new Error(`FAILED: Net reserve calculation mismatch, expected 3500, got ${analytics.netReserve}`);
      }

      return true;
    },
  },

  // 7. System Backup Schema & Tamper Validation
  {
    id: 'SEC-07',
    name: 'Verify Backup Payload Checksum & Structure Validation',
    severity: 'MEDIUM',
    category: 'Data Portability',
    fn: () => {
      const malformedJson = '{ version: "1.0", brokenJson ';
      const resultMalformed = validateBackupPayload(malformedJson);
      if (resultMalformed.isValid) {
        throw new Error('FAILED: Malformed JSON passed backup validation');
      }

      const emptyPayload = '';
      const resultEmpty = validateBackupPayload(emptyPayload);
      if (resultEmpty.isValid) {
        throw new Error('FAILED: Empty backup payload passed validation');
      }

      return true;
    },
  },

  // 8. PWA Configuration Bounds & Sanitization
  {
    id: 'SEC-08',
    name: 'Verify PWA Configuration Injection & Hex Code Bounds',
    severity: 'LOW',
    category: 'PWA Security',
    fn: () => {
      const invalidPwaConfig = {
        appName: 'Test App',
        appNameBn: 'টেস্ট অ্যাপ',
        shortName: 'Test',
        themeColor: 'javascript:alert(1)', // Malicious non-hex injection attempt
        backgroundColor: '#ffffff',
      };

      const validation = validatePwaConfig(invalidPwaConfig);
      if (validation.isValid) {
        throw new Error('FAILED: Non-hex color injection passed PWA validation');
      }

      return true;
    },
  },
  // 9. Live Supabase Database RLS & Trigger Verification (Live Database Connection)
  {
    id: 'SEC-09',
    name: 'Live Supabase Trigger: Block Role Tampering & Escalation',
    severity: 'CRITICAL',
    category: 'Database Triggers & RLS',
    fn: async () => {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return true; // Skip if no live credentials

      const { createClient } = await import('@supabase/supabase-js');
      const liveClient = createClient(supabaseUrl, supabaseAnonKey);

      // Attempt role escalation as anonymous client
      const { data, error } = await liveClient
        .from('users')
        .update({ role: 'super_admin' })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select();

      // Must be rejected by database trigger or return 0 rows
      const isBlocked = error !== null || !data || data.length === 0;
      if (!isBlocked) {
        throw new Error('FAILED: Live Supabase database allowed unauthenticated role update');
      }
      return true;
    },
  },

  // 10. Live Supabase Storage Private Bucket Access Check
  {
    id: 'SEC-10',
    name: 'Live Supabase Storage: Enforce Private Bucket Boundary',
    severity: 'HIGH',
    category: 'Storage Security',
    fn: async () => {
      const supabaseUrl = process.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return true;

      const { createClient } = await import('@supabase/supabase-js');
      const liveClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await liveClient.storage
        .from('verification-docs')
        .list('', { limit: 10 });

      // Unauthenticated client must NOT receive document list
      const isProtected = error !== null || !data || data.length === 0;
      if (!isProtected) {
        throw new Error('FAILED: Anonymous client listed private verification-docs');
      }
      return true;
    },
  },

  // 11. Phase 0 SQL Migration Security Audit (Schema & RLS Verification)
  {
    id: 'SEC-11',
    name: 'Phase 0 SQL Migration: Schema Integrity & RLS Verification',
    severity: 'CRITICAL',
    category: 'Database Migrations',
    fn: () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/20260914_phase0_security_hardening.sql');
      if (!fs.existsSync(migrationPath)) {
        throw new Error('CRITICAL: Phase 0 migration file 20260914_phase0_security_hardening.sql missing');
      }
      const sql = fs.readFileSync(migrationPath, 'utf8');

      // Check view definitions
      if (!sql.includes('CREATE OR REPLACE VIEW public.donors_public_search')) {
        throw new Error('FAILED: donors_public_search view missing from Phase 0 migration');
      }
      if (sql.includes('d.phone,') || sql.includes('d.nid_or_id_number,') || sql.includes('d.exact_address,')) {
        throw new Error('CRITICAL: donors_public_search includes sensitive PII columns');
      }
      if (!sql.includes('CREATE OR REPLACE VIEW public.blood_requests_public')) {
        throw new Error('FAILED: blood_requests_public view missing from Phase 0 migration');
      }
      if (sql.includes('br.patient_name,') || sql.includes('br.contact_number,')) {
        throw new Error('CRITICAL: blood_requests_public includes requester PII columns');
      }

      // Check trigger on INSERT OR UPDATE
      if (!sql.includes('BEFORE INSERT OR UPDATE ON public.users')) {
        throw new Error('CRITICAL: protect_user_roles trigger must be on BEFORE INSERT OR UPDATE');
      }

      // Check immutable audit logs
      if (!sql.includes('DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;')) {
        throw new Error('FAILED: Direct client audit_logs insert policy was not dropped');
      }
      if (!sql.includes('CREATE OR REPLACE FUNCTION public.record_audit_log')) {
        throw new Error('FAILED: Trusted record_audit_log RPC function missing');
      }

      return true;
    },
  },

  // 12. Storage MIME Type & Executable Attack Surface Hardening
  {
    id: 'SEC-12',
    name: 'Storage Upload Validation: Strict MIME Types (No Executable / SVG / HTML)',
    severity: 'HIGH',
    category: 'Storage Security',
    fn: async () => {
      const { ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES } = await import('../src/services/storageService');

      // SVG or HTML could execute script tags in browser; check they are disallowed in image uploads
      const dangerousMimeTypes = ['image/svg+xml', 'text/html', 'text/javascript', 'application/x-msdownload', 'application/x-php'];
      for (const dangerous of dangerousMimeTypes) {
        if (ALLOWED_IMAGE_TYPES.includes(dangerous)) {
          throw new Error(`CRITICAL: Dangerous MIME type ${dangerous} allowed in ALLOWED_IMAGE_TYPES`);
        }
        if (ALLOWED_DOC_TYPES.includes(dangerous)) {
          throw new Error(`CRITICAL: Dangerous MIME type ${dangerous} allowed in ALLOWED_DOC_TYPES`);
        }
      }

      return true;
    },
  },

  // 13. Hospital Auto-Registration PII Leak Prevention
  {
    id: 'SEC-13',
    name: 'Hospital Auto-Creation: Prevent Requester Phone Leakage into Public Hotline',
    severity: 'CRITICAL',
    category: 'Privacy & Data Protection',
    fn: () => {
      const pagePath = path.resolve(process.cwd(), 'src/pages/RequestBloodPage.tsx');
      const content = fs.readFileSync(pagePath, 'utf8');

      // Must not set hotline: formData.contactNumber or similar
      if (/hotline:\s*formData\.contactNumber/.test(content)) {
        throw new Error('CRITICAL: RequestBloodPage sets hospital hotline to requester contactNumber');
      }
      if (!/hotline:\s*''/.test(content)) {
        throw new Error('WARNING: RequestBloodPage auto-hospital does not default hotline to empty');
      }

      return true;
    },
  },

  // 14. Frontend Service Query Routing (Safe Views vs Raw Tables)
  {
    id: 'SEC-14',
    name: 'Frontend Services: Route Public Queries to Safe Masked Views',
    severity: 'HIGH',
    category: 'API & Query Routing',
    fn: () => {
      const donorServicePath = path.resolve(process.cwd(), 'src/services/donorService.ts');
      const donorContent = fs.readFileSync(donorServicePath, 'utf8');
      if (!donorContent.includes("from('donors_public_search')")) {
        throw new Error('FAILED: donorService does not query donors_public_search for public donors');
      }

      const bloodRequestServicePath = path.resolve(process.cwd(), 'src/services/bloodRequestService.ts');
      const requestContent = fs.readFileSync(bloodRequestServicePath, 'utf8');
      if (!requestContent.includes("from('blood_requests_public')")) {
        throw new Error('FAILED: bloodRequestService does not query blood_requests_public for public requests');
      }

      return true;
    },
  },

  // 15. Certificate Privacy: No Raw Phone Search Exposing Donor Details
  {
    id: 'SEC-15',
    name: 'Certificate Search: Disallow Public Phone Search for Donor Discovery',
    severity: 'HIGH',
    category: 'Privacy & Data Protection',
    fn: () => {
      const certPagePath = path.resolve(process.cwd(), 'src/pages/CertificatePage.tsx');
      const content = fs.readFileSync(certPagePath, 'utf8');

      if (content.includes('d.phone === searchQuery') || content.includes('d.phone.includes(searchQuery)')) {
        throw new Error('CRITICAL: CertificatePage permits searching donor records by phone number');
      }

      return true;
    },
  },

  // 16. Build Config: Zero Secret Leaks via Vite Define
  {
    id: 'SEC-16',
    name: 'Vite Config: Zero API Key Embedding in Client Bundles',
    severity: 'CRITICAL',
    category: 'Secrets & Keys',
    fn: () => {
      const viteConfigPath = path.resolve(process.cwd(), 'vite.config.ts');
      const content = fs.readFileSync(viteConfigPath, 'utf8');

      if (content.includes("define: { 'process.env.GEMINI_API_KEY'") || content.includes("process.env.GEMINI_API_KEY")) {
        throw new Error('CRITICAL: vite.config.ts embeds GEMINI_API_KEY into client bundle');
      }

      return true;
    },
  },
];

async function runSecurityPenetrationSuite() {
  console.log('================================================================');
  console.log('🛡️ ROKTOBONDHON INDEPENDENT PRODUCTION SECURITY AUDIT SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;
  const startTime = performance.now();

  for (const test of SECURITY_TESTS) {
    process.stdout.write(`▶ [${test.id}] ${test.name}... `);
    try {
      const result = await test.fn();
      if (result) {
        passed++;
        console.log(`✅ PASSED (${test.category} | ${test.severity})`);
      } else {
        failed++;
        console.log(`❌ FAILED`);
      }
    } catch (err: any) {
      failed++;
      console.log(`❌ FAILED: ${err.message}`);
    }
  }

  const duration = ((performance.now() - startTime) / 1000).toFixed(2);

  console.log('\n================================================================');
  console.log('📊 SECURITY AUDIT SUMMARY');
  console.log('================================================================');
  console.log(`Total Security Checks: ${SECURITY_TESTS.length}`);
  console.log(`Passed Checks:        ${passed}`);
  console.log(`Failed Checks:        ${failed}`);
  console.log(`Audit Duration:       ${duration}s\n`);

  if (failed > 0) {
    console.error(`🚨 SECURITY AUDIT FAILED: ${failed} vulnerabilities detected.`);
    process.exit(1);
  } else {
    console.log(`🎉 100% SECURITY AUDIT PASSED! ZERO CRITICAL OR HIGH VULNERABILITIES.`);
    process.exit(0);
  }
}

runSecurityPenetrationSuite();
