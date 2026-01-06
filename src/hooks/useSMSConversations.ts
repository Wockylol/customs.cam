import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { sendSMS } from '../lib/smsMessaging';

export interface SMSConversation {
  id: string;
  phone_number: string;
  client_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
  latest_message?: {
    body: string;
    direction: 'inbound' | 'outbound';
    created_at: string;
  } | null;
}

export interface SMSMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  twilio_sid: string | null;
  status: string;
  sent_by: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  sent_by_team_member?: {
    id: string;
    full_name: string;
  } | null;
}

export const useSMSConversations = () => {
  const [conversations, setConversations] = useState<SMSConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch conversations with client info
      const { data: convosData, error: convosError } = await supabase
        .from('sms_conversations')
        .select(`
          *,
          client:clients(id, username, avatar_url)
        `)
        .order('last_message_at', { ascending: false });

      if (convosError) throw convosError;

      if (convosData) {
        // For each conversation, get the latest message
        const convosWithMessages = await Promise.all(
          convosData.map(async (convo) => {
            const { data: messagesData } = await supabase
              .from('sms_messages')
              .select('body, direction, created_at')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: false })
              .limit(1);

            return {
              ...convo,
              latest_message: messagesData && messagesData.length > 0
                ? messagesData[0]
                : null,
            };
          })
        );

        setConversations(convosWithMessages);
      }
    } catch (err: any) {
      console.error('Error fetching SMS conversations:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('sms-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sms_conversations',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sms_messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
};

export const useSMSMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('sms_messages')
        .select(`
          *,
          sent_by_team_member:team_members!sms_messages_sent_by_fkey(id, full_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setMessages(data || []);
    } catch (err: any) {
      console.error('Error fetching SMS messages:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId) return;

    // Set up real-time subscription for this conversation's messages
    const subscription = supabase
      .channel(`sms-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sms_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [conversationId, fetchMessages]);

  const sendMessage = async (
    phoneNumber: string,
    content: string,
    sentBy?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setSending(true);
      await sendSMS({ phoneNumber, content, sentBy });
      // Message will appear via real-time subscription
      return { success: true };
    } catch (err: any) {
      console.error('Error sending SMS:', err);
      return { success: false, error: err.message };
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    refetch: fetchMessages,
  };
};

// Helper hook to get or create a conversation for a phone number
export const useGetOrCreateConversation = () => {
  const [loading, setLoading] = useState(false);

  const getOrCreateConversation = async (
    phoneNumber: string,
    clientId?: string
  ): Promise<{ conversationId: string | null; error?: string }> => {
    try {
      setLoading(true);

      // First, try to find existing conversation
      const { data: existing, error: findError } = await supabase
        .from('sms_conversations')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (existing) {
        return { conversationId: existing.id };
      }

      // Create new conversation
      const { data: newConvo, error: createError } = await supabase
        .from('sms_conversations')
        .insert({
          phone_number: phoneNumber,
          client_id: clientId || null,
        })
        .select('id')
        .single();

      if (createError) {
        // Handle race condition
        if (createError.code === '23505') {
          const { data: raceConvo } = await supabase
            .from('sms_conversations')
            .select('id')
            .eq('phone_number', phoneNumber)
            .single();

          if (raceConvo) {
            return { conversationId: raceConvo.id };
          }
        }
        throw createError;
      }

      return { conversationId: newConvo.id };
    } catch (err: any) {
      console.error('Error getting/creating conversation:', err);
      return { conversationId: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { getOrCreateConversation, loading };
};

