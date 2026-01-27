import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, File, Image as ImageIcon, Video, FileText, CheckSquare, Square, Loader, FolderOpen, HardDrive, Layers } from 'lucide-react';
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
    console.log(`[ZIP Download] Starting ZIP download for ${filesToDownload.length} files`);
    const startTime = Date.now();
    
    // Separate files with public URLs (can use server-side) from those without (need client-side)
    const filesWithPublicUrl = filesToDownload.filter(f => f.public_url && f.public_url.startsWith('http'));
    const filesWithoutPublicUrl = filesToDownload.filter(f => !f.public_url || !f.public_url.startsWith('http'));
    
    // Calculate total size
    const totalSize = filesToDownload.reduce((sum, f) => sum + f.file_size, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    
    console.log(`[ZIP Download] ${filesWithPublicUrl.length} files with public URLs, ${filesWithoutPublicUrl.length} without, total: ${totalSizeMB.toFixed(2)}MB`);
    
    // Thresholds for server-side ZIP (Edge Functions have ~150MB memory limit)
    const MAX_SERVER_SIZE_MB = 100; // Skip server-side if total > 100MB
    const MAX_SERVER_FILES = 50;    // Skip server-side if > 50 files
    
    // If no files have public URLs, go straight to client-side
    if (filesWithPublicUrl.length === 0) {
      console.log('[ZIP Download] No files with public URLs, using client-side ZIP');
      await downloadFilesAsZipClientSide(filesToDownload, zipFileName);
      return;
    }
    
    // If mixed storage, warn and use client-side for safety
    if (filesWithoutPublicUrl.length > 0) {
      console.log('[ZIP Download] Mixed storage detected, using client-side ZIP for compatibility');
      await downloadFilesAsZipClientSide(filesToDownload, zipFileName);
      return;
    }
    
    // If too large or too many files, skip server-side to avoid WORKER_LIMIT errors
    if (totalSizeMB > MAX_SERVER_SIZE_MB || filesToDownload.length > MAX_SERVER_FILES) {
      console.log(`[ZIP Download] Files exceed server limits (${totalSizeMB.toFixed(1)}MB, ${filesToDownload.length} files), using client-side ZIP`);
      await downloadFilesAsZipClientSide(filesToDownload, zipFileName);
      return;
    }
    
    // All files have public URLs and within limits - try server-side ZIP
    const files = filesWithPublicUrl.map(file => ({
      url: file.public_url!,
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
          // Check if it's a resource limit error - this is expected for large files
          if (error.code === 'WORKER_LIMIT') {
            console.log('[ZIP Download] Server resource limit reached, using client-side ZIP instead');
          } else {
            console.warn('[ZIP Download] Server returned error:', error.message || error.error);
          }
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
      // This is expected behavior for large files - not a critical error
      console.log('[ZIP Download] Server-side unavailable, completing with client-side ZIP');
      
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

  // Calculate statistics
  const stats = useMemo(() => {
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);
    const stepsWithContent = sortedSteps.length;
    const imageCount = files.filter(f => f.file_type.startsWith('image/')).length;
    const videoCount = files.filter(f => f.file_type.startsWith('video/')).length;
    const otherCount = totalFiles - imageCount - videoCount;
    
    return { totalFiles, totalSize, stepsWithContent, imageCount, videoCount, otherCount };
  }, [files, sortedSteps]);

  if (!isOpen) return null;

  const selectedCount = files.filter(f => f.selected).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-6xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Scene Content
            </h2>
            <p className="text-purple-100 text-sm">
              {clientName} • {sceneTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        {!loading && files.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <File className="w-4 h-4 text-blue-500" />
                <span className="font-medium">{stats.totalFiles}</span>
                <span className="text-gray-500 dark:text-gray-400">files</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Layers className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{stats.stepsWithContent}</span>
                <span className="text-gray-500 dark:text-gray-400">steps with content</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <HardDrive className="w-4 h-4 text-green-500" />
                <span className="font-medium">{formatFileSize(stats.totalSize)}</span>
                <span className="text-gray-500 dark:text-gray-400">total</span>
              </div>
              <div className="flex items-center gap-4 ml-auto text-xs text-gray-500 dark:text-gray-400">
                {stats.imageCount > 0 && (
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                    {stats.imageCount} images
                  </span>
                )}
                {stats.videoCount > 0 && (
                  <span className="flex items-center gap-1">
                    <Video className="w-3.5 h-3.5 text-red-500" />
                    {stats.videoCount} videos
                  </span>
                )}
                {stats.otherCount > 0 && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    {stats.otherCount} other
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleToggleAll}
              className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {selectAll ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Select All</span>
            </button>
            {selectedCount > 0 && (
              <span className="text-sm text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                {selectedCount} selected
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {selectedCount > 0 && (
              <button
                onClick={handleDownloadSelected}
                disabled={downloading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
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
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white rounded-lg transition-all text-sm font-medium shadow-sm"
            >
              {downloading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download All ({stats.totalFiles})</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/30">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-600 border-t-transparent mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading content...</p>
              </div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">No content uploaded yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Files will appear here once uploaded</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedSteps.map(stepIndex => {
                const stepFiles = filesByStep[stepIndex];
                const stepSize = stepFiles.reduce((sum, f) => sum + f.file_size, 0);
                const selectedInStep = stepFiles.filter(f => f.selected).length;
                
                return (
                  <div key={stepIndex} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                    {/* Step Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                              {stepIndex + 1}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              Step {stepIndex + 1}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {stepFiles.length} {stepFiles.length === 1 ? 'file' : 'files'} • {formatFileSize(stepSize)}
                            </p>
                          </div>
                        </div>
                        {selectedInStep > 0 && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full font-medium">
                            {selectedInStep} selected
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Step Files Grid */}
                    <div className="p-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {stepFiles.map(file => (
                          <div
                            key={file.id}
                            className={`group relative border-2 rounded-xl overflow-hidden transition-all cursor-pointer ${
                              file.selected
                                ? 'border-blue-500 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md'
                            }`}
                            onClick={() => handleToggleFile(file.id)}
                          >
                            {/* Preview */}
                            <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative overflow-hidden">
                              {file.previewUrl && file.file_type.startsWith('image/') ? (
                                <img
                                  src={file.previewUrl}
                                  alt={file.file_name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : file.previewUrl && file.file_type.startsWith('video/') ? (
                                <div className="relative w-full h-full">
                                  <video
                                    src={file.previewUrl}
                                    className="w-full h-full object-cover"
                                    controls={false}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center">
                                      <Video className="w-5 h-5 text-red-500" />
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                                  {getFileIcon(file.file_type)}
                                  <span className="text-xs uppercase tracking-wide">
                                    {file.file_name.split('.').pop()}
                                  </span>
                                </div>
                              )}
                              
                              {/* Selection Indicator */}
                              <div className={`absolute top-2 left-2 transition-all ${file.selected ? 'scale-100' : 'scale-90 opacity-70 group-hover:opacity-100 group-hover:scale-100'}`}>
                                {file.selected ? (
                                  <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center shadow-md">
                                    <CheckSquare className="w-4 h-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 bg-white/90 dark:bg-gray-800/90 rounded-md flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-600">
                                    <Square className="w-4 h-4 text-gray-400" />
                                  </div>
                                )}
                              </div>

                              {/* File type badge */}
                              <div className="absolute top-2 right-2">
                                {file.file_type.startsWith('video/') && (
                                  <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded uppercase">
                                    Video
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* File Info */}
                            <div className="p-2.5 bg-white dark:bg-gray-800">
                              <p className="text-xs font-medium text-gray-900 dark:text-white truncate" title={file.file_name}>
                                {file.file_name}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                                <span>{formatFileSize(file.file_size)}</span>
                                <span>{new Date(file.uploaded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneContentViewerModal;


