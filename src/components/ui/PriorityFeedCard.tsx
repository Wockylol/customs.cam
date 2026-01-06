import React from 'react';
import { Clock, Star, AlertCircle, Zap, ChevronRight } from 'lucide-react';
import { PriorityFeedItem } from '../../types/priorityFeed';

interface PriorityFeedCardProps {
  item: PriorityFeedItem;
  isPrimary?: boolean; // First item gets special treatment
}

const PriorityFeedCard: React.FC<PriorityFeedCardProps> = ({ item, isPrimary = false }) => {
  // Get gradient background based on urgency
  const getCardGradient = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'bg-gradient-to-br from-white via-red-50/40 to-rose-50/60';
      case 'high':
        return 'bg-gradient-to-br from-white via-orange-50/40 to-amber-50/60';
      case 'medium':
        return 'bg-gradient-to-br from-white via-blue-50/40 to-indigo-50/60';
      case 'low':
        return 'bg-gradient-to-br from-white via-purple-50/40 to-violet-50/60';
      default:
        return 'bg-white';
    }
  };

  // Get accent color for left border
  const getAccentBorder = () => {
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
        return 'border-l-gray-300';
    }
  };

  // Get badge colors
  const getBadgeColors = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get button gradient
  const getButtonGradient = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-red-500/25';
      case 'high':
        return 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/25';
      case 'medium':
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-blue-500/25';
      case 'low':
        return 'bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-purple-500/25';
      default:
        return 'bg-gradient-to-r from-gray-500 to-slate-500 hover:from-gray-600 hover:to-slate-600 shadow-gray-500/25';
    }
  };

  // Get amount color
  const getAmountColor = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-blue-600';
      case 'low':
        return 'text-purple-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div
      className={`
        ${getCardGradient()}
        rounded-3xl overflow-hidden border-l-4 ${getAccentBorder()}
        border border-gray-100/80
        transition-all duration-300 ease-out
        hover:shadow-lg hover:shadow-gray-200/50
        active:scale-[0.99]
        ${isPrimary ? 'shadow-md shadow-gray-200/60' : 'shadow-sm'}
      `}
    >
      {/* Content */}
      <div className={`${isPrimary ? 'p-5' : 'p-4'}`}>
        {/* Header Section */}
        <div className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Urgency Badge */}
              {item.badge && (
                <div className={`inline-flex items-center mb-2 rounded-full px-2.5 py-1 border ${getBadgeColors()}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wide">{item.badge}</span>
                </div>
              )}
              
              {/* Title */}
              <h3 className={`text-gray-900 font-bold leading-snug ${isPrimary ? 'text-lg' : 'text-base'}`}>
                {item.title}
              </h3>
            </div>

            {/* Amount (if present) */}
            {item.amount && (
              <div className="flex-shrink-0 text-right">
                <div className={`font-bold ${getAmountColor()} ${isPrimary ? 'text-2xl' : 'text-xl'}`}>
                  ${item.amount.toFixed(0)}
                </div>
              </div>
            )}
          </div>
          
          {/* Subtitle */}
          <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed mt-1.5">
            {item.subtitle}
          </p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between mb-4">
          {/* Time Waiting */}
          {item.timeWaiting && (
            <div className={`flex items-center text-xs ${
              item.urgencyLevel === 'urgent' ? 'text-red-600 font-semibold' : 'text-gray-400'
            }`}>
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              <span>{item.timeWaiting}</span>
            </div>
          )}

          {/* VIP Badge */}
          {item.isVIP && (
            <div className="flex items-center bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 rounded-full px-2.5 py-1">
              <Star className="w-3 h-3 text-amber-500 mr-1" fill="currentColor" />
              <span className="text-amber-700 text-[11px] font-bold">VIP</span>
            </div>
          )}
        </div>

        {/* Special alert for urgent items */}
        {item.urgencyLevel === 'urgent' && isPrimary && (
          <div className="mb-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/60 rounded-2xl p-3.5 flex items-start">
            <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center mr-3 flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-red-800 font-bold">DO THIS FIRST</p>
              <p className="text-xs text-red-600/80 mt-0.5">Waiting longer than usual</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={item.onAction}
          className={`
            w-full py-3 px-4 rounded-2xl font-bold text-sm
            ${getButtonGradient()}
            text-white shadow-lg
            transition-all duration-200 
            hover:shadow-xl hover:-translate-y-0.5
            active:translate-y-0 active:shadow-md active:scale-[0.98]
            flex items-center justify-center
            ${isPrimary ? 'py-3.5 text-[15px]' : ''}
          `}
        >
          {item.urgencyLevel === 'urgent' && isPrimary && (
            <Zap className="w-4 h-4 mr-2" fill="currentColor" />
          )}
          <span>{item.actionLabel}</span>
          <ChevronRight className="w-4 h-4 ml-1.5 opacity-70" />
        </button>
      </div>
    </div>
  );
};

export default PriorityFeedCard;
