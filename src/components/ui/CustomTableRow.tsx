import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, MessageCircle, CheckCircle } from 'lucide-react';
import { Database } from '../../lib/database.types';
import StatusBadge from './StatusBadge';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'] & {
  clients?: { username: string } | null;
};

interface CustomTableRowProps {
  custom: CustomRequest;
  showClientColumn?: boolean;
  onClick?: () => void;
  onMarkComplete?: (customId: string) => void;
  showMarkComplete?: boolean;
}

const CustomTableRow: React.FC<CustomTableRowProps> = ({ 
  custom, 
  showClientColumn = false, 
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
    if (amount === null || amount === undefined) return '-';
    return `$${amount.toFixed(2)}`;
  };

  const handleMarkComplete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click
    if (onMarkComplete) {
      onMarkComplete(custom.id);
    }
  };

  const canMarkComplete = custom.status === 'pending' || custom.status === 'in_progress';
  return (
    <tr className="hover:bg-gray-50 cursor-pointer" onClick={onClick}>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {custom.fan_name}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
        {custom.fan_lifetime_spend ? `$${custom.fan_lifetime_spend.toFixed(2)}` : '-'}
      </td>
      {showClientColumn && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {custom.clients?.username ? (
            <Link 
              to={`/clients/${custom.clients.username}`}
              className="text-blue-600 hover:text-blue-800"
            >
              @{custom.clients.username}
            </Link>
          ) : (
            'Unknown Client'
          )}
        </td>
      )}
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="max-w-xs truncate">
          {custom.description}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formatDate(custom.date_submitted)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
        {formatCurrency(custom.proposed_amount)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
        {formatCurrency(custom.amount_paid)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {custom.length_duration || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={custom.status} />
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        <div className="max-w-xs truncate">
          {custom.notes || '-'}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {custom.chat_link ? (
          <a 
            href={custom.chat_link} 
            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Chat
          </a>
        ) : (
          '-'
        )}
      </td>
      {showMarkComplete && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {canMarkComplete ? (
            <button
              onClick={handleMarkComplete}
              className="inline-flex items-center justify-center w-8 h-8 border border-transparent rounded-full text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : (
            '-'
          )}
        </td>
      )}
    </tr>
  );
};

export default CustomTableRow;