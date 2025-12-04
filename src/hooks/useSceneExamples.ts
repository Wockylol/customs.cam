import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type SceneExampleMedia = Database['public']['Tables']['scene_example_media']['Row'];

export const useSceneExamples = (sceneId?: string) => {
  const [examples, setExamples] = useState<SceneExampleMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExamples = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scene_example_media')
        .select('*')
        .eq('scene_id', id)
        .order('display_order', { ascending: true });

      if (fetchError) throw fetchError;

      setExamples(data || []);
      return { data: data || [], error: null };
    } catch (err: any) {
      console.error('Error fetching scene examples:', err);
      setError(err.message);
      return { data: [], error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const uploadExamples = async (sceneId: string, files: File[]) => {
    try {
      const uploadPromises = files.map(async (file, index) => {
        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${index}.${fileExt}`;
        const filePath = `${sceneId}/${fileName}`;

        // Upload to storage
        const { error: storageError } = await supabase.storage
          .from('scene-examples')
          .upload(filePath, file);

        if (storageError) throw storageError;

        // Create database record
        const { data, error: dbError } = await supabase
          .from('scene_example_media')
          .insert({
            scene_id: sceneId,
            file_name: file.name,
            file_path: filePath,
            file_type: file.type,
            display_order: index
          })
          .select()
          .single();

        if (dbError) throw dbError;

        return data;
      });

      const results = await Promise.all(uploadPromises);
      
      // Refresh examples
      await fetchExamples(sceneId);
      
      return { data: results, error: null };
    } catch (err: any) {
      console.error('Error uploading examples:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteExample = async (exampleId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('scene-examples')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue anyway to remove DB record
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('scene_example_media')
        .delete()
        .eq('id', exampleId);

      if (dbError) throw dbError;

      // Refresh examples
      if (sceneId) {
        await fetchExamples(sceneId);
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error deleting example:', err);
      return { error: err.message };
    }
  };

  const getDownloadUrl = async (filePath: string) => {
    try {
      // Get public URL since bucket allows public reads
      const { data } = supabase.storage
        .from('scene-examples')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      console.error('Error creating download URL:', err);
      return { url: null, error: err.message };
    }
  };

  useEffect(() => {
    if (sceneId) {
      fetchExamples(sceneId);
    }
  }, [sceneId]);

  return {
    examples,
    loading,
    error,
    fetchExamples,
    uploadExamples,
    deleteExample,
    getDownloadUrl
  };
};

