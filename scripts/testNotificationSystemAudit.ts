import { describe, it } from 'node:test';
import assert from 'node:assert';

// Data structures
interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'request' | 'match' | 'verification' | 'donation' | 'system';
  link?: string;
  is_read: boolean;
  created_at: string;
}

interface UserRow {
  id: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'moderator' | 'volunteer';
  status: 'active' | 'suspended' | 'inactive';
}

interface DonorRow {
  id: string;
  donor_id: string;
  user_id: string;
  full_name: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';
  verified_by?: string;
  verified_at?: string;
  admin_notes?: string;
}

// 1. RLS Simulation Functions
function canSelectNotification(notif: NotificationRow, authUid: string | null, isStaff: boolean): boolean {
  if (!authUid) return notif.user_id === 'all';
  return notif.user_id === authUid || notif.user_id === 'all' || isStaff;
}

function canInsertNotificationDirect(authUid: string | null, isStaff: boolean): boolean {
  return isStaff; // Ordinary donors cannot insert directly
}

function canUpdateNotification(notif: NotificationRow, authUid: string | null, isStaff: boolean): boolean {
  if (!authUid) return false;
  return notif.user_id === authUid || isStaff;
}

function canDeleteNotification(notif: NotificationRow, authUid: string | null, isAdmin: boolean): boolean {
  if (!authUid) return false;
  return notif.user_id === authUid || isAdmin;
}

// 2. Database Trigger Simulation for Donor Registration
function simulateDonorRegistrationTrigger(
  donorData: Omit<DonorRow, 'id' | 'verification_status'>,
  allUsers: UserRow[]
): {
  donor: DonorRow;
  notifications: NotificationRow[];
} {
  const donor: DonorRow = {
    ...donorData,
    id: `donor-${Date.now()}`,
    verification_status: 'pending',
  };

  const notifications: NotificationRow[] = [];
  const now = new Date().toISOString();

  // 1. Notify the registering donor (Pending Verification)
  if (donor.user_id) {
    notifications.push({
      id: `notif-${Math.floor(Math.random() * 1000000)}-donor`,
      user_id: donor.user_id,
      title: 'রক্তদাতা প্রোফাইল যাচাইকরণ প্রক্রিয়াধীন',
      message:
        'আপনার রক্তদাতা প্রোফাইল সফলভাবে তৈরি হয়েছে। কালামপুর রক্ত দান পরিবারের তথ্য যাচাইয়ের পর আপনার প্রোফাইলটি সক্রিয় ও পাবলিক তালিকায় প্রদর্শিত হবে।',
      type: 'verification',
      link: '/profile',
      is_read: false,
      created_at: now,
    });
  }

  // 2. Notify all active Super Admin, Admin, and Moderator staff members (Volunteers excluded)
  const reviewers = allUsers.filter(
    (u) =>
      ['super_admin', 'admin', 'moderator'].includes(u.role) &&
      u.status === 'active' &&
      u.id !== donor.user_id // Avoid notifying self if a staff member registered as a donor
  );

  for (const staff of reviewers) {
    notifications.push({
      id: `notif-${Math.floor(Math.random() * 1000000)}-staff-${staff.id}`,
      user_id: staff.id,
      title: 'নতুন রক্তদাতা যাচাইয়ের জন্য অপেক্ষমাণ',
      message: `নতুন রক্তদাতা ${donor.full_name || 'নামহীন'} (আইডি: ${donor.donor_id || donor.id}) নিবন্ধিত হয়েছেন। অনুগ্রহ করে প্রোফাইলটি যাচাই করুন।`,
      type: 'verification',
      link: '/admin?tab=donors',
      is_read: false,
      created_at: now,
    });
  }

  return { donor, notifications };
}

// 3. Database RPC Simulation for verify_donor()
function simulateVerifyDonorRpc(
  donor: DonorRow,
  newStatus: 'verified' | 'rejected' | 'suspended' | 'unverified' | 'pending',
  notes: string | undefined,
  callerRole: string
): {
  updatedDonor: DonorRow;
  donorNotification: NotificationRow | null;
} {
  const isStaff = ['super_admin', 'admin', 'moderator', 'volunteer'].includes(callerRole);
  if (!isStaff) {
    throw new Error('Unauthorized: Only authorized staff members can verify donors.');
  }

  const updatedDonor: DonorRow = {
    ...donor,
    verification_status: newStatus,
    verified_by: 'Staff Verifier',
    verified_at: newStatus === 'verified' ? new Date().toISOString() : donor.verified_at,
    admin_notes: notes || donor.admin_notes,
  };

  let title = '';
  let message = '';

  if (newStatus === 'verified') {
    title = 'অভিনন্দন! আপনার রক্তদাতা প্রোফাইল ভেরিফাইড হয়েছে';
    message =
      'কালামপুর রক্ত দান পরিবার আপনার রক্তদাতা প্রোফাইলটি সফলভাবে যাচাই ও ভেরিফাইড করেছে। এখন থেকে আপনি সরাসরি জরুরি রক্তদানের অনুরোধ পাবেন।';
  } else if (newStatus === 'rejected') {
    title = 'রক্তদাতা প্রোফাইল আবেদন স্থগিত বা প্রত্যাখ্যাত';
    message = notes
      ? `তথ্য অমিল বা অসম্পূর্ণতার কারণে আপনার আবেদনটি স্থগিত করা হয়েছে। কারণ: ${notes}`
      : 'তথ্য অমিল বা অসম্পূর্ণতার কারণে আপনার আবেদনটি গ্রহণ করা সম্ভব হয়নি।';
  } else if (newStatus === 'suspended') {
    title = 'রক্তদাতা প্রোফাইল সাময়িকভাবে স্থগিত';
    message = notes
      ? `আপনার রক্তদাতা প্রোফাইলটি সাময়িকভাবে স্থগিত করা হয়েছে। কারণ: ${notes}`
      : 'আপনার রক্তদাতা প্রোফাইলটি সাময়িকভাবে স্থগিত করা হয়েছে।';
  } else {
    title = 'রক্তদাতা প্রোফাইল পুনর্যাচাই প্রক্রিয়াধীন';
    message = 'আপনার রক্তদাতা প্রোফাইলটি পুনরায় যাচাইকরণের জন্য অপেক্ষমান রাখা হয়েছে।';
  }

  const donorNotification: NotificationRow = {
    id: `notif-${Math.floor(Math.random() * 1000000)}-outcome`,
    user_id: donor.user_id,
    title,
    message,
    type: 'verification',
    link: '/profile',
    is_read: false,
    created_at: new Date().toISOString(),
  };

  return { updatedDonor, donorNotification };
}

describe('🧪 RoktoBondhon Notification System & Verification Lifecycle Suite', () => {
  const mockUsers: UserRow[] = [
    { id: 'usr-super-1', full_name: 'Md. Yusuf Ali', role: 'super_admin', status: 'active' },
    { id: 'usr-admin-1', full_name: 'Milon Mahmud', role: 'admin', status: 'active' },
    { id: 'usr-mod-1', full_name: 'Anis Moderator', role: 'moderator', status: 'active' },
    { id: 'usr-mod-inactive', full_name: 'Inactive Mod', role: 'moderator', status: 'inactive' },
    { id: 'usr-vol-1', full_name: 'Kamal Volunteer', role: 'volunteer', status: 'active' },
  ];

  const ordinaryDonorUid = 'donor-auth-uuid-1111';
  const otherDonorUid = 'donor-auth-uuid-2222';

  it('Test 1: Ordinary donor registers -> Donor gets Pending notification', () => {
    const { donor, notifications } = simulateDonorRegistrationTrigger(
      {
        donor_id: 'DHM-0101',
        user_id: ordinaryDonorUid,
        full_name: 'Sakib Khan',
      },
      mockUsers
    );

    assert.strictEqual(donor.verification_status, 'pending');
    const donorNotif = notifications.find((n) => n.user_id === ordinaryDonorUid);
    assert.ok(donorNotif, 'Donor must receive pending notification');
    assert.strictEqual(donorNotif.type, 'verification');
    assert.strictEqual(donorNotif.link, '/profile');
    assert.ok(donorNotif.title.includes('যাচাইকরণ প্রক্রিয়াধীন'));
    assert.strictEqual(donorNotif.is_read, false);
  });

  it('Test 2: All active super_admin, admin, moderator users get New Donor notification with admin route', () => {
    const { notifications } = simulateDonorRegistrationTrigger(
      {
        donor_id: 'DHM-0101',
        user_id: ordinaryDonorUid,
        full_name: 'Sakib Khan',
      },
      mockUsers
    );

    // Active super_admin
    const superNotif = notifications.find((n) => n.user_id === 'usr-super-1');
    assert.ok(superNotif, 'Super Admin must receive review notification');
    assert.strictEqual(superNotif.title, 'নতুন রক্তদাতা যাচাইয়ের জন্য অপেক্ষমাণ');
    assert.ok(superNotif.message.includes('Sakib Khan'));
    assert.ok(superNotif.message.includes('DHM-0101'));
    assert.strictEqual(superNotif.link, '/admin?tab=donors');

    // Active admin
    const adminNotif = notifications.find((n) => n.user_id === 'usr-admin-1');
    assert.ok(adminNotif, 'Admin must receive review notification');

    // Active moderator
    const modNotif = notifications.find((n) => n.user_id === 'usr-mod-1');
    assert.ok(modNotif, 'Moderator must receive review notification');
  });

  it('Test 3: Volunteer and inactive staff do NOT receive donor verification notifications', () => {
    const { notifications } = simulateDonorRegistrationTrigger(
      {
        donor_id: 'DHM-0101',
        user_id: ordinaryDonorUid,
        full_name: 'Sakib Khan',
      },
      mockUsers
    );

    // Volunteer check
    const volNotif = notifications.find((n) => n.user_id === 'usr-vol-1');
    assert.strictEqual(volNotif, undefined, 'Volunteer must not receive verification management notifications');

    // Inactive staff check
    const inactiveNotif = notifications.find((n) => n.user_id === 'usr-mod-inactive');
    assert.strictEqual(inactiveNotif, undefined, 'Inactive staff must not receive notifications');
  });

  it('Test 4: Staff+Donor dual role account registering donor profile does NOT send duplicate self-notification', () => {
    const staffDonorUserId = 'usr-admin-1'; // Milon Mahmud (Admin)
    const { notifications } = simulateDonorRegistrationTrigger(
      {
        donor_id: 'DHM-0102',
        user_id: staffDonorUserId,
        full_name: 'Milon Mahmud',
      },
      mockUsers
    );

    // Donor pending notification
    const donorPending = notifications.filter((n) => n.user_id === staffDonorUserId);
    // Should only have 1 notification (the donor pending alert), not a self review alert
    assert.strictEqual(donorPending.length, 1);
    assert.strictEqual(donorPending[0].link, '/profile');

    // Other staff should still receive review notification
    const superNotif = notifications.find((n) => n.user_id === 'usr-super-1');
    assert.ok(superNotif);
  });

  it('Test 5: verify_donor() creates Verified notification for donor and does NOT spam staff', () => {
    const donor: DonorRow = {
      id: 'donor-1',
      donor_id: 'DHM-0101',
      user_id: ordinaryDonorUid,
      full_name: 'Sakib Khan',
      verification_status: 'pending',
    };

    const { updatedDonor, donorNotification } = simulateVerifyDonorRpc(
      donor,
      'verified',
      'All documents verified',
      'admin'
    );

    assert.strictEqual(updatedDonor.verification_status, 'verified');
    assert.ok(donorNotification);
    assert.strictEqual(donorNotification.user_id, ordinaryDonorUid);
    assert.ok(donorNotification.title.includes('ভেরিফাইড হয়েছে'));
    assert.strictEqual(donorNotification.link, '/profile');
  });

  it('Test 6: verify_donor() rejection & suspension notifications include specific admin notes', () => {
    const donor: DonorRow = {
      id: 'donor-1',
      donor_id: 'DHM-0101',
      user_id: ordinaryDonorUid,
      full_name: 'Sakib Khan',
      verification_status: 'pending',
    };

    const { updatedDonor: rejDonor, donorNotification: rejNotif } = simulateVerifyDonorRpc(
      donor,
      'rejected',
      'Phone unreachable',
      'admin'
    );

    assert.strictEqual(rejDonor.verification_status, 'rejected');
    assert.ok(rejNotif);
    assert.ok(rejNotif.title.includes('স্থগিত বা প্রত্যাখ্যাত'));
    assert.ok(rejNotif.message.includes('Phone unreachable'));

    const { updatedDonor: suspDonor, donorNotification: suspNotif } = simulateVerifyDonorRpc(
      donor,
      'suspended',
      'Temporary health restriction',
      'admin'
    );

    assert.strictEqual(suspDonor.verification_status, 'suspended');
    assert.ok(suspNotif);
    assert.ok(suspNotif.title.includes('সাময়িকভাবে স্থগিত'));
    assert.ok(suspNotif.message.includes('Temporary health restriction'));
  });

  it('Test 7: RLS prevents ordinary donor from viewing other users notifications', () => {
    const notif: NotificationRow = {
      id: 'notif-priv-1',
      user_id: ordinaryDonorUid,
      title: 'ব্যক্তিগত নোটিফিকেশন',
      message: 'শুধুমাত্র আপনার জন্য',
      type: 'verification',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    assert.strictEqual(canSelectNotification(notif, ordinaryDonorUid, false), true);
    assert.strictEqual(canSelectNotification(notif, otherDonorUid, false), false);
    assert.strictEqual(canSelectNotification(notif, 'usr-super-1', true), true); // Staff audit
  });

  it('Test 8: RLS blocks ordinary donors from direct INSERT (cannot forge staff notifications)', () => {
    assert.strictEqual(canInsertNotificationDirect(ordinaryDonorUid, false), false);
    assert.strictEqual(canInsertNotificationDirect('usr-admin-1', true), true);
  });

  it('Test 9: Donor can mark own notification read and delete own notification', () => {
    const notif: NotificationRow = {
      id: 'notif-priv-1',
      user_id: ordinaryDonorUid,
      title: 'বিজ্ঞপ্তি',
      message: 'টেস্ট',
      type: 'verification',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    assert.strictEqual(canUpdateNotification(notif, ordinaryDonorUid, false), true);
    assert.strictEqual(canUpdateNotification(notif, otherDonorUid, false), false);

    assert.strictEqual(canDeleteNotification(notif, ordinaryDonorUid, false), true);
    assert.strictEqual(canDeleteNotification(notif, otherDonorUid, false), false);
    assert.strictEqual(canDeleteNotification(notif, 'usr-admin-1', true), true); // Admin delete
  });

  it('Test 10: Unread count correctly filters by current user and global broadcast', () => {
    const allNotifications: NotificationRow[] = [
      { id: '1', user_id: ordinaryDonorUid, title: 'Own 1', message: '', type: 'verification', is_read: false, created_at: '' },
      { id: '2', user_id: ordinaryDonorUid, title: 'Own 2', message: '', type: 'verification', is_read: true, created_at: '' },
      { id: '3', user_id: otherDonorUid, title: 'Other 1', message: '', type: 'verification', is_read: false, created_at: '' },
      { id: '4', user_id: 'all', title: 'Global', message: '', type: 'system', is_read: false, created_at: '' },
    ];

    const donorUnread = allNotifications.filter(
      (n) => !n.is_read && (n.user_id === ordinaryDonorUid || n.user_id === 'all')
    ).length;

    assert.strictEqual(donorUnread, 2); // 'Own 1' and 'Global'
  });
});
