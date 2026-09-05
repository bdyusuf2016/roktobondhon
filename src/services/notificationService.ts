import {
  doc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { NotificationItem } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Fetch notifications for a user (or broadcast 'all')
 */
export async function getUserNotificationsFromFirestore(userId: string): Promise<NotificationItem[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q1 = query(collection(db, NOTIFICATIONS_COLLECTION), where('userId', '==', userId));
    const q2 = query(collection(db, NOTIFICATIONS_COLLECTION), where('userId', '==', 'all'));

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const map = new Map<string, NotificationItem>();

    snap1.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as NotificationItem));
    snap2.docs.forEach((d) => map.set(d.id, { id: d.id, ...d.data() } as NotificationItem));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return [];
  }
}

/**
 * Send notification
 */
export async function sendNotificationToFirestore(
  notif: Omit<NotificationItem, 'id'>
): Promise<NotificationItem> {
  const id = `notif-${Date.now()}`;
  const item: NotificationItem = {
    ...notif,
    id,
  };

  if (isFirebaseConfigured && db) {
    const ref = doc(db, NOTIFICATIONS_COLLECTION, id);
    await setDoc(ref, {
      ...item,
      serverCreatedAt: serverTimestamp(),
    });
  }

  return item;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsReadInFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, NOTIFICATIONS_COLLECTION, id);
  await updateDoc(ref, {
    isRead: true,
    serverUpdatedAt: serverTimestamp(),
  });
}
