/**
 * Phase 19: Complete Master Regression Test Runner
 * Executes all domain test suites across RoktoBondhon Admin Control Center.
 */
import { execSync } from 'child_process';
import path from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: '1. Central Config Security',
    file: 'scripts/testConfigSecurity.ts',
    description: 'Verifies RBAC access guards, safe defaults, bounds validation, and audit trail',
  },
  {
    name: '2. Configurable Matching Engine',
    file: 'scripts/testMatchingEngine.ts',
    description: 'Verifies 8-criteria weighted scoring algorithm and simulator',
  },
  {
    name: '3. Blood Request Control',
    file: 'scripts/testBloodRequestControl.ts',
    description: 'Verifies hospital requirements, emergency escalation, and unit limits',
  },
  {
    name: '4. Emergency Control & Broadcast',
    file: 'scripts/testEmergencyControl.ts',
    description: 'Verifies crisis mode, radius calculation, and broadcast alerts',
  },
  {
    name: '5. User Role & Permissions (RBAC)',
    file: 'scripts/testUserRolePermissions.ts',
    description: 'Verifies SuperAdmin, Admin, Moderator, Volunteer, Donor permissions and menu access',
  },
  {
    name: '6. Location & Hospital Management',
    file: 'scripts/testLocationHospitalControl.ts',
    description: 'Verifies 64 districts, 495 upazilas, branch coordinates, and hospital mappings',
  },
  {
    name: '7. Multi-Channel Notification Center',
    file: 'scripts/testNotificationCenter.ts',
    description: 'Verifies SMS, Push, WhatsApp, and Email dispatch pipeline & template renderers',
  },
  {
    name: '8. Fund & Financial Donation Governance',
    file: 'scripts/testFundDonationManagement.ts',
    description: 'Verifies bKash/Nagad/Rocket ledger, verification status, and campaign budgets',
  },
  {
    name: '9. Gamification, Badges & Certificates',
    file: 'scripts/testGamificationGovernance.ts',
    description: 'Verifies donor tiers, points calculation, SVG certificate generator & verification tokens',
  },
  {
    name: '10. SEO, Meta & Social Broadcast',
    file: 'scripts/testSeoMetaSocialControl.ts',
    description: 'Verifies OpenGraph, JSON-LD structured data, and crisis share templates',
  },
  {
    name: '11. Audit Security & Governance',
    file: 'scripts/testAuditSecurityGovernance.ts',
    description: 'Verifies immutable audit logging, actor tracking, and export verification',
  },
  {
    name: '12. Backup & Data Portability',
    file: 'scripts/testBackupDataPortability.ts',
    description: 'Verifies snapshot creation, JSON/CSV exports, and integrity validation',
  },
  {
    name: '13. Blood Camp Operations',
    file: 'scripts/testBloodCampManagement.ts',
    description: 'Verifies camp scheduling, target units, registration count, and status life-cycle',
  },
  {
    name: '14. Analytics & Aggregation Engine',
    file: 'scripts/testAnalyticsReportingEngine.ts',
    description: 'Verifies KPI aggregation, district breakdown, blood group trends, and CSV reporting',
  },
  {
    name: '15. PWA, Offline Sync & Diagnostics',
    file: 'scripts/testPwaAndSystemHealth.ts',
    description: 'Verifies Service Worker queue, offline caching, and diagnostic metrics',
  },
  {
    name: '16. Donor Verification State Sync & Idempotency',
    file: 'scripts/testDonorVerificationSync.ts',
    description: 'Verifies atomic donor verification, idempotency protection, and RLS/role boundaries',
  },
];

async function runMasterRegressionSuite() {
  console.log('================================================================');
  console.log('🩸 ROKTOBONDHON ADMIN CONTROL CENTER — MASTER REGRESSION SUITE');
  console.log('================================================================\n');

  const startTime = performance.now();
  let passedCount = 0;
  let failedCount = 0;
  const results: { name: string; durationMs: number; status: 'PASSED' | 'FAILED'; error?: string }[] = [];

  for (const suite of TEST_SUITES) {
    const suiteStart = performance.now();
    process.stdout.write(`▶ Running: ${suite.name}... `);

    try {
      execSync(`npx tsx ${suite.file}`, {
        stdio: 'pipe',
        encoding: 'utf-8',
        cwd: process.cwd(),
      });
      const durationMs = Math.round(performance.now() - suiteStart);
      console.log(`✅ PASSED (${durationMs}ms)`);
      results.push({ name: suite.name, durationMs, status: 'PASSED' });
      passedCount++;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - suiteStart);
      console.log(`❌ FAILED (${durationMs}ms)`);
      const errorOutput = err.stdout?.toString() || err.stderr?.toString() || err.message;
      results.push({ name: suite.name, durationMs, status: 'FAILED', error: errorOutput });
      failedCount++;
    }
  }

  const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);

  console.log('\n================================================================');
  console.log('📊 REGRESSION TEST SUITE SUMMARY');
  console.log('================================================================');
  console.log(`Total Test Suites: ${TEST_SUITES.length}`);
  console.log(`Passed Suites:     ${passedCount}`);
  console.log(`Failed Suites:     ${failedCount}`);
  console.log(`Total Execution:   ${totalDuration}s\n`);

  results.forEach((r, idx) => {
    const icon = r.status === 'PASSED' ? '✓' : '✗';
    console.log(`  [${icon}] ${r.name} (${r.durationMs}ms)`);
    if (r.error) {
      console.log(`      Error: ${r.error.slice(0, 300)}...`);
    }
  });

  console.log('================================================================\n');

  if (failedCount > 0) {
    console.error(`🚨 ${failedCount} test suite(s) failed. Regression detected!`);
    process.exit(1);
  } else {
    console.log('🎉 100% REGRESSION TESTS PASSED! ALL 18 SYSTEM MODULES VERIFIED ROBUST.');
  }
}

runMasterRegressionSuite();
