import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type SceneContentUpload = Database['public']['Tables']['scene_content_uploads']['Row'];

// Maximum file size: 5GB
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB in bytes

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

  // Get a signed upload URL from the Edge Function (bypasses auth restrictions)
  const getSignedUploadUrl = async (bucketName: string, filePath: string): Promise<{ signedUrl: string; error: string | null }> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          bucketName,
          filePath,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get signed upload URL');
      }

      const data = await response.json();
      return { signedUrl: data.signedUrl, error: null };
    } catch (err: any) {
      console.error('Error getting signed upload URL:', err);
      return { signedUrl: '', error: err.message };
    }
  };

  // Upload a file using XMLHttpRequest with progress tracking
  const uploadFileWithProgress = (
    signedUrl: string,
    file: File,
    onProgress: (loaded: number, total: number) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText || 'Unknown error'}`));
        }
      });
      
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });
      
      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });
      
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);
    });
  };

  const uploadSceneContent = async (
    assignmentId: string,
    stepIndex: number,
    files: FileList | File[],
    onProgress?: (progress: { 
      fileIndex: number;
      fileName: string;
      loaded: number;
      total: number;
      percentage: number;
      totalLoaded: number;
      totalSize: number;
      overallPercentage: number;
    }) => void
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

      const clientId = (assignment as any).client_id;
      const fileArray = Array.from(files);
      
      // Validate file sizes
      for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 5GB.`);
        }
      }
      
      // Calculate total size for overall progress
      const totalSize = fileArray.reduce((sum, file) => sum + file.size, 0);
      const fileProgress: number[] = new Array(fileArray.length).fill(0);

      // Upload files sequentially to track progress properly
      const results: any[] = [];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        
        // Generate unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${clientId}/${assignmentId}/step_${stepIndex}/${fileName}`;

        // Get signed upload URL from Edge Function (uses service role, bypasses 50MB limit)
        const { signedUrl, error: urlError } = await getSignedUploadUrl('scene-content', filePath);
        
        if (urlError || !signedUrl) {
          throw new Error(urlError || 'Failed to get upload URL');
        }

        // Upload using XMLHttpRequest for progress tracking
        await uploadFileWithProgress(
          signedUrl,
          file,
          (loaded, total) => {
            fileProgress[i] = loaded;
            const totalLoaded = fileProgress.reduce((sum, l) => sum + l, 0);
            
            if (onProgress) {
              onProgress({
                fileIndex: i,
                fileName: file.name,
                loaded,
                total,
                percentage: Math.round((loaded / total) * 100),
                totalLoaded,
                totalSize,
                overallPercentage: Math.round((totalLoaded / totalSize) * 100)
              });
            }
          }
        );

        // Create database record
        const { data, error: dbError } = await (supabase
          .from('scene_content_uploads') as any)
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

        results.push(data);
      }
      
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
    downloadFile,
    MAX_FILE_SIZE
  };
};
