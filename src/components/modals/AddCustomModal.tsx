import React, { useState } from 'react';
import { X, Search, Check, Zap, CheckCircle, XCircle, AlertTriangle, HelpCircle, Upload, Image, Trash2, Loader2, Video } from 'lucide-react';
import { useClients } from '../../hooks/useClients';
import { useClientPreferences } from '../../hooks/useClientPreferences';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface AddCustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientUsername?: string;
  onSubmit: (customData: {
    clientUsername: string;
    fanName: string;
    description: string;
    fanLifetimeSpend?: number;
    proposedAmount: number;
    amountPaid?: number;
    length: string;
    chatLink: string;
    notes?: string;
    images?: File[];
    isVoiceVideoCall?: boolean;
    callScheduledAt?: string;
  }) => Promise<{ error: string | null }>;
}

const AddCustomModal: React.FC<AddCustomModalProps> = ({ 
  isOpen, 
  onClose, 
  clientUsername = '',
  onSubmit 
}) => {
  const { clients } = useClients();
  const { teamMember } = useAuth();
  
  const [formData, setFormData] = useState({
    clientUsername: clientUsername,
    fanName: '',
    description: '',
    proposedAmount: '',
    amountPaid: '',
    fanLifetimeSpend: '',
    length: '',
    chatLink: '',
    notes: '',
    isVoiceVideoCall: false,
    callScheduledAt: ''
  });
  
  // Get client preferences for evaluation (after formData is initialized)
  const selectedClient = clients.find(c => c.username === formData.clientUsername);
  const { preferences } = useClientPreferences(selectedClient?.id);
  
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState(clientUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<{
    status: 'approved' | 'rejected' | 'uncertain' | 'possible' | null;
    message: string;
  }>({ status: null, message: '' });
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const handleClose = () => {
    setFormData({
      clientUsername: clientUsername,
      fanName: '',
      description: '',
      proposedAmount: '',
      amountPaid: '',
      fanLifetimeSpend: '',
      length: '',
      chatLink: '',
      notes: '',
      isVoiceVideoCall: false,
      callScheduledAt: ''
    });
    setClientSearchTerm(clientUsername);
    setShowClientDropdown(false);
    setError(null);
    setEvaluationResult({ status: null, message: '' });
    setHasEvaluated(false);
    // Clean up image previews
    imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setImagePreviewUrls([]);
    onClose();
  };

  // Filter clients based on search term
  const filteredClients = clients.filter(client =>
    client.username.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowClientDropdown(false);
    
    if (formData.clientUsername && formData.fanName.trim() && formData.description.trim() && formData.proposedAmount && formData.amountPaid && formData.chatLink.trim()) {
      const proposedAmount = parseFloat(formData.proposedAmount) || 0;
      const amountPaid = parseFloat(formData.amountPaid) || 0;
      
      if (amountPaid > proposedAmount) {
        setError('Amount paid cannot be greater than proposed amount');
        setLoading(false);
        return;
      }
      
      const { error } = await onSubmit({
        ...formData,
        proposedAmount,
        amountPaid,
        images: selectedImages,
        isVoiceVideoCall: formData.isVoiceVideoCall,
        callScheduledAt: formData.callScheduledAt || undefined
      });
      
      if (error) {
        setError(error);
      } else {
        handleClose();
      }
    }
    setLoading(false);
  };

  const handleClientSelect = (username: string) => {
    setFormData({ ...formData, clientUsername: username });
    setClientSearchTerm(username);
    setShowClientDropdown(false);
  };

  const handleClientSearchChange = (value: string) => {
    setClientSearchTerm(value);
    setFormData({ ...formData, clientUsername: value });
    setShowClientDropdown(value.length > 0);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newImages = Array.from(files).filter(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        return false;
      }
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('Images must be smaller than 10MB');
        return false;
      }
      return true;
    });

    if (newImages.length === 0) return;

    // Create preview URLs
    const newPreviewUrls = newImages.map(file => URL.createObjectURL(file));
    
    setSelectedImages(prev => [...prev, ...newImages]);
    setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
    
    // Clear the input
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    // Revoke the object URL to free memory
    URL.revokeObjectURL(imagePreviewUrls[index]);
    
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const evaluateWithGrok = async () => {
    if (!selectedClient || !preferences) {
      setError('Client preferences not found. Please ensure the client has set their preferences.');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please enter a description before evaluating.');
      return;
    }

    console.log('🤖 Starting Grok evaluation...');
    console.log('📊 Selected Client:', selectedClient);
    console.log('⚙️ Client Preferences:', preferences);
    console.log('📝 Form Data:', formData);

    setEvaluating(true);
    setError(null);

    const requestPayload = {
      model: 'grok-3',
      messages: [
        {
          role: 'system',
          content: `You are evaluating a custom content request against a client's preferences. Respond with EXACTLY this format:

STATUS: [APPROVED/REJECTED/UNCERTAIN/POSSIBLE]
REASON: [Brief explanation]

Categories:
- APPROVED: Request aligns with client preferences
- REJECTED: Request violates client preferences
- UNCERTAIN: Not enough context to determine
- POSSIBLE: Could work with modifications`
        },
        {
          role: 'user',
          content: `Custom Request:
- Description: "${formData.description}"
- Proposed Amount: $${formData.proposedAmount}
- Length/Duration: ${formData.length || 'Not specified'}

Client Preferences:
- Minimum Pricing: $${preferences.minimum_pricing}
- Video Call: ${preferences.video_call ? 'Yes' : 'No'}
- Audio Call: ${preferences.audio_call ? 'Yes' : 'No'}
- Dick Rates: ${preferences.dick_rates ? 'Yes' : 'No'}
- Fan Signs: ${preferences.fan_signs ? 'Yes' : 'No'}
- Using Fan's Name: ${preferences.using_fans_name ? 'Yes' : 'No'}
- Saying Specific Things: ${preferences.saying_specific_things ? 'Yes' : 'No'}
- Roleplaying: ${preferences.roleplaying ? 'Yes' : 'No'}
- Using Toys/Props: ${preferences.using_toys_props ? 'Yes' : 'No'}
- Specific Outfits: ${preferences.specific_outfits ? 'Yes' : 'No'}
- Full Nudity (Censored): ${preferences.full_nudity_censored ? 'Yes' : 'No'}
- Full Nudity (Uncensored): ${preferences.full_nudity_uncensored ? 'Yes' : 'No'}
- Masturbation: ${preferences.masturbation ? 'Yes' : 'No'}
- Anal Content: ${preferences.anal_content ? 'Yes' : 'No'}
- Feet Content: ${preferences.feet_content ? 'Yes' : 'No'}

Evaluate if this request matches the client's preferences. Focus on content type and pricing.`
        }
      ],
      temperature: 0.3,
      max_tokens: 750,
      stream: false
    };

    console.log('📤 Sending to Grok API:', requestPayload);

    try {
      // Get the Supabase URL for edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/grok-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(requestPayload)
      });

      console.log('📡 API Response Status:', response.status);
      console.log('📡 API Response Headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Grok API Response:', data);
      
      const grokResponse = data.choices[0]?.message?.content || '';
      console.log('🤖 Grok Raw Response:', grokResponse);
      
      // Parse Grok response
      const statusMatch = grokResponse.match(/STATUS:\s*(APPROVED|REJECTED|UNCERTAIN|POSSIBLE)/i);
      const reasonMatch = grokResponse.match(/REASON:\s*(.+)/i);
      
      const status = statusMatch ? statusMatch[1].toLowerCase() as 'approved' | 'rejected' | 'uncertain' | 'possible' : 'uncertain';
      const message = reasonMatch ? reasonMatch[1].trim() : 'Unable to evaluate request.';
      
      console.log('✅ Parsed Status:', status);
      console.log('💬 Parsed Message:', message);
      
      setEvaluationResult({ status, message });
      setHasEvaluated(true);
      
    } catch (err: any) {
      console.error('Grok evaluation error:', err);
      console.error('🔍 Error details:', {
        message: err.message,
        stack: err.stack,
        selectedClient: selectedClient?.id,
        hasPreferences: !!preferences,
        formDescription: formData.description
      });
      setError('Failed to evaluate request. Please try again or submit without evaluation.');
    } finally {
      setEvaluating(false);
    }
  };

  const getEvaluationIcon = () => {
    switch (evaluationResult.status) {
      case 'approved':
        return CheckCircle;
      case 'rejected':
        return XCircle;
      case 'uncertain':
        return HelpCircle;
      case 'possible':
        return AlertTriangle;
      default:
        return HelpCircle;
    }
  };

  const getEvaluationColor = () => {
    switch (evaluationResult.status) {
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'uncertain':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      case 'possible':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-5xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Add New Custom Request
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            <div className="relative grid grid-cols-12 gap-4">
              <div className="col-span-5 relative">
                <label htmlFor="clientUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client Username *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="clientUsername"
                    value={clientSearchTerm}
                    onChange={(e) => handleClientSearchChange(e.target.value)}
                    onFocus={() => setShowClientDropdown(clientSearchTerm.length > 0)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search client username..."
                    disabled={loading}
                    required
                  />
                </div>
              
                {/* Dropdown */}
                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleClientSelect(client.username)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center justify-between group"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">@{client.username}</div>
                        {formData.clientUsername === client.username && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {/* No results message */}
                {showClientDropdown && clientSearchTerm.length > 0 && filteredClients.length === 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg p-3">
                    <div className="text-sm text-gray-500 dark:text-gray-400 text-center">
                      No clients found matching "{clientSearchTerm}"
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-7"></div>
            </div>

            {/* Row 1: Fan Name and Voice/Video Call */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-5">
                <label htmlFor="fanName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Fan Name *
                </label>
                <input
                  type="text"
                  id="fanName"
                  value={formData.fanName}
                  onChange={(e) => setFormData({ ...formData, fanName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. John D."
                  disabled={loading}
                  required
                />
              </div>

              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Request Type
                </label>
                <div className="flex items-center h-10">
                  <input
                    type="checkbox"
                    id="isVoiceVideoCall"
                    checked={formData.isVoiceVideoCall}
                    onChange={(e) => setFormData({ ...formData, isVoiceVideoCall: e.target.checked, callScheduledAt: e.target.checked ? formData.callScheduledAt : '' })}
                    className="w-4 h-4 text-blue-600 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    disabled={loading}
                  />
                  <label htmlFor="isVoiceVideoCall" className="ml-2 flex items-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Video className="w-4 h-4 mr-1" />
                    Voice/Video Call
                  </label>
                </div>
              </div>

              <div className="col-span-3">
                <label htmlFor="length" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Length/Quantity
                </label>
                <input
                  type="text"
                  id="length"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g. 10 min"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Conditional: Call Scheduled Date/Time */}
            {formData.isVoiceVideoCall && (
              <div>
                <label htmlFor="callScheduledAt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Scheduled Date & Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  id="callScheduledAt"
                  value={formData.callScheduledAt}
                  onChange={(e) => setFormData({ ...formData, callScheduledAt: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave empty if call time is not yet confirmed
                </p>
              </div>
            )}

            {/* Row 2: Description and Notes side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description *
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe the custom request..."
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Any additional notes..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* Row 3: Financial fields and Chat Link */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2">
                <label htmlFor="fanLifetimeSpend" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Lifetime Spend ($)
                </label>
                <input
                  type="number"
                  id="fanLifetimeSpend"
                  value={formData.fanLifetimeSpend}
                  onChange={(e) => setFormData({ ...formData, fanLifetimeSpend: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="500"
                  disabled={loading}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="col-span-2">
                <label htmlFor="proposedAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Proposed ($) *
                </label>
                <input
                  type="number"
                  id="proposedAmount"
                  value={formData.proposedAmount}
                  onChange={(e) => setFormData({ ...formData, proposedAmount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50"
                  disabled={loading}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="col-span-2">
                <label htmlFor="amountPaid" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Paid ($) *
                </label>
                <input
                  type="number"
                  id="amountPaid"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="50"
                  disabled={loading}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="chatLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chat Link *
                </label>
                <input
                  type="url"
                  id="chatLink"
                  value={formData.chatLink}
                  onChange={(e) => setFormData({ ...formData, chatLink: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://..."
                  disabled={loading}
                />
              </div>
            </div>

            {/* Image Upload Section - More Compact */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference Images (Optional)
              </label>
              
              <div className="grid grid-cols-12 gap-3">
                {/* Upload Button - Smaller */}
                <label className="cursor-pointer col-span-3">
                  <div className="flex items-center justify-center h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-gray-50 dark:bg-gray-700">
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-gray-400 dark:text-gray-500 mx-auto mb-1" />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Upload
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={loading}
                  />
                </label>

                {/* Image Previews */}
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group col-span-3">
                    <img
                      src={url}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluation Section - Compact */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-12 gap-4 items-start">
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">AI Evaluation</h4>
                  {selectedClient && preferences ? (
                    <button
                      type="button"
                      onClick={evaluateWithGrok}
                      disabled={evaluating || !formData.clientUsername || !formData.description.trim()}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full justify-center"
                    >
                      {evaluating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Evaluating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Evaluate
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
                
                <div className="col-span-10">
                  {!selectedClient ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        💡 Select a client to enable evaluation
                      </p>
                    </div>
                  ) : !preferences ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-sm text-yellow-800 dark:text-yellow-400">
                        ⚠️ Client preferences not found - you can still submit without evaluation
                      </p>
                    </div>
                  ) : hasEvaluated && evaluationResult.status ? (
                    <div className={`border rounded-lg p-3 ${getEvaluationColor()}`}>
                      <div className="flex items-start">
                        {React.createElement(getEvaluationIcon(), { 
                          className: `w-5 h-5 mr-3 mt-0.5 ${
                            evaluationResult.status === 'approved' ? 'text-green-600' :
                            evaluationResult.status === 'rejected' ? 'text-red-600' :
                            evaluationResult.status === 'uncertain' ? 'text-gray-600' :
                            'text-yellow-600'
                          }` 
                        })}
                        <div className="flex-1">
                          <div className="font-semibold text-sm mb-1">
                            {evaluationResult.status === 'approved' ? 'Likely to be Approved ✅' :
                             evaluationResult.status === 'rejected' ? 'Likely to be Rejected ❌' :
                             evaluationResult.status === 'uncertain' ? 'Uncertain - Need More Info ❓' :
                             'Possible with Modifications ⚠️'}
                          </div>
                          <p className="text-sm">{evaluationResult.message}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        💡 Click "Evaluate" to check if this request aligns with @{selectedClient?.username}'s preferences
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || (selectedClient && preferences && !hasEvaluated)}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </div>
                ) : (
                  'Add Custom'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddCustomModal;