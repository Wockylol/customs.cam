import React, { useState } from 'react';
import { X, Upload, CheckCircle, Camera, Video, Music, FileText, Sparkles, Heart } from 'lucide-react';
import { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

interface MobileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  custom: CustomRequest | null;
  onComplete: (customId: string) => Promise<{ error: string | null }>;
}

const MobileUploadModal: React.FC<MobileUploadModalProps> = ({ 
  isOpen, 
  onClose, 
  custom, 
  onComplete 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{name: string, url: string}>>([]);
  const [message, setMessage] = useState('');

  if (!isOpen || !custom) return null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 50MB.`);
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${custom.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-content')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('custom-content')
          .getPublicUrl(fileName);

        // Save upload record to database
        const { error: dbError } = await supabase
          .from('content_uploads')
          .insert({
            custom_request_id: custom.id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: 'client'
          });

        if (dbError) {
          throw dbError;
        }

        return {
          name: file.name,
          url: urlData.publicUrl
        };
      });

      const results = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...results]);
      
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload files');
    } finally {
      setIsUploading(true);
      setIsUploading(false);
    }
  };

  const handleComplete = async () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload your content first! 📸');
      return;
    }

    setLoading(true);
    setError(null);
    
    const { error } = await onComplete(custom.id);
    
    if (error) {
      setError(error);
    } else {
      onClose();
      setUploadedFiles([]);
      setMessage('');
    }
    
    setLoading(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0';
    return `$${amount.toFixed(0)}`;
  };

  const uploadTypes = [
    { icon: Camera, label: 'Photos', accept: 'image/*', color: 'from-pink-400 to-rose-400' },
    { icon: Video, label: 'Videos', accept: 'video/*', color: 'from-purple-400 to-indigo-400' },
    { icon: Music, label: 'Audio', accept: 'audio/*', color: 'from-blue-400 to-cyan-400' },
    { icon: FileText, label: 'Other', accept: '*/*', color: 'from-gray-400 to-gray-500' }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center"
            disabled={loading}
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center mr-4">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Upload Content</h2>
              <p className="text-blue-100 text-sm">For {custom.fan_name}</p>
            </div>
          </div>

          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-3">
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{formatCurrency(custom.proposed_amount)}</div>
              <div className="text-blue-100 text-sm">You'll earn this when delivered!</div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800 text-center">{error}</p>
            </div>
          )}

          {/* Request Details */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-4">
            <h3 className="font-bold text-gray-900 mb-2">What they want:</h3>
            <p className="text-gray-800 text-sm leading-relaxed mb-3">{custom.description}</p>
            
            {custom.length_duration && (
              <div className="bg-white rounded-lg p-2 text-center">
                <span className="text-sm font-medium text-gray-700">{custom.length_duration}</span>
              </div>
            )}
          </div>

          {/* Upload Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
              Upload Your Content
            </h3>
            
            {/* Upload Status */}
            {isUploading && (
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <span className="text-sm font-medium text-blue-900">Uploading files...</span>
              </div>
            )}

            {/* Upload Types */}
            <div className="grid grid-cols-2 gap-3">
              {uploadTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <label
                    key={type.label}
                    className="cursor-pointer group"
                  >
                    <div className={`bg-gradient-to-br ${type.color} rounded-2xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform group-hover:scale-105 group-active:scale-95`}>
                      <div className="text-center">
                        <Icon className="w-8 h-8 mx-auto mb-2" />
                        <div className="font-semibold text-sm">{type.label}</div>
                      </div>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept={type.accept}
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isUploading || loading}
                    />
                  </label>
                );
              })}
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="bg-green-50 rounded-xl p-4">
                <div className="flex items-center mb-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="font-semibold text-green-900">
                    {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded! 🎉
                  </h4>
                </div>
                <div className="space-y-2">
                  {uploadedFiles.map((fileName, index) => (
                    <div key={index} className="flex items-center bg-white rounded-lg p-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-sm text-gray-700 truncate">{fileName.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Message to Fan */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Message to your fan (optional) 💕
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey babe! Here's your custom content... 😘"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleComplete}
              disabled={loading || uploadedFiles.length === 0}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Completing...
                </div>
              ) : (
                <div className="flex items-center">
                  <Heart className="w-5 h-5 mr-3" />
                  Mark as Complete! 🎉
                </div>
              )}
            </button>
            
            <button
              onClick={onClose}
              className="w-full border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Save for Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileUploadModal;