import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { AuditLog, UserRole } from '../types';

function mapAuditLogRow(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userRole: (row.user_role as UserRole) || 'volunteer',
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
    timestamp: row.timestamp || new Date().toISOString(),
  };
}

/**
 * Record an immutable audit log entry in Supabase
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

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('audit_logs').insert({
        id: log.id,
        user_id: log.userId,
        user_name: log.userName,
        user_role: log.userRole,
        action: log.action,
        target_type: log.targetType,
        target_id: log.targetId,
        metadata: log.metadata,
        timestamp: log.timestamp,
      });
    } catch (err) {
      console.warn('Failed to record audit log in Supabase:', err);
    }
  }

  return log;
}

/**
 * Fetch latest audit logs (admin access)
 */
export async function getAuditLogsFromFirestore(limitCount: number = 100): Promise<AuditLog[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limitCount);

    if (error) {
      console.error('Error fetching audit logs from Supabase:', error);
      return [];
    }

    return (data || []).map(mapAuditLogRow);
  } catch (err) {
    console.error('Exception fetching audit logs:', err);
    return [];
  }
}
