import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Calendar, DollarSign, Clock, Image as ImageIcon, User, Loader2, Edit2, Save } from 'lucide-react';

interface SaleApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  onApprove: (saleId: string, approved: boolean, notes?: string) => Promise<{ error: string | null }>;
  onUpdate?: (saleId: string, updates: any) => Promise<{ error: string | null }>;
}

const SaleApprovalModal: React.FC<SaleApprovalModalProps> = ({
  isOpen,
  onClose,
  sale,
  onApprove,
  onUpdate,
}) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    sale_date: '',
    sale_time: '',
    gross_amount: '',
    screenshot_url: '',
    notes: '',
  });
  
  // Helper to format date without timezone issues
  const formatLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${month}/${day}/${year}`;
  };

  useEffect(() => {
    if (sale) {
      setEditedData({
        sale_date: sale.sale_date || '',
        sale_time: sale.sale_time || '',
        gross_amount: sale.gross_amount?.toString() || '',
        screenshot_url: sale.screenshot_url || '',
        notes: sale.notes || '',
      });
      setApprovalNotes('');
      setIsEditing(false);
      setLoading(false); // Reset loading state when new sale is opened
      setError(null); // Also reset any previous errors
    }
  }, [sale]);

  if (!isOpen || !sale) return null;

  const handleSaveEdit = async () => {
    if (!onUpdate) return;

    setLoading(true);
    setError(null);

    const { error: updateError } = await onUpdate(sale.id, {
      saleDate: editedData.sale_date,
      saleTime: editedData.sale_time || undefined,
      grossAmount: parseFloat(editedData.gross_amount),
      screenshotUrl: editedData.screenshot_url || undefined,
      notes: editedData.notes || undefined,
    });

    if (updateError) {
      setError(updateError);
      setLoading(false);
    } else {
      setIsEditing(false);
      setLoading(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    setLoading(true);
    setError(null);

    const { error: approvalError } = await onApprove(
      sale.id,
      approved,
      approvalNotes || undefined
    );

    if (approvalError) {
      setError(approvalError);
      setLoading(false);
    } else {
      setApprovalNotes('');
      onClose();
    }
  };

  const handleClose = () => {
    setApprovalNotes('');
    setError(null);
    setIsEditing(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Sale' : 'Review Sale'}
          </h2>
          <div className="flex items-center space-x-2">
            {!isEditing && onUpdate && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                disabled={loading}
                title="Edit sale"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={loading}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Sale Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chatter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Submitted by
              </label>
              <div className="flex items-center space-x-2">
                <User className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900 dark:text-white font-medium">
                  {sale.chatter?.full_name || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Client/Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Model
              </label>
              <div className="flex items-center space-x-2">
                {sale.clients?.avatar_url ? (
                  <img
                    src={sale.clients.avatar_url}
                    alt={sale.clients.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {sale.clients?.username?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  @{sale.clients?.username || 'Unknown'}
                </span>
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sale Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedData.sale_date}
                  onChange={(e) => setEditedData({ ...editedData, sale_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">
                    {formatLocalDate(sale.sale_date)}
                  </span>
                </div>
              )}
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time {!isEditing && !sale.sale_time && '(Not set)'}
              </label>
              {isEditing ? (
                <input
                  type="time"
                  value={editedData.sale_time}
                  onChange={(e) => setEditedData({ ...editedData, sale_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              ) : sale.sale_time ? (
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{sale.sale_time}</span>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">-</div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              {isEditing ? (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Gross Amount (Chatter inputs this)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editedData.gross_amount}
                    onChange={(e) => setEditedData({ ...editedData, gross_amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  {editedData.gross_amount && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      Net Revenue: <span className="font-semibold text-green-600 dark:text-green-400">
                        ${(parseFloat(editedData.gross_amount) * 0.8).toFixed(2)}
                      </span> (after 20% commission)
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="w-5 h-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${(sale.gross_amount * 0.8).toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">net</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gross: ${sale.gross_amount.toFixed(2)} (−20% = ${(sale.gross_amount * 0.2).toFixed(2)} commission)
                  </p>
                </div>
              )}
            </div>

            {/* Submitted Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Submitted On
              </label>
              <div className="text-gray-900 dark:text-white">
                {new Date(sale.created_at).toLocaleDateString()} at{' '}
                {new Date(sale.created_at).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Screenshot Evidence
            </label>
            {isEditing ? (
              <input
                type="url"
                placeholder="Screenshot URL"
                value={editedData.screenshot_url}
                onChange={(e) => setEditedData({ ...editedData, screenshot_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            ) : sale.screenshot_url ? (
              <>
                <a
                  href={sale.screenshot_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={sale.screenshot_url}
                    alt="Sale screenshot"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 hover:border-blue-500 transition-colors cursor-pointer"
                  />
                </a>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Click image to view full size in new tab
                </p>
              </>
            ) : (
              <div className="text-gray-400 text-sm">No screenshot provided</div>
            )}
          </div>

          {/* Existing Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chatter Notes
            </label>
            {isEditing ? (
              <textarea
                value={editedData.notes}
                onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              />
            ) : sale.notes ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-gray-900 dark:text-white">
                {sale.notes}
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No notes</div>
            )}
          </div>

          {/* Approval Notes */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Approval/Rejection Notes (Optional)
              </label>
              <textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval or rejection..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                disabled={loading}
              />
            </div>
          )}

          {/* Status */}
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              sale.status === 'pending'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : sale.status === 'valid'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {sale.status === 'pending' && <Clock className="w-4 h-4 mr-1" />}
              {sale.status === 'valid' && <CheckCircle className="w-4 h-4 mr-1" />}
              {sale.status === 'invalid' && <XCircle className="w-4 h-4 mr-1" />}
              Current Status: {sale.status.charAt(0).toUpperCase() + sale.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Actions */}
        {isEditing ? (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditedData({
                  sale_date: sale.sale_date || '',
                  sale_time: sale.sale_time || '',
                  gross_amount: sale.gross_amount?.toString() || '',
                  screenshot_url: sale.screenshot_url || '',
                  notes: sale.notes || '',
                });
              }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </button>
          </div>
        ) : sale.status === 'pending' ? (
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={() => handleApprove(false)}
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <XCircle className="w-5 h-5" />
              <span>Reject Sale</span>
            </button>
            <button
              onClick={() => handleApprove(true)}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <CheckCircle className="w-5 h-5" />
              <span>Approve Sale</span>
            </button>
          </div>
        ) : (
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleApprovalModal;

