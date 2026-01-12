import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { ContentScene, SceneInstruction } from '../types';
import { createSceneCompletedNotification } from '../lib/notificationHelpers';
import { useAuth } from '../contexts/AuthContext';

type ContentSceneRow = Database['public']['Tables']['content_scenes']['Row'];
type ContentSceneInsert = Database['public']['Tables']['content_scenes']['Insert'];
type ContentSceneUpdate = Database['public']['Tables']['content_scenes']['Update'];
type ClientSceneAssignment = Database['public']['Tables']['client_scene_assignments']['Row'];

interface SceneWithStats extends ContentSceneRow {
  assignments_count?: number;
  completed_count?: number;
}

export const useContentScenes = () => {
  const { teamMember } = useAuth();
  const [scenes, setScenes] = useState<SceneWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScenes = useCallback(async () => {
    // Don't fetch until we have tenant context
    if (!teamMember?.tenant_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch all scenes with assignment counts filtered by tenant clients
      const { data: scenesData, error: scenesError } = await supabase
        .from('content_scenes')
        .select(`
          *,
          client_scene_assignments (
            id,
            status,
            clients!inner (tenant_id)
          )
        `)
        .order('created_at', { ascending: false });

      if (scenesError) throw scenesError;

      // Calculate stats for each scene (only counting assignments for our tenant's clients)
      const scenesWithStats = scenesData?.map(scene => {
        const assignments = ((scene as any).client_scene_assignments || [])
          .filter((a: any) => a.clients?.tenant_id === teamMember.tenant_id);
        return {
          ...scene,
          assignments_count: assignments.length,
          completed_count: assignments.filter((a: any) => a.status === 'completed').length
        };
      }) || [];

      setScenes(scenesWithStats);
    } catch (err: any) {
      console.error('Error fetching scenes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [teamMember?.tenant_id]);

  const fetchClientScenes = async (clientId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('client_scene_assignments')
        .select(`
          *,
          content_scenes (*),
          clients (username, avatar_url)
        `)
        .eq('client_id', clientId)
        .order('assigned_at', { ascending: false });

      if (fetchError) throw fetchError;

      return { data: data || [], error: null };
    } catch (err: any) {
      console.error('Error fetching client scenes:', err);
      return { data: [], error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const createScene = async (sceneData: {
    title: string;
    location?: string;
    props?: string;
    instructions: SceneInstruction[];
    is_template?: boolean;
    is_default_for_new_clients?: boolean;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error: insertError } = await supabase
        .from('content_scenes')
        .insert({
          title: sceneData.title,
          location: sceneData.location || null,
          props: sceneData.props || null,
          instructions: sceneData.instructions as any,
          is_template: sceneData.is_template ?? true,
          is_default_for_new_clients: sceneData.is_default_for_new_clients ?? false,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchScenes();
      return { data, error: null };
    } catch (err: any) {
      console.error('Error creating scene:', err);
      return { data: null, error: err.message };
    }
  };

  const updateScene = async (id: string, sceneData: {
    title?: string;
    location?: string;
    props?: string;
    instructions?: SceneInstruction[];
    is_template?: boolean;
    is_default_for_new_clients?: boolean;
  }) => {
    try {
      const updateData: any = {};
      
      if (sceneData.title !== undefined) updateData.title = sceneData.title;
      if (sceneData.location !== undefined) updateData.location = sceneData.location || null;
      if (sceneData.props !== undefined) updateData.props = sceneData.props || null;
      if (sceneData.instructions !== undefined) updateData.instructions = sceneData.instructions;
      if (sceneData.is_template !== undefined) updateData.is_template = sceneData.is_template;
      if (sceneData.is_default_for_new_clients !== undefined) {
        updateData.is_default_for_new_clients = sceneData.is_default_for_new_clients;
      }

      const { data, error: updateError } = await supabase
        .from('content_scenes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchScenes();
      return { data, error: null };
    } catch (err: any) {
      console.error('Error updating scene:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteScene = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('content_scenes')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      await fetchScenes();
      return { error: null };
    } catch (err: any) {
      console.error('Error deleting scene:', err);
      return { error: err.message };
    }
  };

  const assignScene = async (
    sceneId: string,
    clientIds: string[],
    notes?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, check which clients already have this scene assigned
      const { data: existingAssignments, error: checkError } = await supabase
        .from('client_scene_assignments')
        .select('client_id')
        .eq('scene_id', sceneId)
        .in('client_id', clientIds);

      if (checkError) throw checkError;

      // Get the client IDs that already have this scene
      const alreadyAssignedClientIds = new Set(
        existingAssignments?.map(a => a.client_id) || []
      );

      // Filter out clients who already have the scene assigned
      const clientsToAssign = clientIds.filter(id => !alreadyAssignedClientIds.has(id));

      // If no new clients to assign, return early with info
      if (clientsToAssign.length === 0) {
        await fetchScenes();
        return { 
          data: [], 
          error: null,
          skipped: clientIds.length,
          assigned: 0
        };
      }

      const assignments = clientsToAssign.map(clientId => ({
        client_id: clientId,
        scene_id: sceneId,
        assigned_by: user.id,
        notes: notes || null,
        status: 'pending' as const
      }));

      const { data, error: insertError } = await supabase
        .from('client_scene_assignments')
        .insert(assignments)
        .select();

      if (insertError) throw insertError;

      await fetchScenes();
      return { 
        data, 
        error: null,
        skipped: alreadyAssignedClientIds.size,
        assigned: clientsToAssign.length
      };
    } catch (err: any) {
      console.error('Error assigning scene:', err);
      return { data: null, error: err.message };
    }
  };

  const unassignScene = async (assignmentId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('client_scene_assignments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) throw deleteError;

      await fetchScenes();
      return { error: null };
    } catch (err: any) {
      console.error('Error unassigning scene:', err);
      return { error: err.message };
    }
  };

  const markSceneComplete = async (assignmentId: string) => {
    try {
      // First, get the assignment with client and scene details for notification
      const { data: assignmentDetails, error: fetchError } = await supabase
        .from('client_scene_assignments')
        .select(`
          *,
          clients (id, username),
          content_scenes (id, title)
        `)
        .eq('id', assignmentId)
        .single();

      if (fetchError) throw fetchError;

      // Update the assignment status
      const { data, error: updateError } = await supabase
        .from('client_scene_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Send notification to team members and admins
      const client = (assignmentDetails as any).clients;
      const scene = (assignmentDetails as any).content_scenes;
      
      if (client && scene) {
        await createSceneCompletedNotification(
          client.id,
          client.username,
          scene.title,
          assignmentId
        );
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('Error marking scene complete:', err);
      return { data: null, error: err.message };
    }
  };

  const duplicateScene = async (sceneId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch the scene to duplicate
      const { data: originalScene, error: fetchError } = await supabase
        .from('content_scenes')
        .select('*')
        .eq('id', sceneId)
        .single();

      if (fetchError) throw fetchError;

      // Create a new scene with the same data
      const { data, error: insertError } = await supabase
        .from('content_scenes')
        .insert({
          title: `${originalScene.title} (Copy)`,
          location: originalScene.location,
          props: originalScene.props,
          instructions: originalScene.instructions,
          is_template: originalScene.is_template,
          is_default_for_new_clients: false,
          created_by: user.id
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchScenes();
      return { data, error: null };
    } catch (err: any) {
      console.error('Error duplicating scene:', err);
      return { data: null, error: err.message };
    }
  };

  useEffect(() => {
    fetchScenes();
  }, [fetchScenes]);

  return {
    scenes,
    loading,
    error,
    fetchScenes,
    fetchClientScenes,
    createScene,
    updateScene,
    deleteScene,
    assignScene,
    unassignScene,
    markSceneComplete,
    duplicateScene
  };
};

