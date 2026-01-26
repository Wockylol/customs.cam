import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface PersonalInfo {
  legalName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
}

export interface PlatformCredential {
  id: string;
  platform: string;
  email: string;
  password: string;
}

export interface SocialMediaAccount {
  id: string;
  platform: string;
  username: string;
}

export const useClientDetails = (clientId: string | undefined) => {
  const [personalInfo, setPersonalInfo] = useState<any>(null);
  const [platformCredentials, setPlatformCredentials] = useState<PlatformCredential[]>([]);
  const [socialMediaAccounts, setSocialMediaAccounts] = useState<SocialMediaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent race conditions during save operations
  const savingCredentialsRef = useRef(false);
  const savingSocialMediaRef = useRef(false);

  useEffect(() => {
    if (clientId) {
      fetchPersonalInfo();
      fetchPlatformCredentials();
      fetchSocialMediaAccounts();
    }
  }, [clientId]);

  const fetchPersonalInfo = async () => {
    if (!clientId) return;
    
    console.log('Fetching personal info for client:', clientId);
    
    const { data, error } = await supabase
      .from('client_personal_info')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching personal info:', error);
    } else {
      console.log('Fetched personal info:', data);
      setPersonalInfo(data);
    }
    
    setLoading(false);
  };

  const fetchPlatformCredentials = async () => {
    if (!clientId) return;
    
    console.log('Fetching platform credentials for client:', clientId);
    
    const { data, error } = await supabase
      .from('client_platform_credentials')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error fetching platform credentials:', error);
    } else {
      console.log('Fetched platform credentials:', data);
      if (data) {
        setPlatformCredentials(data.map((cred: any) => ({
          id: cred.id,
          platform: cred.platform,
          email: cred.email || '',
          password: cred.password || ''
        })));
      }
    }
  };

  const fetchSocialMediaAccounts = async () => {
    if (!clientId) return;
    
    console.log('Fetching social media accounts for client:', clientId);
    
    const { data, error } = await supabase
      .from('client_social_media')
      .select('*')
      .eq('client_id', clientId);
    
    if (error) {
      console.error('Error fetching social media accounts:', error);
    } else {
      console.log('Fetched social media accounts:', data);
      if (data) {
        setSocialMediaAccounts(data.map((acc: any) => ({
          id: acc.id,
          platform: acc.platform,
          username: acc.username || ''
        })));
      }
    }
  };

  const savePersonalInfo = async (info: PersonalInfo) => {
    if (!clientId) return { error: 'Client ID required' };
    
    console.log('Saving personal info for client:', clientId, info);
    
    const { error } = await supabase.rpc('upsert_client_personal_info', {
      p_client_id: clientId,
      p_legal_name: info.legalName || null,
      p_email: info.email || null,
      p_phone: info.phone || null,
      p_date_of_birth: info.dateOfBirth || null,
      p_address: info.address || null
    });
    
    if (error) {
      console.error('Error saving personal info:', error);
      return { error: error.message };
    }
    
    console.log('Personal info saved successfully');
    await fetchPersonalInfo();
    return { error: null };
  };

  const savePlatformCredentials = async (credentials: PlatformCredential[]) => {
    if (!clientId) return { error: 'Client ID required' };
    
    // Prevent concurrent saves (race condition protection)
    if (savingCredentialsRef.current) {
      console.log('Platform credentials save already in progress, skipping');
      return { error: null }; // Return success to avoid error messages for duplicate clicks
    }
    
    savingCredentialsRef.current = true;
    
    try {
      console.log('Saving platform credentials for client:', clientId, credentials);
      
      // Delete all existing credentials for this client
      const { error: deleteError } = await supabase
        .from('client_platform_credentials')
        .delete()
        .eq('client_id', clientId);
      
      if (deleteError) {
        console.error('Error deleting old credentials:', deleteError);
        return { error: deleteError.message };
      }
      
      // Insert new credentials
      if (credentials.length > 0) {
        const { error: insertError } = await supabase
          .from('client_platform_credentials')
          .insert(
            credentials.map(cred => ({
              client_id: clientId,
              platform: cred.platform,
              email: cred.email,
              password: cred.password
            }))
          );
        
        if (insertError) {
          console.error('Error inserting credentials:', insertError);
          return { error: insertError.message };
        }
      }
      
      console.log('Platform credentials saved successfully');
      await fetchPlatformCredentials();
      return { error: null };
    } finally {
      savingCredentialsRef.current = false;
    }
  };

  const saveSocialMediaAccounts = async (accounts: SocialMediaAccount[]) => {
    if (!clientId) return { error: 'Client ID required' };
    
    // Prevent concurrent saves (race condition protection)
    if (savingSocialMediaRef.current) {
      console.log('Social media accounts save already in progress, skipping');
      return { error: null }; // Return success to avoid error messages for duplicate clicks
    }
    
    savingSocialMediaRef.current = true;
    
    try {
      console.log('Saving social media accounts for client:', clientId, accounts);
      
      // Delete all existing accounts for this client
      const { error: deleteError } = await supabase
        .from('client_social_media')
        .delete()
        .eq('client_id', clientId);
      
      if (deleteError) {
        console.error('Error deleting old social media:', deleteError);
        return { error: deleteError.message };
      }
      
      // Insert new accounts
      if (accounts.length > 0) {
        const { error: insertError } = await supabase
          .from('client_social_media')
          .insert(
            accounts.map(acc => ({
              client_id: clientId,
              platform: acc.platform,
              username: acc.username
            }))
          );
        
        if (insertError) {
          console.error('Error inserting social media:', insertError);
          return { error: insertError.message };
        }
      }
      
      console.log('Social media accounts saved successfully');
      await fetchSocialMediaAccounts();
      return { error: null };
    } finally {
      savingSocialMediaRef.current = false;
    }
  };

  return {
    personalInfo,
    platformCredentials,
    socialMediaAccounts,
    loading,
    savePersonalInfo,
    savePlatformCredentials,
    saveSocialMediaAccounts,
    refetch: () => {
      fetchPersonalInfo();
      fetchPlatformCredentials();
      fetchSocialMediaAccounts();
    }
  };
};
