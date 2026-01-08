import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { ThreadList } from '../components/chats/ThreadList';
import { MessageView } from '../components/chats/MessageView';
import { ThreadNotes } from '../components/chats/ThreadNotes';
import { ThreadSettings } from '../components/chats/ThreadSettings';
import { ManagementView } from '../components/chats/ManagementView';
import SoundNotifier from '../components/chats/SoundNotifier';

interface Thread {
  id: number;
  group_id: string;
  name: string | null;
  client_id: string | null;
  participants: string[];
  created_at: string;
  updated_at: string;
  latest_message?: {
    text: string;
    created_at: string;
    sender_name: string;
    sender_phone_number: string;
  };
  last_read_at?: string;
}

interface ThreadNote {
  id: string;
  thread_id: number;
  content: string;
  source_message: string;
  message_id?: string;
  created_at: string;
}

interface Message {
  id: number;
  message_id: string;
  thread_id: number;
  message_type: string;
  direction: string;
  text: string | null;
  sender_phone_number: string;
  sender_name: string;
  reaction?: string;
  reaction_event?: string;
  speech_text?: string;
  speech_metadata?: any;
  created_at: string;
  sent_by_team_member_id?: string;
  sent_by_team_member?: {
    full_name: string;
  };
  attachments?: {
    id: number;
    url: string;
  }[];
}

interface Contact {
  id: number;
  phone_number: string;
  name: string | null;
}

interface Model {
  id: string;
  username: string;
}

const MESSAGES_PAGE_SIZE = 50;
const THREADS_PAGE_SIZE = 100;

// Phone normalization helpers
const normalizeToDigits = (phone: string) => phone.replace(/\D/g, '');
const last10 = (phone: string) => normalizeToDigits(phone).slice(-10);
const variantsFor = (phone: string) => {
  const d10 = last10(phone);
  return [
    phone,
    d10,
    `+1${d10}`,
    `1${d10}`
  ];
};

export function ClientChatsPage() {
  const { teamMember } = useAuth();
  const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [showManagement, setShowManagement] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [threadNotes, setThreadNotes] = useState<ThreadNote[]>([]);
  const [evaluatingNotes, setEvaluatingNotes] = useState(false);
  const [scrollToBottom, setScrollToBottom] = useState(true);
  const [contactMap, setContactMap] = useState<Record<string, string>>({});
  const [editingContact, setEditingContact] = useState<{ phone: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageSubscription, setMessageSubscription] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const [threadSubscription, setThreadSubscription] = useState<ReturnType<typeof supabase.channel> | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [lightboxLoading, setLightboxLoading] = useState(false);
  const [messagesPage, setMessagesPage] = useState(0);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [threadsPage, setThreadsPage] = useState(0);
  const [hasMoreThreads, setHasMoreThreads] = useState(true);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState<{
    current: number;
    total: number;
    processed: number;
    notesCreated: number;
  } | null>(null);
  const [hasProcessedUrlParam, setHasProcessedUrlParam] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    // Get sound preference from localStorage, default to true
    const saved = localStorage.getItem('chatSoundEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [triggerSound, setTriggerSound] = useState(false);
  
  // Message search state
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [messageSearchResults, setMessageSearchResults] = useState<Message[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResultsLoaded, setSearchResultsLoaded] = useState(false);
  
  // Image upload state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // AbortController refs for query cancellation
  const threadsAbortController = useRef<AbortController | null>(null);
  const messagesAbortController = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchThreads();
    fetchContacts();
  }, []);

  // Handle thread URL parameter
  useEffect(() => {
    const threadParam = searchParams.get('thread');
    if (threadParam && threads.length > 0 && !hasProcessedUrlParam) {
      const threadId = parseInt(threadParam);
      const targetThread = threads.find((t: Thread) => t.id === threadId);
      if (targetThread) {
        console.log('Auto-selecting thread from URL parameter:', threadId);
        setSelectedThread(targetThread);
        markThreadAsRead(threadId);
        setShowManagement(false);
        setHasProcessedUrlParam(true);
      }
    }
  }, [searchParams, threads, hasProcessedUrlParam]);

  // Reset URL param processing when search params change
  useEffect(() => {
    setHasProcessedUrlParam(false);
  }, [searchParams]);
  // Use optimizedThread for prefetching messages and contacts
  useEffect(() => {
    if (selectedThread) {
      fetchMessages(selectedThread.id);
      fetchThreadNotes(selectedThread.id);
    }
  }, [selectedThread]);

  // Auto-scroll to bottom when messages change or a new message is added
  useEffect(() => {
    if (scrollToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, scrollToBottom]);

  // Mark thread as read in database
  const markThreadAsRead = (threadId: number) => {
    console.log('Marking thread as read:', threadId);
    
    // Call the database function to mark as read
    supabase.rpc('mark_thread_as_read', { thread_id_param: threadId })
      .then(({ error }: { error: any }) => {
        if (error) {
          console.error('Error marking thread as read:', error);
        } else {
          console.log('Thread marked as read successfully');
          // Update local state immediately for instant UI feedback
          const now = new Date().toISOString();
          setThreads((prev: Thread[]) => 
            prev.map((thread: Thread) => 
              thread.id === threadId 
                ? { ...thread, last_read_at: now }
                : thread
            )
          );
        }
      });
  };

  // Set up thread subscription when component mounts
  useEffect(() => {
    const threadsSubscription = supabase
      .channel('threads-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'threads'
        },
        (payload: any) => {
          console.log('Thread change detected:', payload);
          fetchThreads();
        }
      )
      .subscribe();

    console.log('Thread subscription set up');
    setThreadSubscription(threadsSubscription);

    // Cleanup subscription on unmount
    return () => {
      if (threadsSubscription) {
        console.log('Cleaning up thread subscription');
        supabase.removeChannel(threadsSubscription);
      }
    };
  }, []);

  // Set up message subscription when thread is selected
  useEffect(() => {
    if (!selectedThread) {
      if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
      }
      return;
    }

    const messagesSubscription = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${selectedThread.id}`
        },
        (payload: any) => {
          console.log('Message change detected:', payload);
          setScrollToBottom(true);
          if ((payload as any).new) {
            const newMessage = (payload as any).new as Message;
            // Dedupe and attach empty attachments array for consistency
            setMessages((prev: Message[]) => {
              // Skip if message already exists
              if (prev.some((m: Message) => m.message_id === newMessage.message_id)) return prev;
              
              // If this is an outbound message, check for and replace optimistic message
              if (newMessage.direction === 'outbound') {
                const optimisticIndex = prev.findIndex((m: Message) => 
                  m.message_id.startsWith('temp-') && 
                  m.text === newMessage.text &&
                  m.thread_id === newMessage.thread_id
                );
                
                if (optimisticIndex !== -1) {
                  // Replace optimistic message with real one
                  const updated = [...prev];
                  updated[optimisticIndex] = { ...newMessage, attachments: [] };
                  return updated;
                }
              }
              
              return [...prev, { ...newMessage, attachments: [] }];
            });
            // Update thread preview and updated_at so the list re-sorts
            setThreads((prev: Thread[]) =>
              prev.map((t: Thread) =>
                t.id === newMessage.thread_id
                  ? {
                      ...t,
                      latest_message: {
                        text: newMessage.text || newMessage.speech_text || '',
                        created_at: newMessage.created_at,
                        sender_name: newMessage.sender_name,
                        sender_phone_number: newMessage.sender_phone_number
                      },
                      updated_at: newMessage.created_at
                    }
                  : t
              )
            );
          }
        }
      )
      .subscribe();

    console.log('Message subscription set up for thread:', selectedThread.id);
    setMessageSubscription(messagesSubscription);

    // Cleanup subscription when thread changes or component unmounts
    return () => {
      if (messagesSubscription) {
        console.log('Cleaning up message subscription');
        supabase.removeChannel(messagesSubscription);
      }
    };
  }, [selectedThread]);

  // Global subscription to live-update thread list and open thread on any new message
  useEffect(() => {
    const channel = supabase
      .channel('messages-global-insert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload: any) => {
          const newMessage = (payload as any).new as Message;

          // Trigger sound notification for new inbound messages (from clients)
          if (newMessage.direction === 'inbound' && soundEnabled) {
            console.log('🔔 New inbound message detected, triggering sound...');
            setTriggerSound(true);
          }

          // Update thread previews and reorder list chronologically
          setThreads((prev: Thread[]) =>
            prev.map((t: Thread) =>
              t.id === newMessage.thread_id
                ? {
                    ...t,
                    latest_message: {
                      text: newMessage.text || newMessage.speech_text || '',
                      created_at: newMessage.created_at,
                      sender_name: newMessage.sender_name,
                      sender_phone_number: newMessage.sender_phone_number
                    },
                    updated_at: newMessage.created_at
                  }
                : t
            ).sort((a, b) => {
              // Sort by most recent activity (latest message or updated_at)
              const aDate = a.latest_message?.created_at || a.updated_at;
              const bDate = b.latest_message?.created_at || b.updated_at;
              return new Date(bDate).getTime() - new Date(aDate).getTime();
            })
          );

          // If the message belongs to the currently open thread, append it (deduped)
          if (selectedThread && newMessage.thread_id === selectedThread.id) {
            setScrollToBottom(true);
            setMessages((prev: Message[]) => {
              // Skip if message already exists
              if (prev.some((m: Message) => m.message_id === newMessage.message_id)) return prev;
              
              // If this is an outbound message, check for and replace optimistic message
              if (newMessage.direction === 'outbound') {
                const optimisticIndex = prev.findIndex((m: Message) => 
                  m.message_id.startsWith('temp-') && 
                  m.text === newMessage.text &&
                  m.thread_id === newMessage.thread_id
                );
                
                if (optimisticIndex !== -1) {
                  // Replace optimistic message with real one
                  const updated = [...prev];
                  updated[optimisticIndex] = { ...newMessage, attachments: [] };
                  return updated;
                }
              }
              
              return [...prev, { ...newMessage, attachments: [] }];
            });
          }
        }
      )
      .subscribe();

    console.log('Global messages INSERT subscription set up');

    return () => {
      if (channel) {
        console.log('Cleaning up global messages subscription');
        supabase.removeChannel(channel);
      }
    };
  }, [selectedThread, soundEnabled]);

  // Save sound preference to localStorage
  useEffect(() => {
    localStorage.setItem('chatSoundEnabled', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
  };

  const handleSoundPlayed = () => {
    setTriggerSound(false);
  };

  // Fetch models when details modal opens
  useEffect(() => {
    if (showDetailModal) {
      fetchModels();
      fetchContacts();
    }
  }, [showDetailModal]);

  const fetchThreadNotes = async (threadId: number) => {
    try {
      const { data, error } = await supabase
        .from('thread_notes')
        .select('id, thread_id, content, source_message, message_id, created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setThreadNotes(data || []);
    } catch (err) {
      console.error('Error fetching thread notes:', err);
      toast.error('Failed to load thread notes');
    }
  };

  // Helper function to group messages by conversation topics
  const groupMessagesByTopic = (msgs: Message[]) => {
    const segments: Message[][] = [];
    let currentSegment: Message[] = [];
    
    for (let i = 0; i < msgs.length; i++) {
      const message = msgs[i];
      const nextMessage = msgs[i + 1];
      
      currentSegment.push(message);
      
      // Check if next message starts a new topic
      if (nextMessage && isNewTopic(message, nextMessage)) {
        segments.push([...currentSegment]);
        currentSegment = [];
      }
    }
    
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    
    return segments;
  };

  // Helper function to detect if next message starts a new topic
  const isNewTopic = (current: Message, next: Message) => {
    const currentText = (current.text || current.speech_text || '').toLowerCase();
    const nextText = (next.text || next.speech_text || '').toLowerCase();
    
    // New topic indicators
    const topicStarters = [
      'hey', 'hi', 'hello', 'good morning', 'good afternoon', 'good evening',
      'quick question', 'i have a question', 'can i ask', 'by the way',
      'speaking of', 'on another note', 'also', 'another thing', 'btw',
      'one more thing', 'oh and', 'also', 'additionally', 'fyi'
    ];
    
    // Check if next message starts with a topic starter
    if (topicStarters.some(starter => nextText.startsWith(starter))) {
      return true;
    }
    
    // Check if there's a significant time gap (more than 1 hour)
    const timeDiff = new Date(next.created_at).getTime() - new Date(current.created_at).getTime();
    if (timeDiff > 60 * 60 * 1000) { // 1 hour
      return true;
    }
    
    // Check if next message is a question after a response
    if (current.direction === 'inbound' && next.direction === 'outbound' && 
        (nextText.includes('?') || isQuestion(nextText))) {
      return true;
    }
    
    return false;
  };

  // Helper function to detect questions
  const isQuestion = (text: string) => {
    const questionWords = ['what', 'how', 'when', 'where', 'why', 'can you', 'could you', 'would you', 'do you'];
    return questionWords.some(word => text.toLowerCase().includes(word));
  };

  // Compare phone numbers by their last 10 digits (normalizes +1, spaces, etc.)
  const phonesMatch = (a: string, b: string) => last10(a) === last10(b);

  // Process a conversation segment
  const processConversationSegment = async (segment: Message[], modelPhoneNumber: string, modelUsername: string) => {
    console.log('Debug - Segment phone numbers:', segment.map(m => m.sender_phone_number));
    console.log('Debug - Looking for model phone:', modelPhoneNumber);
    
    // Only process segments that contain model messages
    const hasModelMessage = segment.some(m => phonesMatch(m.sender_phone_number, modelPhoneNumber));
    if (!hasModelMessage) {
      console.log('Debug - Segment skipped: no model message');
      return [] as any[];
    }
    
    console.log('Debug - Processing segment with model message:', segment.length, 'messages');
    
    // Format conversation for AI analysis
    const conversationText = segment.map(m => 
      `${m.sender_phone_number}: ${m.text || m.speech_text || ''}`
    ).join('\n');
    
    console.log('Debug - Conversation text:', conversationText.substring(0, 200) + '...');
    
    try {
      // Get the Supabase URL for edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Call AI to analyze the conversation segment
      const response = await fetch(`${supabaseUrl}/functions/v1/grok-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            {
              role: 'system',
              content: `You are analyzing a conversation between an OnlyFans model and chat members to extract actionable insights for account management.

Look for:
1. Model's responses to questions about preferences/boundaries
2. Model's reactions to suggestions or requests
3. Model's communication style and tone preferences
4. Any instructions or feedback the model gives
5. Content type preferences and limitations

Extract ONLY actionable insights in this format:
- "Model prefers [preference] when [context]"
- "Model dislikes [thing] because [reason]"
- "Model's tone is [description] in [situation]"
- "Model's boundary: [specific boundary]"
- "Model's content preference: [preference]"

Focus on insights that help the team understand how to better manage the model's account.
Keep each insight under 100 characters if possible.
If no actionable insights found, respond with "NO_ACTIONABLE_INSIGHTS".

The model's username is @${modelUsername}.`
            },
            {
              role: 'user',
              content: `Conversation:\n${conversationText}`
            }
          ],
          temperature: 0.7,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error('AI service temporarily unavailable');
      }

      const data = await response.json();
      const aiContent = data.choices?.[0]?.message?.content?.trim();
      
      console.log('Debug - AI response:', aiContent);
      
      if (!aiContent || aiContent === 'NO_ACTIONABLE_INSIGHTS') {
        console.log('Debug - No actionable insights found');
        return [] as any[];
      }

      // Split multiple insights if AI provided them
      const insights = (aiContent as string).split('\n').filter((insight: string) => insight.trim().length > 0);
      console.log('Debug - Insights to create:', insights.length);
      
      const newNotes: any[] = [];

      for (const insight of insights) {
        console.log('Debug - Creating note for insight:', insight);
        // Insert the AI-generated note
        const { data: noteData, error: insertError } = await supabase
          .from('thread_notes')
          .insert({
            thread_id: selectedThread!.id,
            content: (insight as string).trim(),
            source_message: conversationText.substring(0, 500) + (conversationText.length > 500 ? '...' : ''),
            message_id: segment[segment.length - 1].message_id // Use last message ID as reference
          })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating note:', insertError);
          continue;
        }
        
        console.log('Debug - Note created successfully:', noteData);
        newNotes.push(noteData);
      }
      
      console.log('Debug - Total notes created for segment:', newNotes.length);
      return newNotes;
    } catch (aiError) {
      console.error('Error processing conversation segment with AI:', aiError);
      
      // Fallback: create a simple note with conversation summary
      const conversationSummary = segment
        .filter(m => phonesMatch(m.sender_phone_number, modelPhoneNumber))
        .map(m => m.text || m.speech_text || '')
        .filter(text => text.length > 0)
        .join(' ');
      
      if (conversationSummary.length > 0) {
        const { data: noteData, error: insertError } = await supabase
          .from('thread_notes')
          .insert({
            thread_id: selectedThread!.id,
            content: `Model mentioned: ${conversationSummary.substring(0, 100)}${conversationSummary.length > 100 ? '...' : ''}`,
            source_message: conversationText.substring(0, 500) + (conversationText.length > 500 ? '...' : ''),
            message_id: segment[segment.length - 1].message_id
          })
          .select()
          .single();
          
        if (!insertError) {
          return [noteData] as any[];
        }
      }
      
      return [] as any[];
    }
  };

  // Process a batch of messages (updated to use conversation segments)
  const processMessageBatch = async (msgs: Message[], modelPhoneNumber: string, modelUsername: string) => {
    // Group messages into conversation segments
    const conversationSegments = groupMessagesByTopic(msgs);
    const newNotes: any[] = [];
    
    for (const segment of conversationSegments) {
      const segmentNotes = await processConversationSegment(segment, modelPhoneNumber, modelUsername);
      newNotes.push(...segmentNotes);
    }
    
    return newNotes;
  };

  const handleEvaluateMessages = async () => {
    if (!selectedThread) return;
    
    try {
      setEvaluatingNotes(true);
      setEvaluationProgress({ current: 0, total: 0, processed: 0, notesCreated: 0 });
      
      // Check if a model is assigned to this thread
      if (!selectedThread.client_id) {
        toast.error('Please assign a model to this thread before evaluating messages');
        setEvaluatingNotes(false);
        setShowEvaluateModal(false);
        setEvaluationProgress(null);
        return;
      }
      
      // Get the model's details for this thread (from clients table)
      const { data: modelData, error: modelError } = await supabase
        .from('clients')
        .select('id, username, phone')
        .eq('id', selectedThread.client_id)
        .single();
        
      if (modelError) throw modelError;
      if (!(modelData as any)?.phone) {
        toast.error('The assigned model does not have a phone number configured. Please update the client\'s phone.');
        setEvaluatingNotes(false);
        setShowEvaluateModal(false);
        setEvaluationProgress(null);
        return;
      }
      
      const modelPhoneNumber = (modelData as any).phone as string;
      const modelUsername = (modelData as any).username as string;
      
      console.log('Debug - Assigned model phone number:', modelPhoneNumber, 'Model number (client_id):', selectedThread.client_id);
      console.log('Debug - Assigned model username:', modelUsername);
      
      // Get all messages for the thread (no direction filter)
      const { data: allMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', selectedThread.id)
        .order('created_at', { ascending: true });
        
      if (messagesError) throw messagesError;
      
      // Get all existing notes for this thread to filter out processed messages
      const { data: existingNotes, error: notesError } = await supabase
        .from('thread_notes')
        .select('message_id')
        .eq('thread_id', selectedThread.id)
        .not('message_id', 'is', null);
        
      if (notesError) throw notesError;
      
      console.log('Debug - All messages found:', allMessages?.length || 0);
      console.log('Debug - Existing notes found:', existingNotes?.length || 0);
      
      // Create a set of message IDs that already have notes
      const processedMessageIds = new Set(((existingNotes as any[]) || []).map((note: any) => note.message_id as string));
      
      // Group all messages into conversation segments
      const allSegments = groupMessagesByTopic((allMessages as Message[]) || []);
      
      // Only process segments whose last message hasn't been used for a note yet
      const segmentsToProcess = allSegments.filter(seg => {
        const last = seg[seg.length - 1];
        return last && last.message_id && !processedMessageIds.has(last.message_id);
      });
      
      console.log('Debug - Segments to process:', segmentsToProcess.length);
      console.log('Debug - Sample segment:', segmentsToProcess[0]);
      
      if (segmentsToProcess.length === 0) {
        toast.info('No new conversation segments to evaluate');
        setEvaluatingNotes(false);
        setShowEvaluateModal(false);
        setEvaluationProgress(null);
        return;
      }
      
      // Process conversation segments with progress
      let totalNotesCreated = 0;
      let processedCount = 0;
      
      setEvaluationProgress({ current: 0, total: segmentsToProcess.length, processed: 0, notesCreated: 0 });
      
      for (let i = 0; i < segmentsToProcess.length; i++) {
        const segment = segmentsToProcess[i];
        const newNotes = await processConversationSegment(segment, modelPhoneNumber, modelUsername);
        totalNotesCreated += newNotes.length;
        processedCount += segment.length;
        
        // Update progress
        setEvaluationProgress({
          current: i + 1,
          total: segmentsToProcess.length,
          processed: processedCount,
          notesCreated: totalNotesCreated
        });
        
        // Small delay to prevent overwhelming the UI
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Update the thread notes state
      setThreadNotes((prev: ThreadNote[]) => {
        // Fetch all notes to update the state properly
        fetchThreadNotes(selectedThread.id);
        return prev;
      });
      
      toast.success(`Created ${totalNotesCreated} new notes from ${segmentsToProcess.length} conversation segments`);
    } catch (err) {
      console.error('Error evaluating messages:', err);
      toast.error('Failed to evaluate messages');
    } finally {
      setEvaluatingNotes(false);
      setShowEvaluateModal(false);
      setEvaluationProgress(null);
    }
  };

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase.from('contacts').select('id, phone_number, name');

      if (error) throw error;

      // Create a map of phone numbers to names, including common variants
      const newContactMap = ((data as Contact[]) || []).reduce((acc: Record<string, string>, contact: Contact) => {
        if (contact.name && contact.phone_number) {
          for (const key of variantsFor(contact.phone_number)) {
            if (!acc[key]) acc[key] = contact.name;
          }
        }
        return acc;
      }, {} as Record<string, string>);

      setContactMap(newContactMap);
    } catch (err) {
      console.error('Error fetching contacts:', err);
    }
  };

  const getDisplayName = (phone: string) => {
    // Try direct and common variants
    for (const key of variantsFor(phone)) {
      if (contactMap[key]) return contactMap[key];
    }
    // Fallback: scan for any contact whose normalized last10 matches
    const target = last10(phone);
    for (const [k, name] of Object.entries(contactMap)) {
      if (last10(k) === target) return name;
    }
    return phone;
  };

  const handleSaveContact = async () => {
    if (!editingContact) return;

    try {
      // First check if the contact already exists
      const { data: existingContacts, error: fetchError } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone_number', editingContact.phone);

      if (fetchError) throw fetchError;

      let result: any;
      
      if (existingContacts && existingContacts.length > 0) {
        // Update existing contact
        result = await supabase
          .from('contacts')
          .update({
            name: editingContact.name
          })
          .eq('phone_number', editingContact.phone)
          .select();
      } else {
        // Get next available ID - don't use single() which can fail if table is empty
        const { data: maxIdResult } = await supabase
          .from('contacts')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);
        
        // Default to 1 if no contacts exist yet
        const nextId = maxIdResult && (maxIdResult as any[]).length > 0 ? (maxIdResult as any[])[0].id + 1 : 1;

        // Create new contact with explicit ID
        result = await supabase
          .from('contacts')
          .insert({
            id: nextId,
            phone_number: editingContact.phone,
            name: editingContact.name
          })
          .select();
      }

      if ((result as any).error) throw (result as any).error;

      // Update contacts map
      setContactMap((prev: Record<string, string>) => ({
        ...prev,
        [editingContact.phone]: editingContact.name
      }));

      toast.success('Contact saved successfully');
      setEditingContact(null);
      
      // Refresh contacts to ensure we have the latest data
      fetchContacts();
    } catch (err) {
      console.error('Error saving contact:', err);
      setError('Failed to save contact');
      toast.error('Failed to save contact');
    }
  };

  const fetchThreads = async (page = 0, appendToExisting = false) => {
    try {
      // Only use AbortController for non-initial loads to avoid React StrictMode issues
      let abortController: AbortController | null = null;
      
      if (page > 0 || appendToExisting) {
        // Cancel any existing threads query
        if (threadsAbortController.current && !threadsAbortController.current.signal.aborted) {
          threadsAbortController.current.abort();
        }
        
        // Create new AbortController for this query
        abortController = new AbortController();
        threadsAbortController.current = abortController;
      }
      
      if (!appendToExisting) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMoreThreads(true);
      }

      // Calculate pagination range
      const from = page * THREADS_PAGE_SIZE;
      const to = from + THREADS_PAGE_SIZE - 1;

      // Use a more efficient approach with a lateral join to get threads with their latest messages
      // This eliminates the N+1 query problem by using a single query
      let query = supabase
        .rpc('get_threads_with_latest_messages')
        .range(from, to);
      
      // Only add abort signal if we have one
      if (abortController) {
        query = query.abortSignal(abortController.signal);
      }
      
      const { data: threadsData, error: threadsError } = await query;

      if (threadsError) {
        console.error('Error with RPC call, falling back to basic thread fetch:', threadsError);
        
        // Fallback: Just get threads without latest messages for now
        let fallbackQuery = supabase
          .from('threads')
          .select('id, group_id, name, client_id, participants, created_at, updated_at, last_read_at')
          .range(from, to)
          .order('updated_at', { ascending: false });
        
        // Only add abort signal if we have one
        if (abortController) {
          fallbackQuery = fallbackQuery.abortSignal(abortController.signal);
        }
        
        const { data: basicThreadsData, error: basicError } = await fallbackQuery;

        if (basicError) throw basicError;

        const threadsWithoutMessages = ((basicThreadsData as Thread[]) || []).map((thread: Thread) => ({
          ...thread,
          participants: thread.participants || [],
          latest_message: undefined,
          last_read_at: thread.last_read_at || null
        } as Thread));

        // Handle pagination for fallback as well
        if (appendToExisting) {
          setThreads((prev: Thread[]) => [...prev, ...threadsWithoutMessages]);
        } else {
          setThreads(threadsWithoutMessages);
        }
        
        // Update hasMoreThreads based on returned data length
        if (basicThreadsData && (basicThreadsData as any[]).length < THREADS_PAGE_SIZE) {
          setHasMoreThreads(false);
        } else {
          setHasMoreThreads(true);
        }
        setThreadsPage(page);
        return;
      }

      // Transform the RPC result into the expected Thread format
      const transformedThreads = ((threadsData as any[]) || []).map((row: any) => ({
        id: row.thread_id,
        group_id: row.group_id,
        name: row.thread_name,
        client_id: row.client_id,
        participants: row.participants || [],
        created_at: row.thread_created_at,
        updated_at: row.thread_updated_at,
        last_read_at: row.last_read_at,
        latest_message: row.latest_message_text || row.latest_message_speech_text
          ? {
              text: row.latest_message_text || row.latest_message_speech_text || '',
              created_at: row.latest_message_created_at,
              sender_name: row.latest_message_sender_name,
              sender_phone_number: row.latest_message_sender_phone
            }
          : undefined
      } as Thread));

      // Handle pagination
      if (appendToExisting) {
        setThreads((prev: Thread[]) => [...prev, ...transformedThreads]);
      } else {
        setThreads(transformedThreads);
      }
      
      // Update hasMoreThreads based on returned data length
      if (threadsData && (threadsData as any[]).length < THREADS_PAGE_SIZE) {
        setHasMoreThreads(false);
      } else {
        setHasMoreThreads(true);
      }
      setThreadsPage(page);
    } catch (err) {
      // Don't show error if the request was aborted (user navigated away)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Thread fetch was cancelled');
        return;
      }
      console.error('Error fetching threads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat threads');
    } finally {
      setLoading(false);
      setLoadingMoreThreads(false);
    }
  };

  const fetchMessages = async (threadId: number, page = 0) => {
    try {
      // Only use AbortController for non-initial loads
      let abortController: AbortController | null = null;
      
      if (page > 0) {
        // Cancel any existing messages query
        if (messagesAbortController.current && !messagesAbortController.current.signal.aborted) {
          messagesAbortController.current.abort();
        }
        
        // Create new AbortController for this query
        abortController = new AbortController();
        messagesAbortController.current = abortController;
      }
      
      setMessagesLoading(true);
      // Calculate range for pagination
      const from = page * MESSAGES_PAGE_SIZE;
      const to = from + MESSAGES_PAGE_SIZE - 1;
      
      // Fetch most recent messages (descending) - using specific columns for performance
      let query = supabase
        .from('messages')
        .select(`
          id, message_id, thread_id, message_type, direction, text, sender_phone_number, 
          sender_name, reaction, reaction_event, speech_text, speech_metadata, created_at,
          sent_by_team_member_id,
          sent_by_team_member:team_members!sent_by_team_member_id(full_name)
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      // Only add abort signal if we have one
      if (abortController) {
        query = query.abortSignal(abortController.signal);
      }
      
      const { data: messagesData, error: messagesError } = await query;

      if (messagesError) throw messagesError;

      // Batch fetch attachments for these messages
      const messageIds = ((messagesData as Message[]) || []).map((m: Message) => m.id);
      let attachmentsMap: Record<number, any[]> = {};
      if (messageIds.length > 0) {
        let attachmentsQuery = supabase
          .from('attachments')
          .select('id, message_id, url')
          .in('message_id', messageIds);
        
        // Only add abort signal if we have one
        if (abortController) {
          attachmentsQuery = attachmentsQuery.abortSignal(abortController.signal);
        }
        
        const { data: attachmentsData, error: attachmentsError } = await attachmentsQuery;
        if (attachmentsError) {
          console.error('Error fetching attachments for messages:', attachmentsError);
        } else {
          attachmentsMap = ((attachmentsData as any[]) || []).reduce((acc: Record<number, any[]>, att: any) => {
            if (!acc[att.message_id]) acc[att.message_id] = [];
            acc[att.message_id].push(att);
            return acc;
          }, {} as Record<number, any[]>);
        }
      }

      // Attach attachments to messages
      const messagesWithAttachments = ((messagesData as Message[]) || []).map((message: Message) => ({
        ...message,
        attachments: attachmentsMap[message.id] || []
      }));

      // If page is 0, set messages; if loading more, prepend
      if (page === 0) {
        setMessages(messagesWithAttachments.reverse()); // oldest at top
      } else {
        setMessages((prev: Message[]) => [...messagesWithAttachments.reverse(), ...prev]);
      }

      // Set hasMoreMessages if there are more messages to load
      if (messagesData && (messagesData as any[]).length < MESSAGES_PAGE_SIZE) {
        setHasMoreMessages(false);
      } else {
        setHasMoreMessages(true);
      }
      setMessagesPage(page);
    } catch (err) {
      // Don't show error if the request was aborted (user navigated away)
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Message fetch was cancelled');
        return;
      }
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchThreads();
    if (selectedThread) {
      await fetchMessages(selectedThread.id);
    }
    setRefreshing(false);
  };

  // Filter threads based on search query
  const filteredThreads = threads.filter((thread: Thread) => {
    const searchString = searchQuery.toLowerCase();
    return (
      thread.group_id.toLowerCase().includes(searchString) ||
      (thread.name && thread.name.toLowerCase().includes(searchString)) ||
      (thread.participants && thread.participants.some((p: string) => 
        (contactMap[p] && contactMap[p].toLowerCase().includes(searchString)) || 
        p.includes(searchString)
      )) ||
      (thread.latest_message?.text && thread.latest_message.text.toLowerCase().includes(searchString))
    );
  });

  // Handle image selection
  const handleImagesSelected = (files: File[]) => {
    // Validate file count
    const remainingSlots = 3 - selectedImages.length;
    const filesToAdd = files.slice(0, remainingSlots);
    
    // Validate file types and sizes
    const validFiles: File[] = [];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    for (const file of filesToAdd) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large (max 50MB)`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      setSelectedImages((prev: File[]) => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} image${validFiles.length > 1 ? 's' : ''} added`);
    }
    
    if (files.length > remainingSlots) {
      toast.error(`Maximum 3 images allowed. Only ${remainingSlots} added.`);
    }
  };

  // Handle image removal
  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  };

  // Send a message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedThread || (!messageInput.trim() && selectedImages.length === 0)) {
      toast.error('Please enter a message or select images');
      return;
    }
    
    console.log('🚀 Sending message:', {
      threadId: selectedThread.id,
      groupId: selectedThread.group_id,
      message: messageInput,
      sender: teamMember?.full_name || 'Unknown User',
      teamMemberId: teamMember?.id,
      timestamp: new Date().toISOString(),
      imageCount: selectedImages.length
    });
    
    try {
      setSendingMessage(true);
      setScrollToBottom(true);

      // Upload images if any are selected
      let attachmentUrls: string[] = [];
      if (selectedImages.length > 0) {
        setUploadingImages(true);
        
        try {
          for (const file of selectedImages) {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${selectedThread.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
            
            console.log('📤 Uploading image:', fileName);
            
            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('chat-attachments')
              .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Upload error:', uploadError);
              throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
            }

            // Get public URL
            const { data: urlData } = supabase.storage
              .from('chat-attachments')
              .getPublicUrl(fileName);

            if (urlData?.publicUrl) {
              attachmentUrls.push(urlData.publicUrl);
              console.log('✅ Image uploaded:', urlData.publicUrl);
            }
          }
        } catch (uploadErr: any) {
          toast.error(uploadErr.message || 'Failed to upload images');
          setSendingMessage(false);
          setUploadingImages(false);
          return;
        } finally {
          setUploadingImages(false);
        }
      }

      // Optimistically add the message to the UI immediately
      const optimisticMessage: Message = {
        id: Date.now(), // Temporary ID
        message_id: `temp-${Date.now()}`,
        thread_id: selectedThread.id,
        message_type: 'text',
        direction: 'outbound',
        text: messageInput || (attachmentUrls.length > 0 ? `Sent ${attachmentUrls.length} image(s)` : ''),
        sender_phone_number: 'team',
        sender_name: teamMember?.full_name || 'Team Member',
        created_at: new Date().toISOString(),
        sent_by_team_member_id: teamMember?.id,
        attachments: []
      };

      // Add optimistic message to current thread
      setMessages((prev: Message[]) => [...prev, optimisticMessage]);

      // Update thread preview immediately
      setThreads((prev: Thread[]) =>
        prev.map((t: Thread) =>
          t.id === selectedThread.id
            ? {
                ...t,
                latest_message: {
                  text: messageInput,
                  created_at: new Date().toISOString(),
                  sender_name: teamMember?.full_name || 'Team Member',
                  sender_phone_number: 'team'
                },
                updated_at: new Date().toISOString()
              }
            : t
        ).sort((a, b) => {
          const aDate = a.latest_message?.created_at || a.updated_at;
          const bDate = b.latest_message?.created_at || b.updated_at;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        })
      );

      // Call the Supabase Edge Function to send message via LoopMessage API
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-loopmessage/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          group_id: selectedThread.group_id,
          content: messageInput || (attachmentUrls.length > 0 ? `📷 ${attachmentUrls.length} image(s)` : ''),
          sender_name: teamMember?.full_name || 'Team Member',
          team_member_id: teamMember?.id,
          attachments: attachmentUrls.length > 0 ? attachmentUrls : undefined
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Message send failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        // Remove optimistic message on failure
        setMessages((prev: Message[]) => 
          prev.filter(m => m.message_id !== optimisticMessage.message_id)
        );
        
        throw new Error(`API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Message sent successfully:', {
        response: data,
        sentBy: teamMember?.full_name || 'Team Member',
        teamMemberId: teamMember?.id,
        threadId: selectedThread.id,
        messageContent: messageInput,
        attachmentCount: attachmentUrls.length
      });
      
      // Clear the input field and selected images
      setMessageInput('');
      setSelectedImages([]);
      toast.success(`Message sent by ${teamMember?.full_name || 'Team Member'}!`);
      
      // Note: The real message will come through the webhook and replace the optimistic one
      // The webhook should include sent_by_team_member_id for proper attribution
    } catch (err) {
      console.error('Error sending message:', err);
      console.error('💥 Message send error details:', {
        error: err,
        threadId: selectedThread?.id,
        groupId: selectedThread?.group_id,
        messageLength: messageInput.length,
        sender: teamMember?.full_name,
        teamMemberId: teamMember?.id
      });
      
      // Remove optimistic message on error
      setMessages((prev: Message[]) => 
        prev.filter(m => m.message_id !== `temp-${Date.now()}`)
      );
      
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const fetchModels = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, username')
        .order('username');

      if (error) throw error;
      setModels((data as Model[]) || []);
    } catch (err) {
      console.error('Error fetching models:', err);
      setError('Failed to load models');
    }
  };

  const handleAssignModel = async (modelId: string) => {
    if (!selectedThread) return;

    try {
      // Fetch client details (used as model) including phone
      const { data: modelData, error: modelError } = await supabase
        .from('clients')
        .select('id, username, phone')
        .eq('id', modelId)
        .single();

      if (modelError) throw modelError;
      if (!modelData) throw new Error('Model not found');

      // Update thread with model info
      const { error: threadError } = await supabase
        .from('threads')
        .update({
          name: `@${(modelData as any).username}`,
          client_id: modelId
        })
        .eq('id', selectedThread.id);

      if (threadError) throw threadError;

      // If model has a phone number, sync contact information
      if ((modelData as any).phone) {
        const phoneNumber = (modelData as any).phone as string;

        // Get the next available ID
        const { data: maxIdResult } = await supabase
          .from('contacts')
          .select('id')
          .order('id', { ascending: false })
          .limit(1);

        const nextId = maxIdResult && (maxIdResult as any[]).length > 0 ? (maxIdResult as any[])[0].id + 1 : 1;

        // Check if contact already exists
        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone_number', phoneNumber)
          .maybeSingle();

        if (existingContact) {
          // Update existing contact
          await supabase
            .from('contacts')
            .update({ name: (modelData as any).username })
            .eq('phone_number', phoneNumber);
        } else {
          // Create new contact with explicit ID
          await supabase
            .from('contacts')
            .insert({
              id: nextId,
              phone_number: phoneNumber,
              name: (modelData as any).username
            });
        }

        // Update local contact map
        setContactMap((prev: Record<string, string>) => ({
          ...prev,
          [phoneNumber]: (modelData as any).username as string
        }));
      }

      // Update local state
      setThreads((prev: Thread[]) =>
        prev.map((t: Thread) =>
          t.id === selectedThread.id ? { ...t, name: `@${(modelData as any).username}`, client_id: modelId } : t
        )
      );
      setSelectedThread((prev: Thread | null) =>
        prev ? { ...prev, name: `@${(modelData as any).username}`, client_id: modelId } : null
      );

      toast.success(`Thread assigned to ${(modelData as any).username}`);
    } catch (err) {
      console.error('Error assigning model:', err);
      setError('Failed to assign model');
      toast.error('Failed to assign model');
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleShowManagement = () => {
    setShowManagement(true);
    setSelectedThread(null); // Clear selected thread when showing management
  };

  const handleMessageInputChange = (value: string) => {
    setMessageInput(value);
  };

  // Function to load more (older) messages
  const loadMoreMessages = () => {
    if (selectedThread && hasMoreMessages) {
      setScrollToBottom(false);
      fetchMessages(selectedThread.id, messagesPage + 1);
    }
  };

  // Function to load more threads
  const loadMoreThreads = () => {
    if (hasMoreThreads && !loadingMoreThreads) {
      fetchThreads(threadsPage + 1, true);
    }
  };

  // Message search functions
  const searchMessages = async (query: string) => {
    if (!selectedThread || !query.trim()) {
      setMessageSearchResults([]);
      setCurrentSearchIndex(0);
      setSearchResultsLoaded(false);
      return;
    }

    try {
      setIsSearching(true);
      
      // Search for messages containing the query in text or speech_text
      const { data: searchResults, error } = await supabase
        .from('messages')
        .select(`
          id, message_id, thread_id, message_type, direction, text, sender_phone_number, 
          sender_name, reaction, reaction_event, speech_text, speech_metadata, created_at,
          sent_by_team_member_id
        `)
        .eq('thread_id', selectedThread.id)
        .or(`text.ilike.%${query}%,speech_text.ilike.%${query}%`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const results = (searchResults as Message[]) || [];
      setMessageSearchResults(results);
      setCurrentSearchIndex(0);
      setSearchResultsLoaded(true);

      // If we have results, ensure the first result is loaded in the current view
      if (results.length > 0) {
        await ensureMessageIsLoaded(results[0]);
      }
    } catch (err) {
      console.error('Error searching messages:', err);
      toast.error('Failed to search messages');
    } finally {
      setIsSearching(false);
    }
  };

  const ensureMessageIsLoaded = async (targetMessage: Message) => {
    // Check if the message is already in the current messages view
    const messageExists = messages.some((m: Message) => m.id === targetMessage.id);
    
    if (!messageExists) {
      // We need to load more messages until we find this one
      // First, determine how many messages we need to load based on created_at
      const { data: messageCount, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('thread_id', selectedThread!.id)
        .gte('created_at', targetMessage.created_at);

      if (error) {
        console.error('Error counting messages:', error);
        return;
      }

      const totalMessagesNeeded = messageCount?.length || 0;
      const currentlyLoaded = messages.length;
      
      if (totalMessagesNeeded > currentlyLoaded) {
        // Load enough pages to include the target message
        const pagesNeeded = Math.ceil((totalMessagesNeeded - currentlyLoaded) / MESSAGES_PAGE_SIZE);
        
        for (let i = 0; i < pagesNeeded; i++) {
          await fetchMessages(selectedThread!.id, messagesPage + i + 1);
        }
      }
    }
  };

  const navigateToSearchResult = async (direction: 'next' | 'prev') => {
    if (messageSearchResults.length === 0) return;

    let newIndex = currentSearchIndex;
    if (direction === 'next') {
      newIndex = (currentSearchIndex + 1) % messageSearchResults.length;
    } else {
      newIndex = currentSearchIndex === 0 ? messageSearchResults.length - 1 : currentSearchIndex - 1;
    }

    setCurrentSearchIndex(newIndex);
    const targetMessage = messageSearchResults[newIndex];
    
    // Ensure the message is loaded in the view
    await ensureMessageIsLoaded(targetMessage);
    
    // Scroll to the message
    setTimeout(() => {
      const messageElement = document.querySelector(`[data-message-id="${targetMessage.message_id}"]`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Temporarily highlight the message
        messageElement.classList.add('search-highlight');
        setTimeout(() => {
          messageElement.classList.remove('search-highlight');
        }, 2000);
      }
    }, 500);
  };

  const clearMessageSearch = () => {
    setMessageSearchQuery('');
    setMessageSearchResults([]);
    setCurrentSearchIndex(0);
    setSearchResultsLoaded(false);
  };

  const handleMessageSearch = (query: string) => {
    setMessageSearchQuery(query);
  };

  const handleMessageSearchSubmit = () => {
    searchMessages(messageSearchQuery);
  };

  return (
    <Layout title="Client Chats">
      <div className="fixed inset-0 top-16 left-64 right-0 bottom-0 flex">
        {/* Thread List Component */}
        <ThreadList
          threads={filteredThreads}
          selectedThread={selectedThread}
          loading={loading}
          refreshing={refreshing}
          searchQuery={searchQuery}
          contactMap={contactMap}
          onThreadSelect={setSelectedThread}
          onRefresh={refreshData}
          onSearchChange={handleSearchChange}
          onMarkAsRead={markThreadAsRead}
          onShowManagement={handleShowManagement}
          soundEnabled={soundEnabled}
          onSoundToggle={handleSoundToggle}
          hasMoreThreads={hasMoreThreads}
          loadingMoreThreads={loadingMoreThreads}
          onLoadMoreThreads={loadMoreThreads}
        />

        {/* Right Panel - Management or Message View */}
        {showManagement ? (
          <ManagementView
            threads={threads}
            onThreadSelect={(thread) => {
              setShowManagement(false);
              setSelectedThread(thread);
              markThreadAsRead(thread.id);
            }}
            contactMap={contactMap}
          />
        ) : (
          <MessageView
            thread={selectedThread}
            messages={messages}
            loading={messagesLoading}
            contactMap={contactMap}
            messageInput={messageInput}
            sendingMessage={sendingMessage}
            onMessageInputChange={handleMessageInputChange}
            onSendMessage={handleSendMessage}
            onShowNotes={() => setShowNotesModal(true)}
            onShowSettings={() => setShowDetailModal(true)}
            scrollToBottom={scrollToBottom}
            hasMoreMessages={hasMoreMessages}
            onLoadMoreMessages={loadMoreMessages}
            messagesPage={messagesPage}
            pageSize={MESSAGES_PAGE_SIZE}
            messageSearchQuery={messageSearchQuery}
            messageSearchResults={messageSearchResults}
            currentSearchIndex={currentSearchIndex}
            isSearching={isSearching}
            searchResultsLoaded={searchResultsLoaded}
            onMessageSearch={handleMessageSearch}
            onMessageSearchSubmit={handleMessageSearchSubmit}
            onNavigateSearchResult={navigateToSearchResult}
            onClearMessageSearch={clearMessageSearch}
            selectedImages={selectedImages}
            onImagesSelected={handleImagesSelected}
            onRemoveImage={handleRemoveImage}
            uploadingImages={uploadingImages}
          />
        )}
      </div>

      {/* Thread Notes Modal */}
      <ThreadNotes
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        notes={threadNotes}
        onEvaluate={handleEvaluateMessages}
        evaluating={evaluatingNotes}
        evaluationProgress={evaluationProgress}
      />

      {/* Sound Notifier Component */}
      <SoundNotifier
        enabled={soundEnabled}
        onToggle={handleSoundToggle}
        triggerSound={triggerSound}
        onSoundPlayed={handleSoundPlayed}
      />

      {/* Thread Settings Modal */}
      <ThreadSettings
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        models={models}
        onAssignModel={handleAssignModel}
        editingContact={editingContact}
        onEditContact={setEditingContact}
        onSaveContact={handleSaveContact}
        threadParticipants={selectedThread?.participants || []}
        contactMap={contactMap}
      />
    </Layout>
  );
}