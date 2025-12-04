import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type SceneContentUpload = Database['public']['Tables']['scene_content_uploads']['Row'];

export const useSceneUploads = (assignmentId?: string) => {
  const [uploads, setUploads] = useState<SceneContentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSceneUploads = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('scene_content_uploads')
        .select('*')
        .eq('assignment_id', id)
        .order('step_index', { ascending: true });

      if (fetchError) throw fetchError;

      setUploads(data || []);
      return { data: data || [], error: null };
    } catch (err: any) {
      console.error('Error fetching scene uploads:', err);
      setError(err.message);
      return { data: [], error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getUploadsByStep = (stepIndex: number) => {
    return uploads.filter(upload => upload.step_index === stepIndex);
  };

  const uploadSceneContent = async (
    assignmentId: string,
    stepIndex: number,
    files: FileList | File[]
  ) => {
    try {
      // First, get the client_id from the assignment
      const { data: assignment, error: assignmentError } = await supabase
        .from('client_scene_assignments')
        .select('client_id')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      if (!assignment) throw new Error('Assignment not found');

      const clientId = assignment.client_id;
      const fileArray = Array.from(files);
      const uploadPromises = fileArray.map(async (file) => {
        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${clientId}/${assignmentId}/step_${stepIndex}/${fileName}`;

        // Upload to storage
        const { error: storageError } = await supabase.storage
          .from('scene-content')
          .upload(filePath, file);

        if (storageError) throw storageError;

        // Create database record
        const { data, error: dbError } = await supabase
          .from('scene_content_uploads')
          .insert({
            assignment_id: assignmentId,
            step_index: stepIndex,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: clientId
          })
          .select()
          .single();

        if (dbError) throw dbError;

        return data;
      });

      const results = await Promise.all(uploadPromises);
      
      // Refresh uploads
      await fetchSceneUploads(assignmentId);
      
      return { data: results, error: null };
    } catch (err: any) {
      console.error('Error uploading scene content:', err);
      return { data: null, error: err.message };
    }
  };

  const deleteSceneUpload = async (uploadId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('scene-content')
        .remove([filePath]);

      if (storageError) {
        console.error('Error deleting from storage:', storageError);
        // Continue anyway to remove DB record
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('scene_content_uploads')
        .delete()
        .eq('id', uploadId);

      if (dbError) throw dbError;

      // Refresh uploads
      if (assignmentId) {
        await fetchSceneUploads(assignmentId);
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error deleting scene upload:', err);
      return { error: err.message };
    }
  };

  const getDownloadUrl = async (filePath: string) => {
    try {
      // Get public URL since bucket allows public reads
      const { data } = supabase.storage
        .from('scene-content')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      console.error('Error creating download URL:', err);
      return { url: null, error: err.message };
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('scene-content')
        .download(filePath);

      if (error) throw error;

      // Create blob URL and trigger download
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { error: null };
    } catch (err: any) {
      console.error('Error downloading file:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (assignmentId) {
      fetchSceneUploads(assignmentId);
    }
  }, [assignmentId]);

  return {
    uploads,
    loading,
    error,
    fetchSceneUploads,
    getUploadsByStep,
    uploadSceneContent,
    deleteSceneUpload,
    getDownloadUrl,
    downloadFile
  };
};

