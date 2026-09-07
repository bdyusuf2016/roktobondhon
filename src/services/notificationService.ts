import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { NotificationItem } from '../types';

function mapNotificationRow(row: any): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message,
    type: row.type || 'system',
    link: row.link || undefined,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Fetch notifications for a user (or broadcast 'all')
 */
export async function getUserNotificationsFromSupabase(userId: string): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('user_id', [userId, 'all'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications from Supabase:', error);
      return [];
    }

    return (data || []).map(mapNotificationRow);
  } catch (err) {
    console.error('Exception fetching notifications:', err);
    return [];
  }
}

/**
 * Send notification
 */
export async function sendNotificationToSupabase(
  notif: Omit<NotificationItem, 'id'>
): Promise<NotificationItem> {
  const id = `notif-${Date.now()}`;
  const item: NotificationItem = {
    ...notif,
    id,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('notifications').insert({
        id: item.id,
        user_id: item.userId,
        title: item.title,
        message: item.message,
        type: item.type,
        link: item.link || null,
        is_read: item.isRead,
        created_at: item.createdAt,
      });
    } catch (err) {
      console.error('Error inserting notification in Supabase:', err);
    }
  }

  return item;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsReadInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) {
    console.error('Error marking notification read in Supabase:', error);
  }
}

// Compatibility aliases
export const getUserNotificationsFromFirestore = getUserNotificationsFromSupabase;
export const sendNotificationToFirestore = sendNotificationToSupabase;
export const markNotificationAsReadInFirestore = markNotificationAsReadInSupabase;
