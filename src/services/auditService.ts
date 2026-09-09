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
 * Record an immutable audit log entry in Supabase / Local Storage
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
      const { error } = await supabase.rpc('record_audit_log', {
        p_action: action,
        p_target_type: targetType,
        p_target_id: targetId,
        p_metadata: metadata || {},
      });

      if (error) {
        console.warn('RPC record_audit_log error:', error.message);
      }
    } catch (err) {
      console.warn('Failed to record audit log via RPC:', err);
    }
  }

  return log;
}

/**
 * Fetch latest audit logs (admin access)
 */
export async function getAuditLogsFromSupabase(limitCount: number = 100): Promise<AuditLog[]> {
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

// Compatibility aliases
export const getAuditLogsFromFirestore = getAuditLogsFromSupabase;

/**
 * Filter audit logs by search query, target type, and user role
 */
export function filterAuditLogs(
  logs: AuditLog[],
  params: {
    searchTerm?: string;
    targetType?: string;
    userRole?: string;
    timeRangeDays?: number;
  }
): AuditLog[] {
  const { searchTerm = '', targetType = 'all', userRole = 'all', timeRangeDays } = params;

  return logs.filter((log) => {
    if (targetType !== 'all' && log.targetType.toLowerCase() !== targetType.toLowerCase()) {
      return false;
    }
    if (userRole !== 'all' && log.userRole !== userRole) {
      return false;
    }
    if (timeRangeDays && timeRangeDays > 0) {
      const logTime = new Date(log.timestamp).getTime();
      const cutoff = Date.now() - timeRangeDays * 24 * 60 * 60 * 1000;
      if (logTime < cutoff) return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchAction = log.action.toLowerCase().includes(q);
      const matchUser = log.userName.toLowerCase().includes(q) || log.userId.toLowerCase().includes(q);
      const matchTarget = log.targetId.toLowerCase().includes(q) || log.targetType.toLowerCase().includes(q);
      const matchMeta = log.metadata ? JSON.stringify(log.metadata).toLowerCase().includes(q) : false;
      return matchAction || matchUser || matchTarget || matchMeta;
    }
    return true;
  });
}

/**
 * Identify high-risk security governance events
 */
export function isSecurityCriticalEvent(log: AuditLog): boolean {
  const criticalKeywords = [
    'role',
    'permission',
    'security',
    'config',
    'settings',
    'delete',
    'suspend',
    'escalation',
    'backup',
    'restore',
    'পাসওয়ার্ড',
    'রোল',
    'মুছে',
    'স্থগিত',
  ];

  const actionLower = log.action.toLowerCase();
  const targetLower = log.targetType.toLowerCase();

  return criticalKeywords.some((kw) => actionLower.includes(kw) || targetLower.includes(kw));
}
