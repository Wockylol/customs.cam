import React from 'react';
import { Upload, Calendar, DollarSign, CheckCircle } from 'lucide-react';
import { Database } from '../../lib/database.types';
import StatusBadge from './StatusBadge';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

interface CustomCardProps {
  custom: CustomRequest;
  onClick?: () => void;
  onMarkComplete?: (customId: string) => void;
  showMarkComplete?: boolean;
}

const CustomCard: React.FC<CustomCardProps> = ({ 
  custom, 
  onClick, 
  onMarkComplete, 
  showMarkComplete = false 
}) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0';
    return `$${amount.toFixed(2)}`;
  };

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (onMarkComplete) {
      onMarkComplete(custom.id);
    }
  };

  const canMarkComplete = custom.status === 'pending' || custom.status === 'in_progress';
  return (
    <div 
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {custom.fan_name}
          </h3>
          <StatusBadge status={custom.status} />
        </div>
        <div className="text-right">
          <div className="flex items-center text-green-600 font-semibold">
            <DollarSign className="w-4 h-4 mr-1" />
            {formatCurrency(custom.proposed_amount)}
          </div>
          {custom.amount_paid && (
            <div className="text-sm text-gray-500 mt-1">
              Paid: {formatCurrency(custom.amount_paid)}
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {custom.description}
        </p>
      </div>
      
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          {formatDate(custom.date_submitted)}
        </div>
        <div className="font-medium">
          {custom.length_duration || '-'}
        </div>
      </div>
      
      {custom.notes && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <strong>Notes:</strong> {custom.notes}
          </p>
        </div>
      )}

      {showMarkComplete && canMarkComplete && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleMarkComplete}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Complete
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomCard;