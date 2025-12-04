import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ClientPreferences = Database['public']['Tables']['client_preferences']['Row'];
type ClientPreferencesInsert = Database['public']['Tables']['client_preferences']['Insert'];
type ClientPreferencesUpdate = Database['public']['Tables']['client_preferences']['Update'];

export const useClientPreferences = (clientId?: string) => {
  const [preferences, setPreferences] = useState<ClientPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('client_preferences')
        .select('*')
        .eq('client_id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setPreferences(data);
    } catch (err: any) {
      console.error('Error fetching client preferences:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createPreferences = async (clientId: string, preferencesData: {
    minimumPricing?: number;
    videoCall?: boolean;
    audioCall?: boolean;
    dickRates?: boolean;
    fanSigns?: boolean;
    usingFansName?: boolean;
    sayingSpecificThings?: boolean;
    roleplaying?: boolean;
    usingToysProps?: boolean;
    specificOutfits?: boolean;
    fullNudityCensored?: boolean;
    fullNudityUncensored?: boolean;
    masturbation?: boolean;
    analContent?: boolean;
    feetContent?: boolean;
  }) => {
    try {
      const insertData: ClientPreferencesInsert = {
        client_id: clientId,
        minimum_pricing: preferencesData.minimumPricing || 0,
        video_call: preferencesData.videoCall || false,
        audio_call: preferencesData.audioCall || false,
        dick_rates: preferencesData.dickRates || false,
        fan_signs: preferencesData.fanSigns || false,
        using_fans_name: preferencesData.usingFansName || false,
        saying_specific_things: preferencesData.sayingSpecificThings || false,
        roleplaying: preferencesData.roleplaying || false,
        using_toys_props: preferencesData.usingToysProps || false,
        specific_outfits: preferencesData.specificOutfits || false,
        full_nudity_censored: preferencesData.fullNudityCensored || false,
        full_nudity_uncensored: preferencesData.fullNudityUncensored || false,
        masturbation: preferencesData.masturbation || false,
        anal_content: preferencesData.analContent || false,
        feet_content: preferencesData.feetContent || false,
      };

      const { data, error } = await supabase
        .from('client_preferences')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPreferences(data);
      return { data, error: null };
    } catch (err: any) {
      console.error('Error creating client preferences:', err);
      return { data: null, error: err.message };
    }
  };

  const updatePreferences = async (clientId: string, preferencesData: {
    minimumPricing?: number;
    videoCall?: boolean;
    audioCall?: boolean;
    dickRates?: boolean;
    fanSigns?: boolean;
    usingFansName?: boolean;
    sayingSpecificThings?: boolean;
    roleplaying?: boolean;
    usingToysProps?: boolean;
    specificOutfits?: boolean;
    fullNudityCensored?: boolean;
    fullNudityUncensored?: boolean;
    masturbation?: boolean;
    analContent?: boolean;
    feetContent?: boolean;
  }) => {
    try {
      const updateData: ClientPreferencesUpdate = {};
      
      if (preferencesData.minimumPricing !== undefined) updateData.minimum_pricing = preferencesData.minimumPricing;
      if (preferencesData.videoCall !== undefined) updateData.video_call = preferencesData.videoCall;
      if (preferencesData.audioCall !== undefined) updateData.audio_call = preferencesData.audioCall;
      if (preferencesData.dickRates !== undefined) updateData.dick_rates = preferencesData.dickRates;
      if (preferencesData.fanSigns !== undefined) updateData.fan_signs = preferencesData.fanSigns;
      if (preferencesData.usingFansName !== undefined) updateData.using_fans_name = preferencesData.usingFansName;
      if (preferencesData.sayingSpecificThings !== undefined) updateData.saying_specific_things = preferencesData.sayingSpecificThings;
      if (preferencesData.roleplaying !== undefined) updateData.roleplaying = preferencesData.roleplaying;
      if (preferencesData.usingToysProps !== undefined) updateData.using_toys_props = preferencesData.usingToysProps;
      if (preferencesData.specificOutfits !== undefined) updateData.specific_outfits = preferencesData.specificOutfits;
      if (preferencesData.fullNudityCensored !== undefined) updateData.full_nudity_censored = preferencesData.fullNudityCensored;
      if (preferencesData.fullNudityUncensored !== undefined) updateData.full_nudity_uncensored = preferencesData.fullNudityUncensored;
      if (preferencesData.masturbation !== undefined) updateData.masturbation = preferencesData.masturbation;
      if (preferencesData.analContent !== undefined) updateData.anal_content = preferencesData.analContent;
      if (preferencesData.feetContent !== undefined) updateData.feet_content = preferencesData.feetContent;

      const { data, error } = await supabase
        .from('client_preferences')
        .update(updateData)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setPreferences(data);
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating client preferences:', err);
      return { data: null, error: err.message };
    }
  };

  const savePreferences = async (clientId: string, preferencesData: {
    minimumPricing?: number;
    videoCall?: boolean;
    audioCall?: boolean;
    dickRates?: boolean;
    fanSigns?: boolean;
    usingFansName?: boolean;
    sayingSpecificThings?: boolean;
    roleplaying?: boolean;
    usingToysProps?: boolean;
    specificOutfits?: boolean;
    fullNudityCensored?: boolean;
    fullNudityUncensored?: boolean;
    masturbation?: boolean;
    analContent?: boolean;
    feetContent?: boolean;
  }) => {
    if (preferences) {
      return await updatePreferences(clientId, preferencesData);
    } else {
      return await createPreferences(clientId, preferencesData);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchPreferences(clientId);
    } else {
      // No clientId provided, stop loading
      setLoading(false);
      setPreferences(null);
      setError(null);
    }
  }, [clientId]);

  return {
    preferences,
    loading,
    error,
    fetchPreferences,
    savePreferences,
    createPreferences,
    updatePreferences
  };
};