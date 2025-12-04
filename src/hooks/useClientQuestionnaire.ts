import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useClientQuestionnaire = (clientId: string | undefined) => {
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [personas, setPersonas] = useState<string[]>([]);
  const [contentDetails, setContentDetails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchQuestionnaire();
      fetchPersonas();
      fetchContentDetails();
    }
  }, [clientId]);

  const fetchQuestionnaire = async () => {
    if (!clientId) return;
    
    console.log('Fetching questionnaire for client:', clientId);
    
    const { data, error } = await supabase
      .from('client_questionnaire')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching questionnaire:', error);
    } else {
      console.log('Fetched questionnaire:', data);
      setQuestionnaire(data);
    }
    
    setLoading(false);
  };

  const fetchPersonas = async () => {
    if (!clientId) return;
    
    console.log('Fetching personas for client:', clientId);
    
    const { data, error } = await supabase
      .from('client_personas')
      .select('persona')
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error fetching personas:', error);
    } else {
      console.log('Fetched personas:', data);
      if (data) setPersonas(data.map((p: any) => p.persona));
    }
  };

  const fetchContentDetails = async () => {
    if (!clientId) return;
    
    console.log('Fetching content details for client:', clientId);
    
    const { data, error } = await supabase
      .from('client_content_details')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error fetching content details:', error);
      return;
    }
    
    console.log('Fetched content details:', data);
    
    // Map database labels back to frontend keys
    const labelToKey: Record<string, string> = {
      'Butt Pictures/Videos': 'buttContent',
      'Breast Pictures/Videos': 'breastContent',
      'Visible Nipples Pictures/Videos': 'visibleNipples',
      'Girl/Girl Pictures/Videos': 'girlGirlContent',
      'Boy/Girl Pictures/Videos': 'boyGirlContent',
      'Twerk Videos': 'twerkVideos',
      'Full Nudity Censored': 'fullNudityCensored',
      'Full Nudity Uncensored': 'fullNudityUncensored',
      'Masturbation Pictures/Videos': 'masturbation',
      'Fetish/Kink Content': 'fetishKink',
      'Feet': 'feet',
      'Dick Rates': 'dickRates',
      'Custom Requests': 'customRequests',
    };
    
    if (data) {
      const mappedData = data.map((detail: any) => ({
        ...detail,
        content_type: labelToKey[detail.content_type] || detail.content_type
      }));
      setContentDetails(mappedData);
    }
  };

  const saveQuestionnaire = async (data: any) => {
    if (!clientId) return { error: 'Client ID required' };
    
    console.log('Saving questionnaire for client:', clientId, data);
    
    // Clean the data: convert empty strings to null for date fields and other nullable fields
    const cleanedData = { ...data };
    Object.keys(cleanedData).forEach(key => {
      // Convert empty strings to null
      if (cleanedData[key] === '') {
        cleanedData[key] = null;
      }
    });
    
    console.log('Cleaned questionnaire data:', cleanedData);
    
    const { error } = await supabase.rpc('upsert_client_questionnaire', {
      p_client_id: clientId,
      p_questionnaire_data: cleanedData
    });
    
    if (error) {
      console.error('Error saving questionnaire:', error);
      return { error: error.message };
    }
    
    console.log('Questionnaire saved successfully');
    await fetchQuestionnaire();
    return { error: null };
  };

  const savePersonas = async (personasList: string[]) => {
    if (!clientId) return { error: 'Client ID required' };
    
    console.log('Saving personas for client:', clientId, personasList);
    
    const { error } = await supabase.rpc('set_client_personas', {
      p_client_id: clientId,
      p_personas: personasList
    });
    
    if (error) {
      console.error('Error saving personas:', error);
      return { error: error.message };
    }
    
    console.log('Personas saved successfully');
    await fetchPersonas();
    return { error: null };
  };

  const saveContentDetail = async (contentType: string, enabled: boolean, priceMin: number, priceMax: number) => {
    if (!clientId) return { error: 'Client ID required' };
    
    console.log('Saving content detail:', { contentType, enabled, priceMin, priceMax });
    
    const { error } = await supabase.rpc('upsert_client_content_detail', {
      p_client_id: clientId,
      p_content_type: contentType,
      p_enabled: enabled,
      p_price_min: priceMin,
      p_price_max: priceMax
    });
    
    if (error) {
      console.error('Error saving content detail:', error);
      return { error: error.message };
    }
    
    console.log('Content detail saved successfully for:', contentType);
    await fetchContentDetails();
    return { error: null };
  };

  const saveAllContentDetails = async (details: Record<string, any>) => {
    if (!clientId) return { error: 'Client ID required' };
    
    console.log('Saving all content details:', details);
    
    // Map frontend keys to database labels
    const keyToLabel: Record<string, string> = {
      buttContent: 'Butt Pictures/Videos',
      breastContent: 'Breast Pictures/Videos',
      visibleNipples: 'Visible Nipples Pictures/Videos',
      girlGirlContent: 'Girl/Girl Pictures/Videos',
      boyGirlContent: 'Boy/Girl Pictures/Videos',
      twerkVideos: 'Twerk Videos',
      fullNudityCensored: 'Full Nudity Censored',
      fullNudityUncensored: 'Full Nudity Uncensored',
      masturbation: 'Masturbation Pictures/Videos',
      fetishKink: 'Fetish/Kink Content',
      feet: 'Feet',
      dickRates: 'Dick Rates',
      customRequests: 'Custom Requests',
    };
    
    const promises = Object.entries(details).map(([key, value]) => 
      saveContentDetail(keyToLabel[key] || key, value.enabled, value.priceMin, value.priceMax)
    );
    
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    
    if (errors.length > 0) {
      console.error('Errors saving some content details:', errors);
      return { error: `Failed to save ${errors.length} content details` };
    }
    
    console.log('All content details saved successfully');
    return { error: null };
  };

  return {
    questionnaire,
    personas,
    contentDetails,
    loading,
    saveQuestionnaire,
    savePersonas,
    saveContentDetail,
    saveAllContentDetails,
    refetch: () => {
      fetchQuestionnaire();
      fetchPersonas();
      fetchContentDetails();
    }
  };
};

