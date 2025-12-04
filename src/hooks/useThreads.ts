import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Thread {
  id: number;
  group_id: string;
  name: string | null;
  client_id: string | null;
  participants: string[];
  created_at: string;
  updated_at: string;
  last_read_at: string | null;
  latest_message?: {
    text: string;
    created_at: string;
    sender_name: string;
    sender_phone_number: string;
  };
}

export const useThreads = () => {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = async () => {
    try {
      // Don't clear existing data during refetch to prevent UI flicker
      setLoading(true);
      setError(null);

      // Get all threads
      const { data: threadsData, error: threadsError } = await supabase
        .from('threads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (threadsError) throw threadsError;

      // Only process if we got data
      if (threadsData) {
        // For each thread, get the latest message
        const threadsWithMessages = await Promise.all(
          threadsData.map(async (thread) => {
            const { data: messagesData, error: messagesError } = await supabase
              .from('messages')
              .select('*')
              .eq('thread_id', thread.id)
              .order('created_at', { ascending: false })
              .limit(1);

            if (messagesError) {
              console.error('Error fetching messages for thread:', thread.id, messagesError);
              return {
                ...thread,
                participants: thread.participants || [],
                latest_message: undefined
              };
            }

            const latestMessage = messagesData && messagesData.length > 0 ? messagesData[0] : null;

            return {
              ...thread,
              participants: thread.participants || [],
              latest_message: latestMessage
                ? {
                    text: latestMessage.text || latestMessage.speech_text || '',
                    created_at: latestMessage.created_at,
                    sender_name: latestMessage.sender_name,
                    sender_phone_number: latestMessage.sender_phone_number
                  }
                : undefined
            };
          })
        );

        setThreads(threadsWithMessages);
      }
    } catch (err: any) {
      console.error('Error fetching threads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getUnreadCount = useCallback(() => {
    return threads.filter(thread => {
      if (!thread.latest_message) return false;
      if (!thread.last_read_at) return true;
      
      try {
        const lastMessageTime = new Date(thread.latest_message.created_at);
        const lastReadTime = new Date(thread.last_read_at);
        
        return lastMessageTime > lastReadTime;
      } catch (error) {
        console.error('Error comparing dates for unread status:', error);
        return false;
      }
    }).length;
  }, [threads]);

  useEffect(() => {
    fetchThreads();

    // Set up real-time subscription for threads
    const threadsSubscription = supabase
      .channel('threads-unread-counter')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads'
        },
        () => {
          fetchThreads();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchThreads();
        }
      )
      .subscribe();

    return () => {
      if (threadsSubscription) {
        supabase.removeChannel(threadsSubscription);
      }
    };
  }, []);

  return {
    threads,
    loading,
    error,
    fetchThreads,
    getUnreadCount
  };
};