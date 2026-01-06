import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type SceneContentUpload = Database['public']['Tables']['scene_content_uploads']['Row'];

// Maximum file size: 5GB (R2 supports up to 5GB per upload, larger files need multipart)
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

  // Get a presigned upload URL from R2 via Edge Function
  const getR2UploadUrl = async (filePath: string, contentType: string): Promise<{ signedUrl: string; publicUrl: string | null; error: string | null }> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('[R2 Upload] Requesting presigned URL for:', filePath);
      
      const response = await fetch(`${supabaseUrl}/functions/v1/r2-upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          filePath,
          contentType,
        }),
      });

      console.log('[R2 Upload] Edge Function response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[R2 Upload] Edge Function error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || `Edge Function returned ${response.status}`);
        } catch {
          throw new Error(`Edge Function returned ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      console.log('[R2 Upload] Received presigned URL successfully');
      return { signedUrl: data.signedUrl, publicUrl: data.publicUrl, error: null };
    } catch (err: any) {
      console.error('[R2 Upload] Error getting presigned URL:', err);
      return { signedUrl: '', publicUrl: null, error: err.message };
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
      
      console.log('[R2 Upload] Starting XHR upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileSizeMB: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        fileType: file.type,
      });
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      });
      
      xhr.addEventListener('load', () => {
        console.log('[R2 Upload] XHR load event:', {
          status: xhr.status,
          statusText: xhr.statusText,
        });
        
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log('[R2 Upload] Upload successful!');
          resolve();
        } else {
          const errorMsg = `Upload failed with status ${xhr.status}: ${xhr.statusText || xhr.responseText || 'Unknown error'}`;
          console.error('[R2 Upload] Upload failed:', errorMsg);
          reject(new Error(errorMsg));
        }
      });
      
      xhr.addEventListener('error', (event) => {
        console.error('[R2 Upload] XHR network error:', event);
        reject(new Error('Network error during upload'));
      });
      
      xhr.addEventListener('abort', () => {
        console.warn('[R2 Upload] XHR upload aborted');
        reject(new Error('Upload was aborted'));
      });
      
      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      console.log('[R2 Upload] Sending file to R2...');
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
      
      console.log('[R2 Upload] Starting upload for', fileArray.length, 'file(s)');
      console.log('[R2 Upload] Client ID:', clientId);
      console.log('[R2 Upload] Assignment ID:', assignmentId);
      
      // Validate file sizes
      for (const file of fileArray) {
        console.log('[R2 Upload] File to upload:', {
          name: file.name,
          size: file.size,
          sizeInMB: (file.size / 1024 / 1024).toFixed(2) + ' MB',
          sizeInGB: (file.size / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          type: file.type
        });
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
        
        // Generate unique file path for R2
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `scene-content/${clientId}/${assignmentId}/step_${stepIndex}/${fileName}`;

        // Get presigned upload URL from R2 Edge Function
        const { signedUrl, publicUrl, error: urlError } = await getR2UploadUrl(filePath, file.type);
        
        if (urlError || !signedUrl) {
          throw new Error(urlError || 'Failed to get R2 upload URL');
        }

        // Upload to R2 using XMLHttpRequest for progress tracking
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

        // Create database record with R2 file path
        // Store the R2 public URL or the file path for later retrieval
        const { data, error: dbError } = await (supabase
          .from('scene_content_uploads') as any)
          .insert({
            assignment_id: assignmentId,
            step_index: stepIndex,
            file_name: file.name,
            file_path: publicUrl || filePath, // Store R2 public URL or path
            file_size: file.size,
            file_type: file.type,
            uploaded_by: clientId
          })
          .select()
          .single();

        if (dbError) throw dbError;

        console.log('[R2 Upload] Database record created for:', file.name);
        results.push(data);
      }
      
      // Refresh uploads
      await fetchSceneUploads(assignmentId);
      
      console.log('[R2 Upload] All uploads completed successfully!');
      return { data: results, error: null };
    } catch (err: any) {
      console.error('[R2 Upload] Error uploading scene content:', err);
      console.error('[R2 Upload] Error stack:', err.stack);
      return { data: null, error: err.message };
    }
  };

  const deleteSceneUpload = async (uploadId: string, _filePath: string) => {
    try {
      // Note: For R2 files, we'd need another Edge Function to delete from R2
      // For now, we just delete the database record
      // The R2 file will remain (you can set up lifecycle rules in R2 to auto-delete orphans)
      // TODO: Implement R2 file deletion via Edge Function using _filePath
      console.log('[R2 Upload] Deleting upload record:', uploadId);
      
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
      console.error('[R2 Upload] Error deleting scene upload:', err);
      return { error: err.message };
    }
  };

  const getDownloadUrl = async (filePath: string) => {
    try {
      // For R2 public URLs, the file_path already contains the full URL
      // Just return it directly
      if (filePath.startsWith('http')) {
        return { url: filePath, error: null };
      }
      
      // Fallback for old Supabase storage paths
      const { data } = supabase.storage
        .from('scene-content')
        .getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      console.error('[R2 Upload] Error getting download URL:', err);
      return { url: null, error: err.message };
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      // For R2 URLs, open in new tab or use fetch to download
      if (filePath.startsWith('http')) {
        // Fetch the file and trigger download
        const response = await fetch(filePath);
        if (!response.ok) throw new Error('Failed to fetch file');
        
        const blob = await response.blob();
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
      }
      
      // Fallback for old Supabase storage paths
      const { data, error } = await supabase.storage
        .from('scene-content')
        .download(filePath);

      if (error) throw error;

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
      console.error('[R2 Upload] Error downloading file:', err);
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
