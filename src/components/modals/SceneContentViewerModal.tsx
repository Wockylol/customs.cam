import React, { useState, useEffect } from 'react';
import { X, Download, File, Image as ImageIcon, Video, FileText, CheckSquare, Square, Loader } from 'lucide-react';
import JSZip from 'jszip';
import { useSceneUploads } from '../../hooks/useSceneUploads';
import { supabase } from '../../lib/supabase';

interface SceneContentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  clientName: string;
  sceneTitle: string;
}

interface FileWithSelection {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  step_index: number;
  uploaded_at: string;
  selected: boolean;
  previewUrl?: string;
  public_url?: string | null;
}

const SceneContentViewerModal: React.FC<SceneContentViewerModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  clientName,
  sceneTitle
}) => {
  const { uploads, loading, fetchSceneUploads, downloadFile, getDownloadUrl } = useSceneUploads();
  const [files, setFiles] = useState<FileWithSelection[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (isOpen && assignmentId) {
      loadContent();
    }
  }, [isOpen, assignmentId]);

  const loadContent = async () => {
    await fetchSceneUploads(assignmentId);
  };

  useEffect(() => {
    // Convert uploads to files with selection state and load previews
    const loadPreviews = async () => {
      const filesWithSelection: FileWithSelection[] = await Promise.all(
        uploads.map(async (upload) => {
          let previewUrl: string | undefined;
          
          // Get preview URL for images and videos
          if (upload.file_type.startsWith('image/') || upload.file_type.startsWith('video/')) {
            // Use public_url if available (R2), otherwise get from file_path
            if (upload.public_url) {
              previewUrl = upload.public_url;
            } else {
              const { url } = await getDownloadUrl(upload.file_path);
              if (url) previewUrl = url;
            }
          }

          return {
            id: upload.id,
            file_name: upload.file_name,
            file_path: upload.public_url || upload.file_path, // Use public_url for R2 files
            file_type: upload.file_type,
            file_size: upload.file_size,
            step_index: upload.step_index,
            uploaded_at: upload.uploaded_at,
            selected: false,
            previewUrl,
            public_url: upload.public_url
          };
        })
      );
      setFiles(filesWithSelection);
    };

    if (uploads.length > 0) {
      loadPreviews();
    } else {
      setFiles([]);
    }
  }, [uploads]);

  const handleToggleFile = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, selected: !f.selected } : f
    ));
  };

  const handleToggleAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setFiles(prev => prev.map(f => ({ ...f, selected: newSelectAll })));
  };

  // Direct download for single file - handles CORS by using direct navigation
  const downloadSingleFile = (file: FileWithSelection) => {
    const downloadUrl = file.public_url || file.file_path;
    
    if (downloadUrl.startsWith('http')) {
      // For external URLs (R2), open in new tab to bypass CORS
      // This triggers the browser's native download behavior
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.file_name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For Supabase storage files, use the hook's download function
      downloadFile(file.file_path, file.file_name);
    }
  };

  const handleDownloadSelected = async () => {
    const selectedFiles = files.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      alert('Please select at least one file to download');
      return;
    }

    setDownloading(true);
    try {
      if (selectedFiles.length === 1) {
        // Single file - download directly using native browser download
        downloadSingleFile(selectedFiles[0]);
      } else {
        // Multiple files - create ZIP
        await downloadFilesAsZip(selectedFiles, `${clientName}_${sceneTitle}_selected.zip`);
      }
    } catch (error) {
      console.error('Error downloading files:', error);
      alert('Error downloading files. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (files.length === 0) {
      alert('No files to download');
      return;
    }

    setDownloading(true);
    try {
      if (files.length === 1) {
        // Single file - download directly using native browser download
        downloadSingleFile(files[0]);
      } else {
        // Multiple files - create ZIP
        await downloadFilesAsZip(files, `${clientName}_${sceneTitle}_all.zip`);
      }
    } catch (error) {
      console.error('Error downloading files:', error);
      alert('Error downloading files. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  // Helper to fetch file blob with CORS handling via Edge Function proxy
  const fetchFileBlob = async (url: string, _fileName: string): Promise<Blob | null> => {
    if (!url.startsWith('http')) return null;
    
    // Method 1: Try direct fetch first (might work if CORS is configured)
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) {
        return await response.blob();
      }
    } catch {
      // CORS error - try proxy
    }

    // Method 2: Use Edge Function proxy to bypass CORS
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const proxyUrl = `${supabaseUrl}/functions/v1/r2-download-proxy`;
      
      const proxyResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ fileUrl: url }),
      });

      if (proxyResponse.ok) {
        const contentType = proxyResponse.headers.get('content-type');
        if (contentType && !contentType.includes('application/json')) {
          return await proxyResponse.blob();
        }
      }
    } catch {
      // Proxy also failed
    }
    
    return null;
  };

  // Process items in batches with concurrency limit
  const processInBatches = async <T, R>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<R>
  ): Promise<R[]> => {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }
    return results;
  };

  const downloadFilesAsZip = async (filesToDownload: FileWithSelection[], zipFileName: string) => {
    console.log(`[ZIP Download] Starting server-side ZIP for ${filesToDownload.length} files`);
    const startTime = Date.now();
    
    // Prepare file list for server-side ZIP creation
    const files = filesToDownload.map(file => ({
      url: file.public_url || file.file_path,
      fileName: file.file_name,
      folderPath: `Step_${file.step_index + 1}`,
    }));

    try {
      // Call server-side ZIP creation Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/r2-create-zip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          files,
          zipFileName: zipFileName.replace(/[^a-z0-9._-]/gi, '_'),
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || 'Server ZIP creation failed');
        }
        throw new Error(`Server returned ${response.status}`);
      }

      // Download the ZIP directly from the response
      const zipBlob = await response.blob();
      const failedCount = parseInt(response.headers.get('X-Failed-Files') || '0');
      
      console.log(`[ZIP Download] Server ZIP received in ${Date.now() - startTime}ms, size: ${(zipBlob.size / 1024 / 1024).toFixed(2)}MB`);
      
      // Trigger browser download
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = zipFileName.replace(/[^a-z0-9._-]/gi, '_');
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (failedCount > 0) {
        alert(`ZIP created. ${failedCount} file(s) couldn't be included and can be downloaded individually.`);
      }
      
    } catch (err: any) {
      console.error('[ZIP Download] Server-side ZIP failed, falling back to client-side:', err);
      
      // Fallback to client-side ZIP if server fails
      await downloadFilesAsZipClientSide(filesToDownload, zipFileName);
    }
  };

  // Fallback client-side ZIP creation
  const downloadFilesAsZipClientSide = async (filesToDownload: FileWithSelection[], zipFileName: string) => {
    const zip = new JSZip();
    const failedFiles: string[] = [];
    
    const downloadSingleFile = async (file: FileWithSelection) => {
      const folder = `Step_${file.step_index + 1}`;
      const downloadUrl = file.public_url || file.file_path;
      
      try {
        let blob: Blob | null = null;
        if (downloadUrl.startsWith('http')) {
          blob = await fetchFileBlob(downloadUrl, file.file_name);
        } else {
          const { data, error } = await supabase.storage
            .from('scene-content')
            .download(file.file_path);
          if (!error && data) blob = data;
        }
        return { file, blob, folder };
      } catch {
        return { file, blob: null, folder };
      }
    };

    const results = await processInBatches(filesToDownload, 4, downloadSingleFile);
    
    for (const { file, blob, folder } of results) {
      if (blob) {
        zip.folder(folder)?.file(file.file_name, blob);
      } else {
        failedFiles.push(file.file_name);
      }
    }

    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      const shouldDownloadIndividually = confirm(
        `Unable to create ZIP. Download ${filesToDownload.length} file(s) individually instead?`
      );
      if (shouldDownloadIndividually) {
        for (const file of filesToDownload) {
          const downloadUrl = file.public_url || file.file_path;
          if (downloadUrl.startsWith('http')) {
            window.open(downloadUrl, '_blank');
            await new Promise(r => setTimeout(r, 300));
          }
        }
      }
      return;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFileName.replace(/[^a-z0-9._-]/gi, '_');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (failedFiles.length > 0) {
      alert(`ZIP created with ${fileCount} files. ${failedFiles.length} couldn't be included.`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (fileType.startsWith('video/')) return <Video className="w-5 h-5" />;
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // Group files by step
  const filesByStep = files.reduce((acc, file) => {
    if (!acc[file.step_index]) {
      acc[file.step_index] = [];
    }
    acc[file.step_index].push(file);
    return acc;
  }, {} as Record<number, FileWithSelection[]>);

  const sortedSteps = Object.keys(filesByStep).map(Number).sort((a, b) => a - b);

  if (!isOpen) return null;

  const selectedCount = files.filter(f => f.selected).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Scene Content
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {clientName} • {sceneTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleToggleAll}
              className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {selectAll ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Select All</span>
            </button>
            {selectedCount > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedCount} selected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {selectedCount > 0 && (
              <button
                onClick={handleDownloadSelected}
                disabled={downloading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {downloading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Download Selected</span>
              </button>
            )}
            <button
              onClick={handleDownloadAll}
              disabled={downloading || files.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {downloading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download All</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12">
              <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No content uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedSteps.map(stepIndex => (
                <div key={stepIndex} className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Step {stepIndex + 1}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filesByStep[stepIndex].map(file => (
                      <div
                        key={file.id}
                        className={`border rounded-lg overflow-hidden transition-all cursor-pointer ${
                          file.selected
                            ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => handleToggleFile(file.id)}
                      >
                        {/* Preview */}
                        <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
                          {file.previewUrl && file.file_type.startsWith('image/') ? (
                            <img
                              src={file.previewUrl}
                              alt={file.file_name}
                              className="w-full h-full object-cover"
                            />
                          ) : file.previewUrl && file.file_type.startsWith('video/') ? (
                            <video
                              src={file.previewUrl}
                              className="w-full h-full object-cover"
                              controls={false}
                            />
                          ) : (
                            <div className="text-gray-400 dark:text-gray-500">
                              {getFileIcon(file.file_type)}
                            </div>
                          )}
                          {/* Selection Indicator */}
                          <div className="absolute top-2 left-2">
                            {file.selected ? (
                              <CheckSquare className="w-5 h-5 text-blue-600 bg-white rounded" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-400 bg-white rounded" />
                            )}
                          </div>
                        </div>
                        {/* File Info */}
                        <div className="p-3 bg-white dark:bg-gray-800">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
                            {file.file_name}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatFileSize(file.file_size)}</span>
                            <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneContentViewerModal;


