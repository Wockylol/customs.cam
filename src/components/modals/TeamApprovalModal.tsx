import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Database } from '../../lib/database.types';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

interface TeamApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  custom: CustomRequest | null;
  onApprove: (customId: string) => Promise<{ error: string | null }>;
  onDeny: (customId: string) => Promise<{ error: string | null }>;
}

const TeamApprovalModal: React.FC<TeamApprovalModalProps> = ({ 
  isOpen, 
  onClose, 
  custom, 
  onApprove, 
  onDeny 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<'approve' | 'deny' | null>(null);

  if (!isOpen || !custom) return null;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    setAction('approve');
    
    const { error } = await onApprove(custom.id);
    
    if (error) {
      setError(error);
    } else {
      onClose();
    }
    
    setLoading(false);
    setAction(null);
  };

  const handleDeny = async () => {
    setLoading(true);
    setError(null);
    setAction('deny');
    
    const { error } = await onDeny(custom.id);
    
    if (error) {
      setError(error);
    } else {
      onClose();
    }
    
    setLoading(false);
    setAction(null);
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Team Approval Required
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Custom Request Details */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Fan Name</label>
                <p className="text-gray-900">{custom.fan_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Proposed Amount</label>
                <p className="text-green-600 font-semibold">{formatCurrency(custom.proposed_amount)}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600">Description</label>
              <p className="text-gray-900 mt-1">{custom.description}</p>
            </div>

            {custom.length_duration && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-600">Length/Duration</label>
                <p className="text-gray-900">{custom.length_duration}</p>
              </div>
            )}

            {custom.notes && (
              <div>
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <p className="text-gray-900">{custom.notes}</p>
              </div>
            )}
          </div>

          {/* Warning for Deny */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Denying this request will permanently delete it. 
                  Approving will make it visible to the client for their approval.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            
            <button
              onClick={handleDeny}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading && action === 'deny' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Denying...
                </div>
              ) : (
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 mr-2" />
                  Deny & Delete
                </div>
              )}
            </button>
            
            <button
              onClick={handleApprove}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading && action === 'approve' ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Approving...
                </div>
              ) : (
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamApprovalModal;