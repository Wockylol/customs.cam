import React from 'react';
import { Clock, DollarSign, Star, AlertCircle, Zap } from 'lucide-react';
import { PriorityFeedItem } from '../../types/priorityFeed';

interface PriorityFeedCardProps {
  item: PriorityFeedItem;
  isPrimary?: boolean; // First item gets special treatment
}

const PriorityFeedCard: React.FC<PriorityFeedCardProps> = ({ item, isPrimary = false }) => {
  const getUrgencyGradient = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'from-red-500 to-red-600';
      case 'high':
        return 'from-orange-500 to-orange-600';
      case 'medium':
        return 'from-blue-500 to-blue-600';
      case 'low':
        return 'from-purple-500 to-purple-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getUrgencyBorderColor = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'border-red-400';
      case 'high':
        return 'border-orange-400';
      case 'medium':
        return 'border-blue-400';
      case 'low':
        return 'border-purple-400';
      default:
        return 'border-gray-400';
    }
  };

  const getUrgencyBgColor = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'bg-red-50';
      case 'high':
        return 'bg-orange-50';
      case 'medium':
        return 'bg-blue-50';
      case 'low':
        return 'bg-purple-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getUrgencyTextColor = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'text-red-700';
      case 'high':
        return 'text-orange-700';
      case 'medium':
        return 'text-blue-700';
      case 'low':
        return 'text-purple-700';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div
      className={`
        bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 
        overflow-hidden border-2 ${getUrgencyBorderColor()}
        transform hover:scale-[1.02] active:scale-[0.98]
        ${isPrimary ? 'min-h-[200px]' : 'min-h-[160px]'}
      `}
    >
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r ${getUrgencyGradient()} p-4`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Urgency Badge */}
            {item.badge && (
              <div className="inline-flex items-center mb-2 bg-white bg-opacity-20 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-white text-xs font-bold">{item.badge}</span>
              </div>
            )}
            
            {/* Title */}
            <h3 className={`text-white font-bold mb-1 ${isPrimary ? 'text-xl' : 'text-lg'}`}>
              {item.title}
            </h3>
            
            {/* Subtitle */}
            <p className="text-white text-sm opacity-90 line-clamp-2">
              {item.subtitle}
            </p>
          </div>

          {/* Amount (if present) */}
          {item.amount && (
            <div className="ml-4 text-right">
              <div className={`text-white font-bold ${isPrimary ? 'text-2xl' : 'text-xl'}`}>
                ${item.amount.toFixed(0)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Meta Info */}
        <div className="flex items-center justify-between mb-4">
          {/* Time Waiting */}
          {item.timeWaiting && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              <span className={item.urgencyLevel === 'urgent' ? 'text-red-600 font-semibold' : ''}>
                {item.timeWaiting}
              </span>
            </div>
          )}

          {/* VIP Badge */}
          {item.isVIP && (
            <div className="flex items-center bg-yellow-100 rounded-full px-2 py-1">
              <Star className="w-4 h-4 text-yellow-600 mr-1" />
              <span className="text-yellow-700 text-xs font-semibold">VIP</span>
            </div>
          )}
        </div>

        {/* Special alerts for urgent items */}
        {item.urgencyLevel === 'urgent' && isPrimary && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800 font-semibold">DO THIS FIRST</p>
              <p className="text-xs text-red-700 mt-0.5">This request has been waiting a long time</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={item.onAction}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold text-sm
            bg-gradient-to-r ${getUrgencyGradient()}
            text-white shadow-lg hover:shadow-xl
            transition-all duration-300 transform hover:scale-105 active:scale-95
            flex items-center justify-center
            ${isPrimary ? 'text-base py-4' : ''}
          `}
        >
          {item.urgencyLevel === 'urgent' && <Zap className="w-4 h-4 mr-2" />}
          {item.actionLabel}
        </button>
      </div>
    </div>
  );
};

export default PriorityFeedCard;

