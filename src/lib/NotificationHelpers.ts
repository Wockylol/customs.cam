import { supabase } from './supabase';

/**
 * Get all team member IDs with a specific role
 */
async function getTeamMembersByRole(role: 'admin' | 'manager' | 'chatter') {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .eq('role', role)
    .eq('is_active', true);

  if (error) {
    console.error(`Error fetching team members with role ${role}:`, error);
    return [];
  }

  return data?.map(tm => tm.id) || [];
}

/**
 * Get all admins and managers
 */
async function getAllAdminsAndManagers() {
  const { data, error } = await supabase
    .from('team_members')
    .select('id')
    .in('role', ['admin', 'manager'])
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching admins and managers:', error);
    return [];
  }

  return data?.map(tm => tm.id) || [];
}

/**
 * Get chatters assigned to a specific client
 */
async function getChattersAssignedToClient(clientId: string) {
  const { data, error } = await supabase
    .from('chatter_assignments')
    .select('chatter_id')
    .eq('client_id', clientId)
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching chatters for client:', error);
    return [];
  }

  // Remove duplicates
  return Array.from(new Set(data?.map(a => a.chatter_id) || []));
}

/**
 * Create a notification for when a client note is added
 * Sends to: assigned chatters + all admins/managers
 */
export async function createClientNoteNotification(
  clientId: string,
  clientUsername: string,
  noteContent: string,
  createdByTeamMemberId: string
) {
  try {
    // Get assigned chatters
    const assignedChatters = await getChattersAssignedToClient(clientId);
    
    // Get all admins and managers
    const adminsAndManagers = await getAllAdminsAndManagers();
    
    // Combine and remove duplicates (and exclude the creator)
    const recipients = Array.from(new Set([...assignedChatters, ...adminsAndManagers]))
      .filter(id => id !== createdByTeamMemberId);

    if (recipients.length === 0) {
      console.log('No recipients for client note notification');
      return;
    }

    // Create the notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'client_note',
        title: 'New Client Note',
        message: `A new note was added to ${clientUsername}: "${noteContent.substring(0, 100)}${noteContent.length > 100 ? '...' : ''}"`,
        link: `/client-profile/${clientId}`,
        related_entity_type: 'client',
        related_entity_id: clientId,
        created_by: createdByTeamMemberId
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    // Create recipient records
    const recipientRecords = recipients.map(recipientId => ({
      notification_id: notification.id,
      team_member_id: recipientId
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    console.log(`Created client note notification for ${recipients.length} recipients`);
  } catch (error) {
    console.error('Error creating client note notification:', error);
  }
}

/**
 * Create a notification for custom request status changes
 * Sends to: assigned team member + all admins/managers
 */
export async function createCustomRequestNotification(
  customRequestId: string,
  clientUsername: string,
  status: string,
  assignedToId: string | null,
  createdByTeamMemberId: string
) {
  try {
    const adminsAndManagers = await getAllAdminsAndManagers();
    
    // Include assigned team member if exists
    const recipients = assignedToId 
      ? Array.from(new Set([assignedToId, ...adminsAndManagers]))
      : adminsAndManagers;
    
    // Remove the creator from recipients
    const filteredRecipients = recipients.filter(id => id !== createdByTeamMemberId);

    if (filteredRecipients.length === 0) {
      console.log('No recipients for custom request notification');
      return;
    }

    const statusMessages: Record<string, string> = {
      'pending_team_approval': 'A new custom request needs team approval',
      'pending_client_approval': 'A custom request is pending client approval',
      'in_progress': 'A custom request is now in progress',
      'completed': 'A custom request has been completed',
      'delivered': 'A custom request has been delivered',
      'cancelled': 'A custom request has been cancelled'
    };

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'custom_request',
        title: 'Custom Request Update',
        message: `${clientUsername}: ${statusMessages[status] || 'Custom request status changed'}`,
        link: `/clients/${clientUsername}`,
        related_entity_type: 'custom_request',
        related_entity_id: customRequestId,
        created_by: createdByTeamMemberId
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    const recipientRecords = filteredRecipients.map(recipientId => ({
      notification_id: notification.id,
      team_member_id: recipientId
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    console.log(`Created custom request notification for ${filteredRecipients.length} recipients`);
  } catch (error) {
    console.error('Error creating custom request notification:', error);
  }
}

/**
 * Create a notification for new assignments
 * Sends to: the assigned team member + all admins/managers
 */
export async function createAssignmentNotification(
  assignmentType: 'client' | 'scene' | 'platform',
  entityName: string,
  assignedToId: string,
  createdByTeamMemberId: string
) {
  try {
    const adminsAndManagers = await getAllAdminsAndManagers();
    const recipients = Array.from(new Set([assignedToId, ...adminsAndManagers]))
      .filter(id => id !== createdByTeamMemberId);

    if (recipients.length === 0) {
      console.log('No recipients for assignment notification');
      return;
    }

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'assignment',
        title: 'New Assignment',
        message: `You have been assigned to ${entityName}`,
        link: assignmentType === 'client' ? `/client-profile/${entityName}` : '/assignments',
        related_entity_type: assignmentType,
        related_entity_id: entityName,
        created_by: createdByTeamMemberId
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    const recipientRecords = recipients.map(recipientId => ({
      notification_id: notification.id,
      team_member_id: recipientId
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    console.log(`Created assignment notification for ${recipients.length} recipients`);
  } catch (error) {
    console.error('Error creating assignment notification:', error);
  }
}

/**
 * Create a notification for sales approval requests
 * Sends to: all admins and managers
 */
export async function createSaleApprovalNotification(
  saleId: string,
  chatterName: string,
  amount: number,
  createdByTeamMemberId: string
) {
  try {
    const adminsAndManagers = await getAllAdminsAndManagers();
    const recipients = adminsAndManagers.filter(id => id !== createdByTeamMemberId);

    if (recipients.length === 0) {
      console.log('No recipients for sale approval notification');
      return;
    }

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'approval_needed',
        title: 'Sale Approval Needed',
        message: `${chatterName} submitted a sale for $${amount.toFixed(2)} - approval needed`,
        link: '/sales-management/pending',
        related_entity_type: 'sale',
        related_entity_id: saleId,
        created_by: createdByTeamMemberId
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    const recipientRecords = recipients.map(recipientId => ({
      notification_id: notification.id,
      team_member_id: recipientId
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    console.log(`Created sale approval notification for ${recipients.length} recipients`);
  } catch (error) {
    console.error('Error creating sale approval notification:', error);
  }
}

/**
 * Create a notification for user approval requests
 * Sends to: all admins and managers
 */
export async function createUserApprovalNotification(
  userName: string,
  userEmail: string
) {
  try {
    const adminsAndManagers = await getAllAdminsAndManagers();

    if (adminsAndManagers.length === 0) {
      console.log('No recipients for user approval notification');
      return;
    }

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type: 'approval_needed',
        title: 'New User Approval Needed',
        message: `${userName} (${userEmail}) has signed up and needs approval`,
        link: '/user-approvals',
        related_entity_type: 'user',
        related_entity_id: null
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    const recipientRecords = adminsAndManagers.map(recipientId => ({
      notification_id: notification.id,
      team_member_id: recipientId
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    console.log(`Created user approval notification for ${adminsAndManagers.length} recipients`);
  } catch (error) {
    console.error('Error creating user approval notification:', error);
  }
}

/**
 * Create a generic notification for specific recipients
 */
export async function createGenericNotification(
  type: string,
  title: string,
  message: string,
  recipientIds: string[],
  link?: string,
  createdByTeamMemberId?: string
) {
  try {
    if (recipientIds.length === 0) {
      console.log('No recipients for generic notification');
      return;
    }

    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        type,
        title,
        message,
        link: link || null,
        created_by: createdByTeamMemberId || null
      })
      .select()
      .single();

    if (notificationError) throw notificationError;

    const recipientRecords = recipientIds.map(recipientId => ({
      notification_id: notification.id,
      team_member_id: recipientId
    }));

    const { error: recipientsError } = await supabase
      .from('notification_recipients')
      .insert(recipientRecords);

    if (recipientsError) throw recipientsError;

    console.log(`Created generic notification for ${recipientIds.length} recipients`);
  } catch (error) {
    console.error('Error creating generic notification:', error);
  }
}

