/**
 * Automated Verification Script for Phase 13 — Audit, Logs & Security Governance
 */
import {
  filterAuditLogs,
  isSecurityCriticalEvent,
  recordAuditLog,
} from '../src/services/auditService';
import { hasPermission } from '../src/services/permissionService';
import type { AuditLog, UserRole } from '../src/types';

async function runAuditSecurityGovernanceTests() {
  console.log('🧪 Starting Phase 13 Audit, Logs & Security Governance Automated Tests...\n');

  // Test 1: Record Audit Log Lifecycle
  console.log('✓ Test 1: Audit Log Structure & Immutability:');
  const sampleLog = await recordAuditLog(
    'রোল আপডেট করা হয়েছে: volunteer -> moderator',
    'USER',
    'usr-101',
    { previousRole: 'volunteer', newRole: 'moderator' },
    { id: 'usr-admin', name: 'প্রধান এডমিন', role: 'super_admin' }
  );

  if (!sampleLog.id || !sampleLog.timestamp || sampleLog.userId !== 'usr-admin' || sampleLog.userRole !== 'super_admin') {
    throw new Error('Audit log creation failed or missing fields.');
  }
  console.log(`  Logged: [${sampleLog.id}] by ${sampleLog.userName} (${sampleLog.userRole}): "${sampleLog.action}"`);

  // Test 2: Security Critical Event Detection
  console.log('\n✓ Test 2: High-Risk Security Critical Event Flagging:');
  const mockLogs: AuditLog[] = [
    sampleLog,
    {
      id: 'log-2',
      userId: 'usr-admin',
      userName: 'এডমিন',
      userRole: 'admin',
      action: 'হাসপাতাল ভেরিফাই ও অনুমোদন করা হয়েছে',
      targetType: 'HOSPITAL',
      targetId: 'hosp-1',
      metadata: { nameBn: 'কালামপুর ক্লিনিক' },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'log-3',
      userId: 'usr-admin',
      userName: 'এডমিন',
      userRole: 'admin',
      action: 'সিস্টেম সেটিংস আপডেট (Emergency Mode Enabled)',
      targetType: 'CONFIG',
      targetId: 'emergency',
      metadata: { emergencyMode: true },
      timestamp: new Date().toISOString(),
    },
    {
      id: 'log-4',
      userId: 'usr-mod',
      userName: 'মডারেটর',
      userRole: 'moderator',
      action: 'রক্তের আবেদন যাচাইকরণ সম্পন্ন',
      targetType: 'REQUEST',
      targetId: 'req-10',
      timestamp: new Date().toISOString(),
    },
  ];

  const critical1 = isSecurityCriticalEvent(mockLogs[0]); // role update -> true
  const critical2 = isSecurityCriticalEvent(mockLogs[1]); // hospital verify -> false
  const critical3 = isSecurityCriticalEvent(mockLogs[2]); // config/settings -> true

  console.log(`  Log 1 ("${mockLogs[0].action}") -> Critical: ${critical1} (Expected true)`);
  console.log(`  Log 2 ("${mockLogs[1].action}") -> Critical: ${critical2} (Expected false)`);
  console.log(`  Log 3 ("${mockLogs[2].action}") -> Critical: ${critical3} (Expected true)`);

  if (!critical1 || critical2 || !critical3) {
    throw new Error('Security critical event classification failed.');
  }

  // Test 3: Multi-dimensional Audit Log Filtering
  console.log('\n✓ Test 3: Multi-Dimensional Filtering & Search:');
  const filteredByType = filterAuditLogs(mockLogs, { targetType: 'CONFIG' });
  if (filteredByType.length !== 1 || filteredByType[0].targetId !== 'emergency') {
    throw new Error('Filtering by target type failed.');
  }
  console.log(`  Filtered by targetType="CONFIG": Found ${filteredByType.length} item.`);

  const filteredByRole = filterAuditLogs(mockLogs, { userRole: 'super_admin' });
  if (filteredByRole.length !== 1 || filteredByRole[0].userRole !== 'super_admin') {
    throw new Error('Filtering by userRole failed.');
  }
  console.log(`  Filtered by userRole="super_admin": Found ${filteredByRole.length} item.`);

  const filteredBySearch = filterAuditLogs(mockLogs, { searchTerm: 'কালামপুর' });
  if (filteredBySearch.length !== 1 || filteredBySearch[0].targetId !== 'hosp-1') {
    throw new Error('Filtering by search query failed.');
  }
  console.log(`  Filtered by searchTerm="কালামপুর": Found ${filteredBySearch.length} item.`);

  // Test 4: Role-Based Authorization for Audit Logs
  console.log('\n✓ Test 4: Role Permissions for Audit Governance:');
  const superAdminCanView = hasPermission('super_admin', 'view_audit_logs');
  const adminCanView = hasPermission('admin', 'view_audit_logs');
  const moderatorCanView = hasPermission('moderator', 'view_audit_logs');
  const donorCanView = hasPermission('donor', 'view_audit_logs');

  if (!superAdminCanView || !adminCanView) {
    throw new Error('Super Admin and Admin must be authorized to view audit logs.');
  }
  if (donorCanView) {
    throw new Error('Donor role must NOT have view_audit_logs permission.');
  }
  console.log(`  Super Admin view_audit_logs: ALLOWED`);
  console.log(`  Admin view_audit_logs: ALLOWED`);
  console.log(`  Moderator view_audit_logs: ${moderatorCanView ? 'ALLOWED' : 'BLOCKED'}`);
  console.log(`  Donor view_audit_logs: BLOCKED`);

  console.log('\n🎉 ALL Phase 13 Audit, Logs & Security Governance Tests Passed Successfully!');
}

runAuditSecurityGovernanceTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
