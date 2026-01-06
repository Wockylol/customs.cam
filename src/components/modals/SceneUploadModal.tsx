import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Trash2, Video, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useSceneUploads } from '../../hooks/useSceneUploads';
import { SceneInstruction } from '../../types';

// 5GB max file size
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024;

interface SceneUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: any;
  scene: any;
  stepIndex: number;
}

const SceneUploadModal: React.FC<SceneUploadModalProps> = ({
  isOpen,
  onClose,
  assignment,
  scene,
  stepIndex
}) => {
  const { uploads, uploadSceneContent, deleteSceneUpload, getDownloadUrl } = useSceneUploads(assignment?.id);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [bytesLoaded, setBytesLoaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ [key: number]: string }>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ id: string; path: string } | null>(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const lastProgressRef = useRef({ loaded: 0, time: Date.now() });

  const instructions: SceneInstruction[] = Array.isArray(scene?.instructions) 
    ? scene.instructions 
    : [];
  
  const currentInstruction = instructions[stepIndex];
  const stepUploads = uploads.filter(upload => upload.step_index === stepIndex);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFiles([]);
      setUploadProgress(0);
      setCurrentFileIndex(0);
      setCurrentFileName('');
      setBytesLoaded(0);
      setBytesTotal(0);
    }
  }, [isOpen]);

  useEffect(() => {
    // Load preview URLs for uploaded files
    const loadPreviewUrls = async () => {
      const urls: { [key: number]: string } = {};
      for (let i = 0; i < stepUploads.length; i++) {
        const upload = stepUploads[i];
        if (upload.file_type.startsWith('image/')) {
          const { url } = await getDownloadUrl(upload.file_path);
          if (url) {
            urls[i] = url;
          }
        }
      }
      setPreviewUrls(urls);
    };

    if (stepUploads.length > 0 && isOpen) {
      loadPreviewUrls();
    }
  }, [stepUploads.length, isOpen]); // Only re-run when count changes or modal opens

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const errors: string[] = [];
      const validFiles: File[] = [];
      
      for (const file of newFiles) {
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`"${file.name}" is too large (${formatFileSize(file.size)}). Maximum size is 5GB.`);
        } else {
          validFiles.push(file);
        }
      }
      
      setFileErrors(errors);
      if (validFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...validFiles]);
      }
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setBytesLoaded(0);
    setUploadSpeed(0);
    setFileErrors([]);
    const total = selectedFiles.reduce((sum, f) => sum + f.size, 0);
    setBytesTotal(total);
    lastProgressRef.current = { loaded: 0, time: Date.now() };

    const { error } = await uploadSceneContent(
      assignment.id,
      stepIndex,
      selectedFiles,
      (progress) => {
        setUploadProgress(progress.overallPercentage);
        setCurrentFileIndex(progress.fileIndex);
        setCurrentFileName(progress.fileName);
        setBytesLoaded(progress.totalLoaded);
        
        // Calculate upload speed (bytes per second)
        const now = Date.now();
        const timeDiff = (now - lastProgressRef.current.time) / 1000;
        if (timeDiff > 0.5) { // Update speed every 0.5 seconds
          const bytesDiff = progress.totalLoaded - lastProgressRef.current.loaded;
          setUploadSpeed(bytesDiff / timeDiff);
          lastProgressRef.current = { loaded: progress.totalLoaded, time: now };
        }
      }
    );

    setUploading(false);
    setUploadSpeed(0);
    
    if (error) {
      alert(`Error uploading files: ${error}`);
    } else {
      setUploadProgress(100);
      setSelectedFiles([]);
      setTimeout(() => {
        setUploadProgress(0);
        setCurrentFileName('');
        setBytesLoaded(0);
        setBytesTotal(0);
      }, 2000);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    const { error } = await deleteSceneUpload(deleteConfirmId.id, deleteConfirmId.path);
    
    if (error) {
      alert(`Error deleting file: ${error}`);
    }
    
    setDeleteConfirmId(null);
  };

  const handleClose = () => {
    if (uploading) {
      alert('Please wait for the upload to complete before closing.');
      return;
    }
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (!isOpen || !currentInstruction) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-400 to-red-500 text-white">
          <div className="flex-1 pr-4">
            <div className="flex items-center space-x-2 mb-2">
              {currentInstruction.type === 'video' ? (
                <div className="flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  <Video className="w-4 h-4 mr-1" />
                  Video #{currentInstruction.number}
                </div>
              ) : (
                <div className="flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Photo #{currentInstruction.number}
                </div>
              )}
              {currentInstruction.duration && (
                <span className="text-sm font-medium">{currentInstruction.duration}</span>
              )}
            </div>
            <h2 className="text-xl font-bold">Upload Content</h2>
            <p className="text-sm text-white/80 mt-1">{scene.title}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
            disabled={uploading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              Instructions:
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {currentInstruction.description}
            </p>
          </div>

          {/* File Upload Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Files
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-orange-500 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-orange-600 dark:text-orange-400 font-medium hover:text-orange-700">
                  Click to upload
                </span>
                <span className="text-gray-600 dark:text-gray-400"> or drag and drop</span>
                <input
                  type="file"
                  multiple
                  accept={currentInstruction.type === 'video' ? 'video/*' : 'image/*'}
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {currentInstruction.type === 'video' ? 'Video files up to 5GB' : 'Image files up to 5GB'}
              </p>
            </div>
            
            {/* File Size Errors */}
            {fileErrors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    {fileErrors.map((err, i) => (
                      <p key={i} className="text-sm text-red-700 dark:text-red-300">{err}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected Files for Upload */}
          {selectedFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Files to Upload ({selectedFiles.length})
              </h3>
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {file.type.startsWith('video/') ? (
                        <Video className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSelectedFile(index)}
                      className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full mt-4 flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-400 to-red-500 text-white font-semibold rounded-lg hover:from-orange-500 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading... {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>

              {/* Progress Bar */}
              {uploading && (
                <div className="mt-4 space-y-2">
                  {/* Progress info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                      {currentFileName ? `Uploading: ${currentFileName}` : 'Starting upload...'}
                    </span>
                    <span className="text-orange-600 dark:text-orange-400 font-semibold whitespace-nowrap">
                      {uploadProgress}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-150 ease-out"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  
                  {/* Bytes info and speed */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {formatFileSize(bytesLoaded)} / {formatFileSize(bytesTotal)}
                    </span>
                    <span>
                      {uploadSpeed > 0 ? `${formatFileSize(uploadSpeed)}/s` : 'Calculating...'}
                    </span>
                  </div>
                  
                  {/* ETA and file count */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {uploadSpeed > 0 && bytesTotal > bytesLoaded
                        ? `~${formatTimeRemaining((bytesTotal - bytesLoaded) / uploadSpeed)} remaining`
                        : 'Estimating time...'}
                    </span>
                    {selectedFiles.length > 1 && (
                      <span>
                        File {currentFileIndex + 1} of {selectedFiles.length}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Previously Uploaded Files */}
          {stepUploads.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Uploaded Files ({stepUploads.length})
              </h3>
              <div className="space-y-2">
                {stepUploads.map((upload, index) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {previewUrls[index] ? (
                        <img
                          src={previewUrls[index]}
                          alt={upload.file_name}
                          className="w-12 h-12 object-cover rounded flex-shrink-0"
                        />
                      ) : upload.file_type.startsWith('video/') ? (
                        <Video className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-purple-500 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {upload.file_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(upload.file_size)} • {new Date(upload.upload_date).toLocaleDateString()}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    </div>
                    <button
                      onClick={() => setDeleteConfirmId({ id: upload.id, path: upload.file_path })}
                      className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete File?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneUploadModal;

