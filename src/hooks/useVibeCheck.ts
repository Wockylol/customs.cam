import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { VoiceAnalysis } from '../lib/database.types';

// Types for the conversation
export interface ChatMessage {
  id: string;
  role: 'fan' | 'creator';
  content: string;
  timestamp: Date;
}

// Re-export VoiceAnalysis for consumers
export type { VoiceAnalysis };

export type VibeCheckStatus = 'not_started' | 'in_progress' | 'analyzing' | 'completed';

// Scripted fan prompts for specific conversation steps
const SCRIPTED_PROMPTS: Record<number, { message: string; context: string }> = {
  0: {
    message: "hey gorgeous! 😍 been obsessed with your page lately",
    context: "Opening message - testing greeting style, warmth, emoji usage"
  },
  1: {
    message: "you're so perfect... what do you like to do for fun when you're not being gorgeous? 😏",
    context: "Testing how they handle compliments and redirect conversation"
  },
  // Step 2 will be AI-generated based on their response
  3: {
    message: "I can't stop thinking about you tbh... do you ever think about your fans? 🥺",
    context: "Testing flirtation style and boundary handling"
  },
  // Step 4 will be AI-generated
  5: {
    message: "I'd love something special from you... do you do customs? 💕",
    context: "Testing sales approach and confidence in monetization"
  },
  // Step 6 will be AI-generated based on their response
  7: {
    message: "you're amazing, seriously. talking to you made my whole day better 🥰",
    context: "Closing - testing sign-off style and final impression"
  }
};

// Total number of exchanges
const TOTAL_STEPS = 8;

export const useVibeCheck = (clientId: string | undefined) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState<VibeCheckStatus>('not_started');
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [waitingForFan, setWaitingForFan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing analysis from database
  useEffect(() => {
    if (clientId) {
      loadExistingAnalysis();
    }
  }, [clientId]);

  const loadExistingAnalysis = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('client_idiolect_analysis')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading analysis:', error);
        setError('Failed to load existing analysis');
      }

      if (data) {
        // Restore state from database
        setMessages(data.conversation_transcript || []);
        setCurrentStep(data.current_step || 0);
        
        if (data.status === 'completed') {
          setStatus('completed');
          // Use new voice_analysis if available, otherwise it will be null
          setAnalysis(data.voice_analysis as VoiceAnalysis || null);
        } else if (data.status === 'in_progress') {
          setStatus('in_progress');
        }
      }
    } catch (err) {
      console.error('Error loading analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start the vibe check conversation
  const startVibeCheck = useCallback(async () => {
    if (!clientId) return;
    
    setStatus('in_progress');
    setMessages([]);
    setCurrentStep(0);
    
    // Create or update the database record
    try {
      await supabase
        .from('client_idiolect_analysis')
        .upsert({
          client_id: clientId,
          status: 'in_progress',
          current_step: 0,
          conversation_transcript: [],
          voice_analysis: null,
          started_at: new Date().toISOString()
        }, { onConflict: 'client_id' });
    } catch (err) {
      console.error('Error starting vibe check:', err);
    }

    // Send the first fan message after a brief delay
    setTimeout(() => {
      sendFanMessage(SCRIPTED_PROMPTS[0].message);
    }, 500);
  }, [clientId]);

  // Send a fan message (scripted or AI-generated)
  const sendFanMessage = useCallback((content: string) => {
    const fanMessage: ChatMessage = {
      id: `fan-${Date.now()}`,
      role: 'fan',
      content,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, fanMessage]);
    setWaitingForFan(false);
  }, []);

  // Send creator's response
  const sendCreatorMessage = useCallback(async (content: string) => {
    if (!clientId || !content.trim()) return;
    
    setSendingMessage(true);
    
    const creatorMessage: ChatMessage = {
      id: `creator-${Date.now()}`,
      role: 'creator',
      content: content.trim(),
      timestamp: new Date()
    };
    
    const newMessages = [...messages, creatorMessage];
    setMessages(newMessages);
    
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    
    // Save progress to database
    try {
      await supabase
        .from('client_idiolect_analysis')
        .upsert({
          client_id: clientId,
          status: 'in_progress',
          current_step: newStep,
          conversation_transcript: newMessages
        }, { onConflict: 'client_id' });
    } catch (err) {
      console.error('Error saving progress:', err);
    }
    
    setSendingMessage(false);
    
    // Check if conversation is complete
    if (newStep >= TOTAL_STEPS) {
      // Start analysis
      await analyzeConversation(newMessages);
      return;
    }
    
    // Get the next fan message
    setWaitingForFan(true);
    
    // Check if this step has a scripted prompt
    if (SCRIPTED_PROMPTS[newStep]) {
      // Use scripted prompt with a realistic delay
      setTimeout(() => {
        sendFanMessage(SCRIPTED_PROMPTS[newStep].message);
      }, 1500 + Math.random() * 1000);
    } else {
      // Generate AI follow-up
      await generateAIFollowup(newMessages, newStep);
    }
  }, [clientId, messages, currentStep, sendFanMessage]);

  // Generate AI follow-up message
  const generateAIFollowup = async (conversation: ChatMessage[], step: number) => {
    try {
      const response = await supabase.functions.invoke('grok-chat', {
        body: {
          mode: 'vibe-check-followup',
          conversation: conversation.map(m => ({
            role: m.role,
            content: m.content
          })),
          currentStep: step,
          context: getContextForStep(step)
        }
      });

      if (response.error) {
        console.error('Error generating followup:', response.error);
        // Fallback to a generic message
        setTimeout(() => {
          sendFanMessage("mmm that's really interesting... tell me more? 😊");
        }, 1500);
        return;
      }

      const { message } = response.data;
      
      // Add a realistic typing delay
      setTimeout(() => {
        sendFanMessage(message);
      }, 1500 + Math.random() * 1000);
    } catch (err) {
      console.error('Error calling AI:', err);
      setTimeout(() => {
        sendFanMessage("that's so cool! I love getting to know you better 💕");
      }, 1500);
    }
  };

  // Get context hint for AI generation based on step
  const getContextForStep = (step: number): string => {
    switch (step) {
      case 2:
        return "Follow up on what they said about their hobbies/interests. Show genuine curiosity.";
      case 4:
        return "React to how they handled the emotional/flirty question. Match their energy.";
      case 6:
        return "Respond to their answer about customs. If they were open to it, express excitement. If hesitant, be understanding.";
      default:
        return "Continue the conversation naturally based on their last message.";
    }
  };

  // Analyze the complete conversation
  const analyzeConversation = async (conversation: ChatMessage[]) => {
    if (!clientId) return;
    
    setStatus('analyzing');
    
    try {
      const response = await supabase.functions.invoke('grok-chat', {
        body: {
          mode: 'vibe-check-analyze',
          conversation: conversation.map(m => ({
            role: m.role,
            content: m.content
          }))
        }
      });

      if (response.error) {
        console.error('Error analyzing conversation:', response.error);
        setError('Failed to analyze conversation');
        return;
      }

      const { analysis: analysisResult } = response.data;
      setAnalysis(analysisResult as VoiceAnalysis);
      
      // Save final analysis to database with new voice_analysis column
      await supabase
        .from('client_idiolect_analysis')
        .upsert({
          client_id: clientId,
          status: 'completed',
          current_step: TOTAL_STEPS,
          conversation_transcript: conversation,
          completed_at: new Date().toISOString(),
          voice_analysis: analysisResult
        }, { onConflict: 'client_id' });

      setStatus('completed');
    } catch (err) {
      console.error('Error in analysis:', err);
      setError('Failed to analyze conversation');
    }
  };

  // Reset and start over
  const resetVibeCheck = useCallback(async () => {
    if (!clientId) return;
    
    setMessages([]);
    setCurrentStep(0);
    setStatus('not_started');
    setAnalysis(null);
    setError(null);
    
    // Delete existing record
    try {
      await supabase
        .from('client_idiolect_analysis')
        .delete()
        .eq('client_id', clientId);
    } catch (err) {
      console.error('Error resetting:', err);
    }
  }, [clientId]);

  // Calculate progress percentage
  const progress = (currentStep / TOTAL_STEPS) * 100;

  return {
    // State
    messages,
    currentStep,
    totalSteps: TOTAL_STEPS,
    status,
    analysis,
    loading,
    sendingMessage,
    waitingForFan,
    error,
    progress,
    
    // Actions
    startVibeCheck,
    sendCreatorMessage,
    resetVibeCheck,
    
    // Computed
    isComplete: status === 'completed',
    canSendMessage: status === 'in_progress' && !sendingMessage && !waitingForFan,
    lastFanMessage: messages.filter(m => m.role === 'fan').pop()
  };
};

export default useVibeCheck;
