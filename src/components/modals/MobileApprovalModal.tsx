import React, { useState } from 'react';
import { X, CheckCircle, Calendar, Heart, Sparkles, Clock } from 'lucide-react';
import { Database } from '../../lib/database.types';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

interface MobileApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  custom: CustomRequest | null;
  onApprove: (customId: string, estimatedDeliveryDate: string) => Promise<{ error: string | null }>;
}

const MobileApprovalModal: React.FC<MobileApprovalModalProps> = ({ 
  isOpen, 
  onClose, 
  custom, 
  onApprove 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  if (!isOpen || !custom) return null;

  const handleApprove = async () => {
    if (!estimatedDeliveryDate) {
      setError('Please select when you can deliver this 💕');
      return;
    }

    setLoading(true);
    setError(null);
    
    const { error } = await onApprove(custom.id, estimatedDeliveryDate);
    
    if (error) {
      setError(error);
    } else {
      onClose();
      setEstimatedDeliveryDate('');
    }
    
    setLoading(false);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0';
    return `$${amount.toFixed(0)}`;
  };

  // Set minimum date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center"
            disabled={loading}
          >
            <X className="w-4 h-4 text-white" />
          </button>
          
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center mr-4">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Approve Custom Request</h2>
              <p className="text-pink-100 text-sm">From {custom.fan_name}</p>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{custom.fan_name}</h3>
                  <p className="text-sm text-gray-600">Custom Request</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(custom.proposed_amount)}
                </div>
                {custom.amount_paid && (
                  <div className="text-xs text-gray-500">
                    ${custom.amount_paid.toFixed(0)} paid
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-3 mb-4">
              <p className="text-gray-800 text-sm leading-relaxed">{custom.description}</p>
            </div>

            {custom.length_duration && (
              <div className="flex items-center justify-center bg-white rounded-lg py-2 px-3">
                <Clock className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">{custom.length_duration}</span>
              </div>
            )}

            {custom.fan_lifetime_spend && (
              <div className="bg-yellow-100 rounded-lg p-3 mt-3">
                <div className="flex items-center justify-center">
                  <Heart className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-semibold text-yellow-800">
                    VIP Fan • ${custom.fan_lifetime_spend.toFixed(0)} lifetime spend
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Delivery Date Selection */}
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center mb-3">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="font-semibold text-blue-900">When can you deliver this? 📅</h4>
            </div>
            <input
              type="date"
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              min={minDate}
              className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-medium"
              required
            />
            <p className="text-sm text-blue-700 mt-2 text-center">
              This helps set expectations with your fan 💕
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleApprove}
              disabled={loading || !estimatedDeliveryDate}
              className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Approving...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 mr-3" />
                  Yes, Approve! ✨
                </div>
              )}
            </button>
            
            <button
              onClick={onClose}
              className="w-full border-2 border-gray-300 text-gray-700 py-4 px-6 rounded-2xl font-semibold text-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileApprovalModal;