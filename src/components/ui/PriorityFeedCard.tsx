import React from 'react';
import { Clock, Star, AlertCircle, Zap } from 'lucide-react';
import { PriorityFeedItem } from '../../types/priorityFeed';

interface PriorityFeedCardProps {
  item: PriorityFeedItem;
  isPrimary?: boolean; // First item gets special treatment
}

const PriorityFeedCard: React.FC<PriorityFeedCardProps> = ({ item, isPrimary = false }) => {
  // Get left border color based on urgency
  const getBorderColor = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'border-l-red-500';
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-purple-500';
      default:
        return 'border-l-gray-400';
    }
  };

  // Get badge colors
  const getBadgeColors = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Get button colors
  const getButtonColors = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'bg-red-500 hover:bg-red-600';
      case 'high':
        return 'bg-orange-500 hover:bg-orange-600';
      case 'medium':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'low':
        return 'bg-purple-500 hover:bg-purple-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 
        overflow-hidden border-l-4 ${getBorderColor()}
        transform hover:scale-[1.01] active:scale-[0.99]
        ${isPrimary ? 'min-h-[180px]' : 'min-h-[150px]'}
      `}
    >
      {/* Content */}
      <div className="p-5">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              {/* Urgency Badge */}
              {item.badge && (
                <div className={`inline-flex items-center mb-2 rounded-full px-2.5 py-1 border ${getBadgeColors()}`}>
                  <span className="text-xs font-semibold">{item.badge}</span>
                </div>
              )}
              
              {/* Title */}
              <h3 className={`text-gray-900 font-bold leading-tight ${isPrimary ? 'text-lg' : 'text-base'}`}>
                {item.title}
              </h3>
            </div>

            {/* Amount (if present) */}
            {item.amount && (
              <div className="ml-4 text-right flex-shrink-0">
                <div className={`text-gray-900 font-bold ${isPrimary ? 'text-2xl' : 'text-xl'}`}>
                  ${item.amount.toFixed(0)}
                </div>
              </div>
            )}
          </div>
          
          {/* Subtitle */}
          <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
            {item.subtitle}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between mb-4">
          {/* Time Waiting */}
          {item.timeWaiting && (
            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3.5 h-3.5 mr-1" />
              <span className={item.urgencyLevel === 'urgent' ? 'text-red-600 font-medium' : ''}>
                {item.timeWaiting}
              </span>
            </div>
          )}

          {/* VIP Badge */}
          {item.isVIP && (
            <div className="flex items-center bg-yellow-50 border border-yellow-200 rounded-full px-2 py-0.5">
              <Star className="w-3 h-3 text-yellow-600 mr-1" fill="currentColor" />
              <span className="text-yellow-700 text-xs font-medium">VIP</span>
            </div>
          )}
        </div>

        {/* Special alert for urgent items */}
        {item.urgencyLevel === 'urgent' && isPrimary && (
          <div className="mb-4 bg-red-50 border border-red-100 rounded-xl p-3 flex items-start">
            <AlertCircle className="w-4 h-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-red-800 font-semibold">DO THIS FIRST</p>
              <p className="text-xs text-red-600 mt-0.5">Waiting longer than usual</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={item.onAction}
          className={`
            w-full py-3 px-4 rounded-xl font-semibold text-sm
            ${getButtonColors()}
            text-white shadow-sm hover:shadow-md
            transition-all duration-200 transform active:scale-95
            flex items-center justify-center
            ${isPrimary ? 'py-3.5' : ''}
          `}
        >
          {item.urgencyLevel === 'urgent' && isPrimary && <Zap className="w-4 h-4 mr-2" />}
          {item.actionLabel}
        </button>
      </div>
    </div>
  );
};

export default PriorityFeedCard;

