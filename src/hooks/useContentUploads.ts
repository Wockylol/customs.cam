import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type ContentUpload = Database['public']['Tables']['content_uploads']['Row'];

export const useContentUploads = (customRequestId?: string) => {
  const [uploads, setUploads] = useState<ContentUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUploads = async (requestId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('content_uploads')
        .select('*')
        .eq('custom_request_id', requestId)
        .order('upload_date', { ascending: false });

      if (error) {
        throw error;
      }

      setUploads(data || []);
    } catch (err: any) {
      console.error('Error fetching content uploads:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getDownloadUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('custom-content')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        throw error;
      }

      return { url: data.signedUrl, error: null };
    } catch (err: any) {
      console.error('Error creating download URL:', err);
      return { url: null, error: err.message };
    }
  };

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('custom-content')
        .download(filePath);
      
      if (error) {
        throw error;
      }

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

  const downloadAllFiles = async () => {
    try {
      const downloadPromises = uploads.map(upload => 
        downloadFile(upload.file_path, upload.file_name)
      );
      
      const results = await Promise.all(downloadPromises);
      const errors = results.filter(result => result.error).map(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to download ${errors.length} file(s)`);
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error downloading all files:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (customRequestId) {
      fetchUploads(customRequestId);
    }
  }, [customRequestId]);

  return {
    uploads,
    loading,
    error,
    fetchUploads,
    downloadFile,
    downloadAllFiles,
    getDownloadUrl
  };
};