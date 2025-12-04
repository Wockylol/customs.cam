import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientFullData {
  // Client basic info
  id: string;
  username: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  
  // Personal info
  personal_info: {
    legal_name: string | null;
    email: string | null;
    phone: string | null;
    date_of_birth: string | null;
    address: string | null;
  } | null;
  
  // Questionnaire
  questionnaire: {
    public_name: string | null;
    public_nicknames: string | null;
    public_birthday: string | null;
    gender: string | null;
    native_language: string | null;
    other_languages: string | null;
    sexual_orientation: string | null;
    ethnicity: string | null;
    height: string | null;
    weight: string | null;
    shoe_size: string | null;
    bra_size: string | null;
    zodiac_sign: string | null;
    favorite_colors: string | null;
    birth_place: string | null;
    current_location: string | null;
    hobbies: string | null;
    college: string | null;
    current_car: string | null;
    dream_car: string | null;
    pets: string | null;
    favorite_place_traveled: string | null;
    dream_destination: string | null;
    relationship_status: string | null;
    dream_date: string | null;
    has_children: string | null;
    other_career: string | null;
    known_from: string | null;
    additional_info: string | null;
  } | null;
  
  // Preferences
  preferences: {
    minimum_pricing: number;
    video_call: boolean;
    audio_call: boolean;
    dick_rates: boolean;
    fan_signs: boolean;
    using_fans_name: boolean;
    saying_specific_things: boolean;
    roleplaying: boolean;
    using_toys_props: boolean;
    specific_outfits: boolean;
    full_nudity_censored: boolean;
    full_nudity_uncensored: boolean;
    masturbation: boolean;
    anal_content: boolean;
    feet_content: boolean;
  } | null;
  
  // Personas
  personas: string[];
  
  // Content details
  content_details: Array<{
    id: string;
    content_type: string;
    enabled: boolean;
    price_min: number;
    price_max: number;
  }>;
  
  // Platform credentials (login info)
  platform_credentials: Array<{
    id: string;
    platform: string;
    email: string | null;
    password: string | null;
  }>;
}

export const useAllClientsData = () => {
  const [clients, setClients] = useState<ClientFullData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllClientsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('username');

      if (clientsError) throw clientsError;

      // Fetch all related data
      const clientIds = clientsData?.map(c => c.id) || [];
      
      const [
        { data: personalInfoData },
        { data: questionnaireData },
        { data: preferencesData },
        { data: personasData },
        { data: contentDetailsData },
        { data: platformCredentialsData }
      ] = await Promise.all([
        supabase.from('client_personal_info').select('*').in('client_id', clientIds),
        supabase.from('client_questionnaire').select('*').in('client_id', clientIds),
        supabase.from('client_preferences').select('*').in('client_id', clientIds),
        supabase.from('client_personas').select('*').in('client_id', clientIds),
        supabase.from('client_content_details').select('*').in('client_id', clientIds),
        supabase.from('client_platform_credentials').select('*').in('client_id', clientIds)
      ]);

      // Create maps for quick lookup
      const personalInfoMap = new Map(personalInfoData?.map(p => [p.client_id, p]) || []);
      const questionnaireMap = new Map(questionnaireData?.map(q => [q.client_id, q]) || []);
      const preferencesMap = new Map(preferencesData?.map(p => [p.client_id, p]) || []);
      
      // Group personas by client_id
      const personasMap = new Map<string, string[]>();
      personasData?.forEach(p => {
        if (!personasMap.has(p.client_id)) {
          personasMap.set(p.client_id, []);
        }
        personasMap.get(p.client_id)?.push(p.persona);
      });
      
      // Group content details by client_id
      const contentDetailsMap = new Map<string, Array<any>>();
      contentDetailsData?.forEach(cd => {
        if (!contentDetailsMap.has(cd.client_id)) {
          contentDetailsMap.set(cd.client_id, []);
        }
        contentDetailsMap.get(cd.client_id)?.push({
          id: cd.id,
          content_type: cd.content_type,
          enabled: cd.enabled,
          price_min: cd.price_min,
          price_max: cd.price_max,
        });
      });
      
      // Group platform credentials by client_id
      const platformCredentialsMap = new Map<string, Array<any>>();
      platformCredentialsData?.forEach(pc => {
        if (!platformCredentialsMap.has(pc.client_id)) {
          platformCredentialsMap.set(pc.client_id, []);
        }
        platformCredentialsMap.get(pc.client_id)?.push({
          id: pc.id,
          platform: pc.platform,
          email: pc.email,
          password: pc.password,
        });
      });

      // Combine all data
      const fullClientsData: ClientFullData[] = (clientsData || []).map(client => ({
        id: client.id,
        username: client.username,
        phone: client.phone,
        avatar_url: client.avatar_url,
        is_active: client.is_active,
        personal_info: personalInfoMap.get(client.id) || null,
        questionnaire: questionnaireMap.get(client.id) || null,
        preferences: preferencesMap.get(client.id) || null,
        personas: personasMap.get(client.id) || [],
        content_details: contentDetailsMap.get(client.id) || [],
        platform_credentials: platformCredentialsMap.get(client.id) || [],
      }));

      setClients(fullClientsData);
    } catch (err: any) {
      console.error('Error fetching all clients data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllClientsData();
  }, []);

  return {
    clients,
    loading,
    error,
    refetch: fetchAllClientsData,
  };
};

