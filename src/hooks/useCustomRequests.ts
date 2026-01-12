import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { useAuth } from '../contexts/AuthContext';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];
type CustomRequestInsert = Database['public']['Tables']['custom_requests']['Insert'];

export const useCustomRequests = () => {
  const { user, teamMember } = useAuth();
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomRequests = useCallback(async () => {
    // Don't fetch until we have tenant context
    if (!teamMember?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      // Don't clear existing data during refetch to prevent UI flicker
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('custom_requests')
        .select(`
          *,
          clients!inner(username, tenant_id),
          team_members!created_by(full_name),
          team_approved_member:team_members!team_approved_by(full_name)
        `)
        .eq('clients.tenant_id', teamMember.tenant_id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Only update if we got data
      if (data) {
        setCustomRequests(data);
      }
    } catch (err: any) {
      console.error('Error fetching custom requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamMember?.tenant_id]);

  const addCustomRequest = async (customData: {
    clientUsername: string;
    fanName: string;
    description: string;
    fanLifetimeSpend?: number;
    proposedAmount: number;
    amountPaid?: number;
    length: string;
    chatLink?: string;
    notes?: string;
    images?: File[];
    isVoiceVideoCall?: boolean;
    callScheduledAt?: string;
  }) => {
    try {
      // First, find the client by username
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .ilike('username', customData.clientUsername)
        .single();

      if (clientError || !client) {
        throw new Error(`Client with username "${customData.clientUsername}" not found`);
      }

      const insertData: CustomRequestInsert = {
        client_id: client.id,
        fan_name: customData.fanName,
        description: customData.description,
        fan_lifetime_spend: customData.fanLifetimeSpend || null,
        proposed_amount: customData.proposedAmount,
        amount_paid: customData.amountPaid || null,
        length_duration: customData.length || null,
        chat_link: customData.chatLink || null,
        notes: customData.notes || null,
        status: 'pending',
        priority: 'medium',
        date_submitted: new Date().toISOString().split('T')[0],
        created_by: user?.id || null,
        is_voice_video_call: customData.isVoiceVideoCall || false,
        call_scheduled_at: customData.callScheduledAt ? new Date(customData.callScheduledAt).toISOString() : null
      };

      const { data, error } = await supabase
        .from('custom_requests')
        .insert(insertData)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add the new custom request to the local state
      setCustomRequests(prev => [data, ...prev]);
      
      // Upload images if any were provided
      if (customData.images && customData.images.length > 0) {
        try {
          await uploadCustomImages(data.id, customData.images);
        } catch (imageError) {
          console.error('Error uploading images:', imageError);
          // Don't fail the entire request if image upload fails
        }
      }
      
      return { data, error: null };
    } catch (err: any) {
      console.error('Error adding custom request:', err);
      return { data: null, error: err.message };
    }
  };

  const uploadCustomImages = async (customRequestId: string, images: File[]) => {
    const uploadPromises = images.map(async (file, index) => {
      try {
        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${customRequestId}/ref-${Date.now()}-${index}.${fileExt}`;
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-content')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Save upload record to database
        const { error: dbError } = await supabase
          .from('content_uploads')
          .insert({
            custom_request_id: customRequestId,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: 'team'
          });

        if (dbError) {
          throw dbError;
        }

        return { success: true, fileName };
      } catch (err) {
        console.error(`Error uploading image ${file.name}:`, err);
        return { success: false, fileName: file.name, error: err };
      }
    });

    const results = await Promise.all(uploadPromises);
    const failed = results.filter(r => !r.success);
    
    if (failed.length > 0) {
      console.warn(`Failed to upload ${failed.length} images:`, failed);
    }
    
    return results;
  };

  const approveByTeam = async (customId: string, teamMemberId: string) => {
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .update({ 
          status: 'pending_client_approval',
          team_approved_by: teamMemberId,
          team_approved_at: new Date().toISOString()
        })
        .eq('id', customId)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setCustomRequests(prev => 
        prev.map(request => 
          request.id === customId ? data : request
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error approving custom request:', err);
      return { data: null, error: err.message };
    }
  };

  const denyByTeam = async (customId: string) => {
    try {
      const { error } = await supabase
        .from('custom_requests')
        .delete()
        .eq('id', customId);

      if (error) {
        throw error;
      }

      // Remove from local state
      setCustomRequests(prev => prev.filter(request => request.id !== customId));
      return { error: null };
    } catch (err: any) {
      console.error('Error denying custom request:', err);
      return { error: err.message };
    }
  };

  const approveByClient = async (customId: string, estimatedDeliveryDate: string) => {
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .update({ 
          status: 'in_progress',
          client_approved_at: new Date().toISOString(),
          estimated_delivery_date: estimatedDeliveryDate
        })
        .eq('id', customId)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setCustomRequests(prev => 
        prev.map(request => 
          request.id === customId ? data : request
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error approving by client:', err);
      return { data: null, error: err.message };
    }
  };

  const markAsCompleted = async (customId: string) => {
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .update({ 
          status: 'completed',
          date_completed: new Date().toISOString().split('T')[0]
        })
        .eq('id', customId)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setCustomRequests(prev => 
        prev.map(request => 
          request.id === customId ? data : request
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error marking custom as completed:', err);
      return { data: null, error: err.message };
    }
  };

  const markAsDelivered = async (customId: string) => {
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .update({ 
          status: 'delivered'
        })
        .eq('id', customId)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setCustomRequests(prev => 
        prev.map(request => 
          request.id === customId ? data : request
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error marking custom as delivered:', err);
      return { data: null, error: err.message };
    }
  };

  const updateCustomRequest = async (customId: string, updateData: {
    fan_name?: string;
    fan_email?: string | null;
    description?: string;
    proposed_amount?: number;
    amount_paid?: number | null;
    length_duration?: string | null;
    notes?: string | null;
    chat_link?: string | null;
    fan_lifetime_spend?: number | null;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    estimated_delivery_date?: string | null;
    date_due?: string | null;
  }) => {
    try {
      const { data, error } = await supabase
        .from('custom_requests')
        .update(updateData)
        .eq('id', customId)
        .select(`
          *,
          clients!inner(username),
          team_members!created_by(full_name),
          team_approved_member:team_members!team_approved_by(full_name)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update the local state
      setCustomRequests(prev => 
        prev.map(request => 
          request.id === customId ? data : request
        )
      );

      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating custom request:', err);
      return { data: null, error: err.message };
    }
  };

  useEffect(() => {
    fetchCustomRequests();
  }, [fetchCustomRequests]);

  return {
    customRequests,
    loading,
    error,
    fetchCustomRequests,
    addCustomRequest,
    approveByTeam,
    denyByTeam,
    approveByClient,
    markAsCompleted,
    markAsDelivered,
    updateCustomRequest,
    uploadCustomImages
  };
};