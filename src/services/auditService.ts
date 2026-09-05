import {
  doc,
  getDocs,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { AuditLog, UserRole } from '../types';

const AUDIT_COLLECTION = 'auditLogs';

/**
 * Record an immutable audit log entry in Firestore
 */
export async function recordAuditLog(
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Record<string, any>,
  user?: { id: string; name: string; role: UserRole }
): Promise<AuditLog> {
  const id = `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const log: AuditLog = {
    id,
    userId: user?.id || 'system',
    userName: user?.name || 'স্বয়ংক্রিয় সিস্টেম',
    userRole: user?.role || 'volunteer',
    action,
    targetType,
    targetId,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const ref = doc(db, AUDIT_COLLECTION, id);
      await setDoc(ref, {
        ...log,
        serverTimestamp: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Failed to record audit log in Firestore:', err);
    }
  }

  return log;
}

/**
 * Fetch latest audit logs (admin access)
 */
export async function getAuditLogsFromFirestore(limitCount: number = 100): Promise<AuditLog[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog));
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return [];
  }
}
