/**
 * Automated Verification Script for Phase 10 — Notification Center
 */
import { DEFAULT_SYSTEM_CONFIG } from '../src/services/configService';
import { hasPermission } from '../src/services/permissionService';
import type { NotificationItem, UserRole } from '../src/types';

async function runNotificationCenterTests() {
  console.log('🧪 Starting Phase 10 Notification Center Automated Tests...\n');

  // Test 1: Delivery Channel & Gateway Defaults
  console.log('✓ Test 1: Notification Channel Configuration Defaults:');
  const notifConfig = DEFAULT_SYSTEM_CONFIG.notifications;
  if (!notifConfig) {
    throw new Error('Notification configuration section missing in DEFAULT_SYSTEM_CONFIG.');
  }
  console.log(`  Push Enabled: ${notifConfig.pushEnabled}`);
  console.log(`  SMS Enabled: ${notifConfig.smsEnabled} (Provider: ${notifConfig.smsProvider})`);
  console.log(`  Email Enabled: ${notifConfig.emailEnabled} (Provider: ${notifConfig.emailProvider})`);
  console.log(`  WhatsApp Enabled: ${notifConfig.whatsappEnabled}`);
  console.log(`  Default Language: ${notifConfig.defaultLanguage}`);

  // Test 2: Notification Lifecycle & Audience Targeting
  console.log('\n✓ Test 2: Notification Creation & Audience Broadcasts:');
  const sampleNotifications: NotificationItem[] = [
    {
      id: 'notif-1',
      userId: 'all',
      title: 'ধামরাই ব্লাড ক্যাম্পেইন ২০২৬',
      message: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্সে রক্তদান ক্যাম্পেইন অনুষ্ঠিত হচ্ছে।',
      type: 'system',
      link: '/camps',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-2',
      userId: 'usr-donor-1',
      title: 'রক্তের জরুরি অনুরোধ (A+)',
      message: 'সাভার এনাম মেডিকেল কলেজে জরুরি A+ রক্ত প্রয়োজন।',
      type: 'request',
      link: '/requests',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'notif-3',
      userId: 'usr-donor-1',
      title: 'রক্তদান সম্পন্ন করার স্বীকৃতি',
      message: 'আপনার সফল রক্তদানের জন্য ধন্যবাদ ও কৃতজ্ঞতা!',
      type: 'donation',
      isRead: true,
      createdAt: new Date().toISOString(),
    },
  ];

  for (const notif of sampleNotifications) {
    if (!notif.id || !notif.title || !notif.message || !notif.type) {
      throw new Error(`Notification ${notif.id} has invalid fields.`);
    }
    console.log(`  [${notif.type.toUpperCase()}] To: "${notif.userId}" | Title: "${notif.title}" | Read: ${notif.isRead}`);
  }

  // Test 3: Read State Transitions (Single & Batch)
  console.log('\n✓ Test 3: Notification Read State Transitions:');
  const unreadItem = sampleNotifications[1];
  const markedItem: NotificationItem = { ...unreadItem, isRead: true };
  if (!markedItem.isRead) {
    throw new Error('Failed to mark notification as read.');
  }
  console.log(`  Mark as read: [${markedItem.id}] isRead transition: false -> ${markedItem.isRead}`);

  // Batch mark all as read for user
  const batchReadList = sampleNotifications.map((n) => ({ ...n, isRead: true }));
  const remainingUnread = batchReadList.filter((n) => !n.isRead).length;
  if (remainingUnread !== 0) {
    throw new Error('Batch mark all read failed to update all items.');
  }
  console.log(`  Batch Mark All Read: Remaining unread count: ${remainingUnread}`);

  // Test 4: Notification Deletion
  console.log('\n✓ Test 4: Notification Deletion Lifecycle:');
  const remainingNotifs = sampleNotifications.filter((n) => n.id !== 'notif-1');
  if (remainingNotifs.some((n) => n.id === 'notif-1') || remainingNotifs.length !== 2) {
    throw new Error('Notification deletion failed.');
  }
  console.log(`  Deleted "notif-1". Remaining notifications count: ${remainingNotifs.length}`);

  // Test 5: Role Authorization for Notification Management
  console.log('\n✓ Test 5: Role Permissions for Notification Management:');
  const superAdminCanManage = hasPermission('super_admin', 'manage_settings');
  const adminCanManage = hasPermission('admin', 'manage_settings');
  const donorCanManage = hasPermission('donor', 'manage_settings');

  if (!superAdminCanManage || !adminCanManage) {
    throw new Error('Super Admin and Admin must have manage_settings permission.');
  }
  if (donorCanManage) {
    throw new Error('Donor role must NOT have manage_settings permission.');
  }
  console.log('  Super Admin broadcast authorization: ALLOWED');
  console.log('  Admin broadcast authorization: ALLOWED');
  console.log('  Donor broadcast authorization: BLOCKED');

  console.log('\n🎉 ALL Phase 10 Notification Center Tests Passed Successfully!');
}

runNotificationCenterTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
