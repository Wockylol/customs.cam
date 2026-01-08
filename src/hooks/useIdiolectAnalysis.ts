import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { VoiceAnalysis } from '../lib/database.types';

// Re-export for consumers
export type { VoiceAnalysis };

export interface IdiolectAnalysisData {
  id: string;
  client_id: string;
  conversation_transcript: any[];
  voice_analysis: VoiceAnalysis | null;
  status: 'incomplete' | 'in_progress' | 'completed';
  current_step: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useIdiolectAnalysis = (clientId: string | undefined) => {
  const [analysis, setAnalysis] = useState<IdiolectAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchAnalysis();
    }
  }, [clientId]);

  const fetchAnalysis = async () => {
    if (!clientId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('client_idiolect_analysis')
        .select('id, client_id, conversation_transcript, voice_analysis, status, current_step, started_at, completed_at, created_at, updated_at')
        .eq('client_id', clientId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching idiolect analysis:', fetchError);
        setError('Failed to load analysis');
      }

      setAnalysis(data as IdiolectAnalysisData || null);
    } catch (err) {
      console.error('Error in fetchAnalysis:', err);
      setError('Failed to load analysis');
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchAnalysis();
  };

  return {
    analysis,
    voiceAnalysis: analysis?.voice_analysis || null,
    loading,
    error,
    refetch,
    isComplete: analysis?.status === 'completed',
    hasVoiceAnalysis: !!analysis?.voice_analysis
  };
};

export default useIdiolectAnalysis;
