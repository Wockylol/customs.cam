import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import * as tus from 'tus-js-client';

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

  // TUS resumable upload for large files
  const uploadFileWithTus = (
    bucketName: string,
    filePath: string,
    file: File,
    onProgress: (loaded: number, total: number) => void
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Get the Supabase project URL and session
        const { data: { session } } = await supabase.auth.getSession();
        
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        // Use anon key if no session (for public uploads)
        const authToken = session?.access_token || supabaseKey;
        
        const upload = new tus.Upload(file, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 1000, 3000, 5000, 10000], // Retry delays in ms
          chunkSize: 6 * 1024 * 1024, // 6MB chunks (Supabase recommended)
          headers: {
            authorization: `Bearer ${authToken}`,
            'x-upsert': 'true', // Allow overwriting if file exists
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: bucketName,
            objectName: filePath,
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600',
          },
          onError: (error) => {
            console.error('TUS upload error:', error);
            reject(new Error(`Upload failed: ${error.message}`));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            onProgress(bytesUploaded, bytesTotal);
          },
          onSuccess: () => {
            resolve();
          },
        });

        // Check if there's a previous upload to resume
        const previousUploads = await upload.findPreviousUploads();
        if (previousUploads.length > 0) {
          console.log('Resuming previous upload...');
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }

        // Start the upload
        upload.start();
      } catch (err: any) {
        reject(new Error(`Failed to initialize upload: ${err.message}`));
      }
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

        // Upload using TUS for resumable large file support
        await uploadFileWithTus(
          'scene-content',
          filePath,
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
