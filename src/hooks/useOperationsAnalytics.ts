import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface ThreadWithLatestMessage {
  id: number;
  group_id: string;
  name: string | null;
  client_id: string | null;
  participants: string[];
  created_at: string;
  updated_at: string;
  tenant_id?: string;
  latest_message?: {
    id: number;
    text: string | null;
    speech_text: string | null;
    direction: 'inbound' | 'outbound';
    sender_name: string | null;
    sender_phone_number: string | null;
    created_at: string;
  } | null;
}

export interface InactiveThread extends ThreadWithLatestMessage {
  days_inactive: number;
  inactivity_tier: 'warning' | 'attention' | 'critical';
}

export interface DailySummary {
  date: string;
  summary: string;
  action_items: string[];
  noteworthy: string[];
  message_count: number;
  loading: boolean;
  error: string | null;
}

export interface OperationsStats {
  total_threads: number;
  unanswered_count: number;
  inactive_7_days: number;
  inactive_14_days: number;
  inactive_30_days: number;
  messages_today: number;
  messages_yesterday: number;
}

const INACTIVITY_THRESHOLDS = {
  warning: 7,    // 7 days - yellow
  attention: 14, // 14 days - orange
  critical: 30,  // 30+ days - red
};

export const useOperationsAnalytics = () => {
  const { teamMember } = useAuth();
  const [threads, setThreads] = useState<ThreadWithLatestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Fetch all threads with their latest messages
  const fetchThreads = useCallback(async () => {
    if (!teamMember?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch threads with latest message using the optimized RPC function
      const { data: threadsData, error: threadsError } = await supabase
        .rpc('get_threads_with_latest_messages');

      if (threadsError) {
        console.error('Error fetching threads:', threadsError);
        throw threadsError;
      }

      // Transform the data to match our interface
      const transformedThreads: ThreadWithLatestMessage[] = (threadsData || []).map((t: any) => ({
        id: t.thread_id,
        group_id: t.group_id,
        name: t.thread_name,
        client_id: t.client_id,
        participants: [],
        created_at: t.thread_created_at,
        updated_at: t.thread_updated_at,
        tenant_id: teamMember.tenant_id,
        latest_message: t.latest_message_created_at ? {
          id: 0,
          text: t.latest_message_text,
          speech_text: t.latest_message_speech_text,
          direction: 'inbound' as const, // We'll need to fetch this separately
          sender_name: t.latest_message_sender_name,
          sender_phone_number: t.latest_message_sender_phone,
          created_at: t.latest_message_created_at,
        } : null,
      }));

      // For each thread, get the direction of the latest message
      const threadsWithDirection = await Promise.all(
        transformedThreads.map(async (thread) => {
          if (!thread.latest_message) return thread;

          const { data: latestMsg } = await supabase
            .from('messages')
            .select('id, direction')
            .eq('thread_id', thread.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (latestMsg && thread.latest_message) {
            thread.latest_message.id = latestMsg.id;
            thread.latest_message.direction = latestMsg.direction as 'inbound' | 'outbound';
          }

          return thread;
        })
      );

      setThreads(threadsWithDirection);
    } catch (err: any) {
      console.error('Error in fetchThreads:', err);
      setError(err.message || 'Failed to fetch threads');
    } finally {
      setLoading(false);
    }
  }, [teamMember?.tenant_id]);

  // Initial fetch
  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Unanswered threads - where last message is inbound (client sent last)
  const unansweredThreads = useMemo(() => {
    return threads.filter(
      (thread) =>
        thread.latest_message &&
        thread.latest_message.direction === 'inbound'
    ).sort((a, b) => {
      // Sort by oldest first (longest waiting)
      const aTime = a.latest_message?.created_at || a.updated_at;
      const bTime = b.latest_message?.created_at || b.updated_at;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });
  }, [threads]);

  // Calculate inactive threads with tiers
  const inactiveThreads = useMemo((): InactiveThread[] => {
    const now = new Date();
    const warningThreshold = new Date(now.getTime() - INACTIVITY_THRESHOLDS.warning * 24 * 60 * 60 * 1000);

    return threads
      .filter((thread) => {
        const lastActivity = thread.latest_message?.created_at || thread.updated_at;
        return new Date(lastActivity) < warningThreshold;
      })
      .map((thread) => {
        const lastActivity = thread.latest_message?.created_at || thread.updated_at;
        const daysInactive = Math.floor(
          (now.getTime() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000)
        );

        let tier: 'warning' | 'attention' | 'critical' = 'warning';
        if (daysInactive >= INACTIVITY_THRESHOLDS.critical) {
          tier = 'critical';
        } else if (daysInactive >= INACTIVITY_THRESHOLDS.attention) {
          tier = 'attention';
        }

        return {
          ...thread,
          days_inactive: daysInactive,
          inactivity_tier: tier,
        };
      })
      .sort((a, b) => b.days_inactive - a.days_inactive);
  }, [threads]);

  // Calculate stats
  const stats = useMemo((): OperationsStats => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    return {
      total_threads: threads.length,
      unanswered_count: unansweredThreads.length,
      inactive_7_days: inactiveThreads.filter(t => t.days_inactive >= 7 && t.days_inactive < 14).length,
      inactive_14_days: inactiveThreads.filter(t => t.days_inactive >= 14 && t.days_inactive < 30).length,
      inactive_30_days: inactiveThreads.filter(t => t.days_inactive >= 30).length,
      messages_today: 0, // Will be calculated in generateDailySummary
      messages_yesterday: 0,
    };
  }, [threads, unansweredThreads, inactiveThreads]);

  // Generate AI daily summary
  const generateDailySummary = useCallback(async (forceRefresh = false) => {
    if (!teamMember?.tenant_id) return;

    // Check cache first
    const cacheKey = `ops_summary_${teamMember.tenant_id}_${new Date().toDateString()}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached && !forceRefresh) {
      setDailySummary(JSON.parse(cached));
      return;
    }

    setGeneratingSummary(true);
    setDailySummary({
      date: new Date().toISOString(),
      summary: '',
      action_items: [],
      noteworthy: [],
      message_count: 0,
      loading: true,
      error: null,
    });

    try {
      // Get yesterday's date range
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

      // Fetch inbound messages from yesterday
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          text,
          speech_text,
          direction,
          sender_name,
          created_at,
          thread_id,
          threads!inner(name, client_id)
        `)
        .eq('direction', 'inbound')
        .gte('created_at', yesterdayStart.toISOString())
        .lt('created_at', todayStart.toISOString())
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      if (!messages || messages.length === 0) {
        const emptySummary: DailySummary = {
          date: yesterdayStart.toISOString(),
          summary: 'No inbound messages were received yesterday.',
          action_items: [],
          noteworthy: [],
          message_count: 0,
          loading: false,
          error: null,
        };
        setDailySummary(emptySummary);
        sessionStorage.setItem(cacheKey, JSON.stringify(emptySummary));
        return;
      }

      // Format messages for AI
      const messagesText = messages
        .map((m: any) => {
          const threadName = m.threads?.name || 'Unknown Thread';
          const content = m.text || m.speech_text || '[No text]';
          return `[${threadName}] ${m.sender_name || 'Unknown'}: ${content}`;
        })
        .join('\n');

      // Call Grok API
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/grok-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            {
              role: 'system',
              content: `You are an operations analyst reviewing client messages for an OnlyFans management agency. Your task is to summarize yesterday's inbound messages and extract actionable insights.

Analyze the messages and provide:
1. A brief overall summary (2-3 sentences)
2. Action items that need follow-up (specific, actionable tasks)
3. Noteworthy items (important information, client concerns, opportunities)

Format your response as JSON:
{
  "summary": "Brief overview of yesterday's communications",
  "action_items": ["Action 1", "Action 2"],
  "noteworthy": ["Notable item 1", "Notable item 2"]
}

Focus on client retention, relationship building, and operational efficiency. Flag any urgent or time-sensitive items.`,
            },
            {
              role: 'user',
              content: `Here are yesterday's inbound messages (${messages.length} total):\n\n${messagesText}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI summary');
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content;

      // Parse AI response
      let parsed = { summary: '', action_items: [], noteworthy: [] };
      try {
        // Try to extract JSON from the response
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.error('Failed to parse AI response:', parseErr);
        parsed.summary = aiContent || 'Unable to generate summary';
      }

      const summaryResult: DailySummary = {
        date: yesterdayStart.toISOString(),
        summary: parsed.summary || 'Summary unavailable',
        action_items: parsed.action_items || [],
        noteworthy: parsed.noteworthy || [],
        message_count: messages.length,
        loading: false,
        error: null,
      };

      setDailySummary(summaryResult);
      sessionStorage.setItem(cacheKey, JSON.stringify(summaryResult));
    } catch (err: any) {
      console.error('Error generating daily summary:', err);
      setDailySummary({
        date: new Date().toISOString(),
        summary: '',
        action_items: [],
        noteworthy: [],
        message_count: 0,
        loading: false,
        error: err.message || 'Failed to generate summary',
      });
    } finally {
      setGeneratingSummary(false);
    }
  }, [teamMember?.tenant_id]);

  // Calculate time since last message
  const getTimeSinceLastMessage = useCallback((thread: ThreadWithLatestMessage): string => {
    const lastActivity = thread.latest_message?.created_at || thread.updated_at;
    const now = new Date();
    const diff = now.getTime() - new Date(lastActivity).getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }, []);

  return {
    // Data
    threads,
    unansweredThreads,
    inactiveThreads,
    stats,
    dailySummary,

    // State
    loading,
    error,
    generatingSummary,

    // Actions
    refetch: fetchThreads,
    generateDailySummary,
    getTimeSinceLastMessage,

    // Constants
    INACTIVITY_THRESHOLDS,
  };
};

