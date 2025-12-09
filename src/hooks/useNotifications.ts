import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_by: string | null;
  recipient_is_read?: boolean;
  recipient_read_at?: string | null;
  recipient_id?: string;
}

export interface NotificationRecipient {
  id: string;
  notification_id: string;
  team_member_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { teamMember } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Use ref to store latest fetchNotifications to avoid stale closure
  const fetchNotificationsRef = useRef<() => Promise<void>>();

  const fetchNotifications = useCallback(async () => {
    if (!teamMember) {
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Fetching notifications for team member:', teamMember.id);
      setLoading(true);
      setError(null);

      // Fetch notifications for the current user
      const { data: recipients, error: recipientsError } = await supabase
        .from('notification_recipients')
        .select(`
          id,
          notification_id,
          team_member_id,
          is_read,
          read_at,
          created_at,
          notifications (
            id,
            type,
            title,
            message,
            link,
            is_read,
            created_at,
            updated_at,
            related_entity_type,
            related_entity_id,
            created_by
          )
        `)
        .eq('team_member_id', teamMember.id)
        .order('created_at', { ascending: false });

      if (recipientsError) throw recipientsError;

      // Transform the data to include recipient-specific read status
      const transformedNotifications = recipients?.map(recipient => {
        const notification = recipient.notifications as any;
        return {
          ...notification,
          recipient_is_read: recipient.is_read,
          recipient_read_at: recipient.read_at,
          recipient_id: recipient.id
        };
      }) || [];

      console.log('📬 Fetched notifications:', transformedNotifications.length, 'total');
      setNotifications(transformedNotifications);
      
      // Calculate unread count
      const unread = transformedNotifications.filter(n => !n.recipient_is_read).length;
      console.log('🔔 Unread count:', unread);
      setUnreadCount(unread);

    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [teamMember]);
  
  // Update ref whenever fetchNotifications changes
  useEffect(() => {
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    if (!teamMember) return;

    try {
      const { error } = await supabase
        .from('notification_recipients')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('notification_id', notificationId)
        .eq('team_member_id', teamMember.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, recipient_is_read: true, recipient_read_at: new Date().toISOString() }
            : n
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  };

  const markAllAsRead = async () => {
    if (!teamMember) return;

    try {
      const { error } = await supabase
        .from('notification_recipients')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('team_member_id', teamMember.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          recipient_is_read: true,
          recipient_read_at: new Date().toISOString()
        }))
      );

      setUnreadCount(0);

    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  };

  const deleteNotification = async (notificationId: string) => {
    if (!teamMember) return;

    try {
      // Delete the recipient record (notification will remain for other recipients)
      const { error } = await supabase
        .from('notification_recipients')
        .delete()
        .eq('notification_id', notificationId)
        .eq('team_member_id', teamMember.id);

      if (error) throw error;

      // Update local state
      const wasUnread = notifications.find(n => n.id === notificationId)?.recipient_is_read === false;
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  };

  // Create a notification with recipients
  const createNotification = async (
    notification: {
      type: string;
      title: string;
      message: string;
      link?: string;
      related_entity_type?: string;
      related_entity_id?: string;
    },
    recipientIds: string[]
  ) => {
    if (!teamMember) return;

    try {
      // Create the notification
      const { data: newNotification, error: notificationError } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          created_by: teamMember.id
        })
        .select()
        .single();

      if (notificationError) throw notificationError;

      // Create recipient records
      const recipients = recipientIds.map(recipientId => ({
        notification_id: newNotification.id,
        team_member_id: recipientId
      }));

      const { error: recipientsError } = await supabase
        .from('notification_recipients')
        .insert(recipients);

      if (recipientsError) throw recipientsError;

      return newNotification;

    } catch (err) {
      console.error('Error creating notification:', err);
      throw err;
    }
  };

  // Subscribe to real-time updates - EXACT pattern from useThreads with ref fix
  useEffect(() => {
    fetchNotifications();

    console.log('🚀 [useNotifications] Setting up subscription');

    // Use the EXACT same pattern as threads - no filter, empty deps
    const notificationsSubscription = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_recipients'
        },
        (payload) => {
          console.log('🔔 [useNotifications] Change detected:', payload.eventType);
          console.log('🔄 [useNotifications] Calling fetchNotifications via ref...');
          // Call the latest version via ref to avoid stale closure
          if (fetchNotificationsRef.current) {
            fetchNotificationsRef.current();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 [useNotifications] Subscription status:', status);
      });

    return () => {
      if (notificationsSubscription) {
        console.log('🛑 [useNotifications] Cleaning up subscription');
        supabase.removeChannel(notificationsSubscription);
      }
    };
  }, []); // Empty dependency array - subscribe ONCE like threads

  return {
    notifications,
    loading,
    error,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification
  };
};

