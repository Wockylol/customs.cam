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

  // Helper to fetch file blob with CORS handling and detailed debugging
  const fetchFileBlob = async (url: string, fileName: string): Promise<Blob | null> => {
    console.group(`[ZIP Download] Fetching: ${fileName}`);
    console.log('URL:', url);
    console.log('URL type:', url.startsWith('http') ? 'External (R2/CDN)' : 'Internal path');
    
    // For external URLs (R2), try fetching with different approaches
    if (url.startsWith('http')) {
      // Add cache-busting parameter to bypass browser/CDN cached responses without CORS headers
      // This is necessary because <img> tags can cache responses without CORS headers,
      // which then cause fetch() to fail for the same URL
      const cacheBustedUrl = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
      console.log('Cache-busted URL:', cacheBustedUrl);
      
      // Method 1: Try direct fetch with cache-busting
      console.log('Attempt 1: Using fetch() with cache-bust...');
      try {
        const response = await fetch(cacheBustedUrl, {
          cache: 'no-store', // Also disable browser cache
        });
        console.log('Fetch response:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length'),
            'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
          }
        });
        
        if (response.ok) {
          const blob = await response.blob();
          console.log('✅ Fetch succeeded! Blob size:', blob.size, 'bytes');
          console.groupEnd();
          return blob;
        } else {
          console.warn('❌ Fetch returned non-OK status:', response.status);
        }
      } catch (fetchError: any) {
        console.warn('❌ Fetch failed with error:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack?.split('\n').slice(0, 3).join('\n')
        });
      }

      // Method 2: Alternative using XMLHttpRequest with cache-busting
      console.log('Attempt 2: Using XMLHttpRequest with cache-bust...');
      try {
        const xhrResult = await new Promise<{ blob: Blob | null; debug: any }>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', cacheBustedUrl, true);
          xhr.responseType = 'blob';
          // Disable caching
          xhr.setRequestHeader('Cache-Control', 'no-cache, no-store');
          
          xhr.onload = () => {
            const debug = {
              status: xhr.status,
              statusText: xhr.statusText,
              responseType: xhr.responseType,
              responseSize: xhr.response?.size,
            };
            
            if (xhr.status === 200) {
              resolve({ blob: xhr.response as Blob, debug });
            } else {
              resolve({ blob: null, debug });
            }
          };
          
          xhr.onerror = (event) => {
            resolve({ 
              blob: null, 
              debug: { 
                error: 'XHR network error', 
                event: event.type,
                status: xhr.status 
              } 
            });
          };
          
          xhr.ontimeout = () => {
            resolve({ blob: null, debug: { error: 'XHR timeout' } });
          };
          
          xhr.send();
        });
        
        console.log('XHR result:', xhrResult.debug);
        
        if (xhrResult.blob) {
          console.log('✅ XHR succeeded! Blob size:', xhrResult.blob.size, 'bytes');
          console.groupEnd();
          return xhrResult.blob;
        } else {
          console.warn('❌ XHR failed');
        }
      } catch (xhrError: any) {
        console.warn('❌ XHR exception:', xhrError.message);
      }
      
      console.error('❌ All download methods failed for:', fileName);
      console.groupEnd();
      return null;
    }
    
    console.log('Not an HTTP URL, returning null (will use Supabase storage)');
    console.groupEnd();
    return null;
  };

  const downloadFilesAsZip = async (filesToDownload: FileWithSelection[], zipFileName: string) => {
    console.log('='.repeat(60));
    console.log('[ZIP Download] Starting ZIP creation');
    console.log('[ZIP Download] Files to download:', filesToDownload.length);
    console.log('[ZIP Download] Output filename:', zipFileName);
    console.log('='.repeat(60));
    
    const zip = new JSZip();
    const failedFiles: { name: string; reason: string; url: string }[] = [];
    const successFiles: string[] = [];

    // Group files by step for organized folder structure
    const filesByStep: { [key: number]: FileWithSelection[] } = {};
    filesToDownload.forEach(file => {
      if (!filesByStep[file.step_index]) {
        filesByStep[file.step_index] = [];
      }
      filesByStep[file.step_index].push(file);
    });

    // Download each file and add to ZIP with folder structure
    for (const [stepIndex, stepFiles] of Object.entries(filesByStep)) {
      const folderName = `Step_${parseInt(stepIndex) + 1}`;
      console.log(`\n[ZIP Download] Processing ${folderName} (${stepFiles.length} files)`);
      
      for (const file of stepFiles) {
        try {
          let fileBlob: Blob | null = null;
          
          // Use public_url (R2) if available, otherwise fall back to file_path
          const downloadUrl = file.public_url || file.file_path;
          
          console.log(`\n[ZIP Download] File: ${file.file_name}`);
          console.log(`  - public_url: ${file.public_url || '(none)'}`);
          console.log(`  - file_path: ${file.file_path}`);
          console.log(`  - Using URL: ${downloadUrl}`);
          console.log(`  - File type: ${file.file_type}`);
          console.log(`  - File size: ${file.file_size} bytes`);
          
          // Check if this is an R2/external URL (starts with http)
          if (downloadUrl.startsWith('http')) {
            fileBlob = await fetchFileBlob(downloadUrl, file.file_name);
          } else {
            // Download from Supabase storage (legacy files)
            console.log('  - Using Supabase storage download...');
            const { data, error } = await supabase.storage
              .from('scene-content')
              .download(file.file_path);

            if (error) {
              console.error('  - Supabase download error:', error);
            } else if (data) {
              console.log('  - Supabase download succeeded, blob size:', data.size);
              fileBlob = data;
            }
          }

          if (fileBlob) {
            // Add file to ZIP in its step folder
            zip.folder(folderName)?.file(file.file_name, fileBlob);
            successFiles.push(file.file_name);
            console.log(`  ✅ Added to ZIP: ${folderName}/${file.file_name}`);
          } else {
            failedFiles.push({ 
              name: file.file_name, 
              reason: 'Blob was null - all download methods failed',
              url: downloadUrl 
            });
            console.error(`  ❌ FAILED: ${file.file_name}`);
          }
        } catch (err: any) {
          console.error(`  ❌ Exception for ${file.file_name}:`, err);
          failedFiles.push({ 
            name: file.file_name, 
            reason: err.message || 'Unknown exception',
            url: file.public_url || file.file_path 
          });
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('[ZIP Download] Summary:');
    console.log(`  - Successful: ${successFiles.length}`);
    console.log(`  - Failed: ${failedFiles.length}`);
    if (failedFiles.length > 0) {
      console.log('[ZIP Download] Failed files details:');
      failedFiles.forEach(f => {
        console.log(`  - ${f.name}`);
        console.log(`    Reason: ${f.reason}`);
        console.log(`    URL: ${f.url}`);
      });
    }
    console.log('='.repeat(60));

    // Check if we have any files to download
    const fileCount = Object.keys(zip.files).length;
    if (fileCount === 0) {
      // All files failed - offer to download individually
      const shouldDownloadIndividually = confirm(
        `Unable to create ZIP due to browser restrictions. Would you like to download ${filesToDownload.length} file(s) individually instead?\n\nEach file will open in a new tab.`
      );
      
      if (shouldDownloadIndividually) {
        for (const file of filesToDownload) {
          const downloadUrl = file.public_url || file.file_path;
          if (downloadUrl.startsWith('http')) {
            window.open(downloadUrl, '_blank');
            // Small delay between downloads
            await new Promise(r => setTimeout(r, 300));
          }
        }
      }
      return;
    }

    // Generate and download ZIP file
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipFileName.replace(/[^a-z0-9._-]/gi, '_'); // Sanitize filename
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Notify about failed files
    if (failedFiles.length > 0) {
      const failedFileNames = failedFiles.map(f => f.name);
      alert(`ZIP created with ${fileCount} files.\n\n${failedFiles.length} file(s) couldn't be included due to browser restrictions:\n${failedFileNames.slice(0, 5).join('\n')}${failedFiles.length > 5 ? `\n...and ${failedFiles.length - 5} more` : ''}\n\nThese files can be downloaded individually by clicking them.`);
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


