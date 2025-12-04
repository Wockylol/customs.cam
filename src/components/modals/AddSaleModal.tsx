import React, { useState } from 'react';
import { X, Search, Upload, Image as ImageIcon, Trash2, Loader2, Calendar, DollarSign, Clock } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AddSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (saleData: {
    clientId: string;
    saleDate: string;
    saleTime?: string;
    grossAmount: number;
    screenshotUrl?: string;
    notes?: string;
  }) => Promise<{ error: string | null }>;
}

const AddSaleModal: React.FC<AddSaleModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit 
}) => {
  const { clients } = useClients();
  const { teamMember } = useAuth();
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    clientId: '',
    clientUsername: '',
    saleDate: today,
    saleTime: '',
    grossAmount: '',
    screenshotUrl: '',
    notes: ''
  });
  
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleClose = () => {
    setFormData({
      clientId: '',
      clientUsername: '',
      saleDate: today,
      saleTime: '',
      grossAmount: '',
      screenshotUrl: '',
      notes: ''
    });
    setClientSearchTerm('');
    setShowClientDropdown(false);
    setError(null);
    // Clean up preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    onClose();
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.username.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be smaller than 10MB');
      return;
    }

    // Clean up previous preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create preview URL
    const newPreviewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(newPreviewUrl);
    setError(null);
    
    // Clear the input
    event.target.value = '';
  };

  const removeFile = () => {
    // Revoke the object URL to free memory
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl('');
    setFormData({ ...formData, screenshotUrl: '' });
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    try {
      setUploadingFile(true);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `sales-screenshots/${teamMember?.id}/${fileName}`;
      
      // Upload the file
      const { error: uploadError, data } = await supabase.storage
        .from('sales-screenshots')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sales-screenshots')
        .getPublicUrl(filePath);
      
      return publicUrl;
    } catch (err: any) {
      console.error('Error uploading screenshot:', err);
      setError(`Failed to upload screenshot: ${err.message}`);
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowClientDropdown(false);
    
    if (!formData.clientId) {
      setError('Please select a client (model)');
      setLoading(false);
      return;
    }
    
    if (!formData.grossAmount || parseFloat(formData.grossAmount) <= 0) {
      setError('Please enter a valid gross amount');
      setLoading(false);
      return;
    }
    
    try {
      let screenshotUrl = formData.screenshotUrl;
      
      // Upload file if selected
      if (selectedFile) {
        const uploadedUrl = await uploadScreenshot(selectedFile);
        if (!uploadedUrl) {
          setLoading(false);
          return; // Error already set in uploadScreenshot
        }
        screenshotUrl = uploadedUrl;
      }
      
      const { error } = await onSubmit({
        clientId: formData.clientId,
        saleDate: formData.saleDate,
        saleTime: formData.saleTime || undefined,
        grossAmount: parseFloat(formData.grossAmount),
        screenshotUrl: screenshotUrl || undefined,
        notes: formData.notes || undefined
      });
      
      if (error) {
        setError(error);
      } else {
        handleClose();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClientSelect = (client: any) => {
    setFormData({ 
      ...formData, 
      clientId: client.id,
      clientUsername: client.username 
    });
    setClientSearchTerm(client.username);
    setShowClientDropdown(false);
  };

  const handleClientSearchChange = (value: string) => {
    setClientSearchTerm(value);
    setFormData({ ...formData, clientUsername: value, clientId: '' });
    setShowClientDropdown(value.length > 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Sale</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Model (Client) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search for a client..."
                  value={clientSearchTerm}
                  onChange={(e) => handleClientSearchChange(e.target.value)}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
              
              {showClientDropdown && filteredClients.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2"
                    >
                      {client.avatar_url ? (
                        <img 
                          src={client.avatar_url} 
                          alt={client.username}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                          {client.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-gray-900 dark:text-white">@{client.username}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {formData.clientId && (
              <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                ✓ Selected: @{formData.clientUsername}
              </p>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  max={today}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time (Optional)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="time"
                  value={formData.saleTime}
                  onChange={(e) => setFormData({ ...formData, saleTime: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Gross Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gross Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.grossAmount}
                onChange={(e) => setFormData({ ...formData, grossAmount: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Screenshot
            </label>
            
            {/* URL Input */}
            <div className="mb-2">
              <input
                type="url"
                placeholder="Or paste screenshot URL"
                value={formData.screenshotUrl}
                onChange={(e) => setFormData({ ...formData, screenshotUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={!!selectedFile}
              />
            </div>
            
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">OR</div>
            
            {/* File Upload */}
            {!selectedFile && !formData.screenshotUrl && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            )}
            
            {/* Image Preview */}
            {(previewUrl || formData.screenshotUrl) && (
              <div className="relative mt-4">
                <img
                  src={previewUrl || formData.screenshotUrl}
                  alt="Screenshot preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              placeholder="Add any additional notes about this sale..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              disabled={loading || uploadingFile}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploadingFile}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {(loading || uploadingFile) && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Adding Sale...' : uploadingFile ? 'Uploading...' : 'Add Sale'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSaleModal;

