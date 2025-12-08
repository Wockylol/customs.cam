import { supabase } from './supabase';

/**
 * Configuration for thread notification batching
 */
const NOTIFICATION_WINDOW_MINUTES = 5; // Time window to batch messages
const MAX_MESSAGE_PREVIEW_LENGTH = 100;

/**
 * Get all admins to notify about new thread messages
 */
async function getAllAdmins() {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('role', 'admin')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching admins:', error);
    return [];
  }

  return data?.map(tm => tm.id) || [];
}

/**
 * Check if there's a recent unread notification for this thread
 * within the notification window
 */
async function getRecentThreadNotification(threadId: string) {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - NOTIFICATION_WINDOW_MINUTES);

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id,
      created_at,
      notification_recipients (
        id,
        is_read,
        team_member_id
      )
    `)
    .eq('type', 'thread_message')
    .eq('related_entity_type', 'thread')
    .eq('related_entity_id', threadId)
    .gte('created_at', windowStart.toISOString())
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error checking recent notifications:', error);
    return null;
  }

  // Return the notification if it has at least one unread recipient
  if (data && data.length > 0) {
    const notification = data[0];
    const hasUnread = (notification.notification_recipients as any[])?.some(
      (nr: any) => !nr.is_read
    );
    
    if (hasUnread) {
      return notification;
    }
  }

  return null;
}

/**
 * Get the count of new messages in a thread since the last notification
 */
async function getNewMessageCount(threadId: string, sinceDate: Date): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('thread_id', threadId)
    .gte('created_at', sinceDate.toISOString());

  if (error) {
    console.error('Error counting new messages:', error);
    return 1; // Default to 1 if error
  }

  return count || 1;
}

/**
 * Update an existing notification with new message count
 */
async function updateExistingNotification(
  notificationId: string,
  threadName: string,
  messageCount: number,
  latestMessagePreview: string
) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        title: `${messageCount} New Messages in ${threadName}`,
        message: `Latest: "${latestMessagePreview}"`,
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;

    console.log(`Updated thread notification with ${messageCount} messages`);
  } catch (error) {
    console.error('Error updating thread notification:', error);
  }
}

/**
 * Create a new thread message notification
 */
async function createNewThreadNotification(
  threadId: string,
  threadName: string,
  messageText: string,
  messageCount: number,
  adminIds: string[]
) {
  try {
    if (adminIds.length === 0) {
      console.log('No admins to notify');
      return;
    }

    const messagePreview = messageText.substring(0, MAX_MESSAGE_PREVIEW_LENGTH);
    const truncated = messageText.length > MAX_MESSAGE_PREVIEW_LENGTH;

    const title = messageCount > 1 
      ? `${messageCount} New Messages in ${threadName}`
      : `New Message in ${threadName}`;

    const message = messageCount > 1
      ? `Latest: "${messagePreview}${truncated ? '...' : ''}"`
      : `"${messagePreview}${truncated ? '...' : ''}"`;

    // Create the notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'thread_message',
        title,
        message,
        link: '/chats',
        related_entity_type: 'thread',
        related_entity_id: threadId,
        created_by: null // System generated
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    // Create recipient records
    const recipientRecords = adminIds.map(adminId => ({
      notification_id: notification.id,
      team_member_id: adminId
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    console.log(`Created new thread notification for ${adminIds.length} admins`);
  } catch (error) {
    console.error('Error creating thread notification:', error);
  }
}

/**
 * Main function to handle thread message notifications with smart batching
 * Call this whenever a new message is added to a thread
 */
export async function notifyThreadMessage(
  threadId: string,
  threadName: string,
  messageText: string
) {
  try {
    // Get admins to notify
    const adminIds = await getAllAdmins();
    
    if (adminIds.length === 0) {
      console.log('No admins to notify about thread message');
      return;
    }

    // Check for recent unread notifications for this thread
    const recentNotification = await getRecentThreadNotification(threadId);

    if (recentNotification) {
      // Update existing notification
      const notificationDate = new Date(recentNotification.created_at);
      const messageCount = await getNewMessageCount(threadId, notificationDate);
      
      await updateExistingNotification(
        recentNotification.id,
        threadName,
        messageCount,
        messageText
      );
    } else {
      // Create new notification
      await createNewThreadNotification(
        threadId,
        threadName,
        messageText,
        1,
        adminIds
      );
    }
  } catch (error) {
    console.error('Error in notifyThreadMessage:', error);
  }
}

/**
 * Manually trigger a notification for a thread with multiple unread messages
 * Useful for batch processing or initial setup
 */
export async function notifyThreadBatch(
  threadId: string,
  threadName: string,
  unreadCount: number,
  latestMessageText: string
) {
  try {
    const adminIds = await getAllAdmins();
    
    if (adminIds.length === 0) {
      console.log('No admins to notify');
      return;
    }

    await createNewThreadNotification(
      threadId,
      threadName,
      latestMessageText,
      unreadCount,
      adminIds
    );
  } catch (error) {
    console.error('Error in notifyThreadBatch:', error);
  }
}

