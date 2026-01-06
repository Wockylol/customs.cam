import React from 'react';
import { Clock, Star, Zap, ArrowRight, Video, Camera } from 'lucide-react';
import { PriorityFeedItem } from '../../types/priorityFeed';

interface PriorityFeedCardProps {
  item: PriorityFeedItem;
  isPrimary?: boolean;
}

const PriorityFeedCard: React.FC<PriorityFeedCardProps> = ({ item, isPrimary = false }) => {
  // Determine if this is a scene or custom based on type
  const isScene = item.type === 'scene';
  
  // Get accent colors based on urgency
  const getAccentConfig = () => {
    switch (item.urgencyLevel) {
      case 'urgent':
        return {
          gradient: 'from-rose-500 via-red-500 to-orange-500',
          lightBg: 'bg-rose-50',
          border: 'border-rose-200',
          text: 'text-rose-600',
          badgeBg: 'bg-rose-500',
          glow: 'shadow-rose-500/20',
        };
      case 'high':
        return {
          gradient: 'from-orange-500 via-amber-500 to-yellow-500',
          lightBg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-600',
          badgeBg: 'bg-amber-500',
          glow: 'shadow-amber-500/20',
        };
      case 'medium':
        return {
          gradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
          lightBg: 'bg-violet-50',
          border: 'border-violet-200',
          text: 'text-violet-600',
          badgeBg: 'bg-violet-500',
          glow: 'shadow-violet-500/20',
        };
      case 'low':
      default:
        return {
          gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
          lightBg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-600',
          badgeBg: 'bg-emerald-500',
          glow: 'shadow-emerald-500/20',
        };
    }
  };

  const accent = getAccentConfig();

  return (
    <div
      className={`
        relative overflow-hidden
        bg-white rounded-[28px]
        border border-gray-100
        transition-all duration-300 ease-out
        hover:shadow-xl ${accent.glow}
        active:scale-[0.98]
        ${isPrimary ? 'shadow-lg' : 'shadow-md shadow-gray-200/60'}
      `}
    >
      {/* Top Gradient Accent Bar */}
      <div className={`h-1.5 bg-gradient-to-r ${accent.gradient}`} />
      
      {/* Card Content */}
      <div className={`${isPrimary ? 'p-5' : 'p-4'}`}>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Left: Icon + Badge */}
          <div className="flex items-start gap-3">
            {/* Type Icon */}
            <div className={`
              w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0
              bg-gradient-to-br ${accent.gradient} shadow-lg ${accent.glow}
            `}>
              {isScene ? (
                <Video className="w-5 h-5 text-white" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
            </div>
            
            <div className="min-w-0">
              {/* Status Badge */}
              {item.badge && (
                <div className={`
                  inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full mb-2
                  ${accent.lightBg} ${accent.border} border
                `}>
                  <div className={`w-1.5 h-1.5 rounded-full ${accent.badgeBg} animate-pulse`} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${accent.text}`}>
                    {item.badge}
                  </span>
                </div>
              )}
              
              {/* Title */}
              <h3 className={`
                font-bold text-gray-900 leading-snug
                ${isPrimary ? 'text-[17px]' : 'text-[15px]'}
              `}>
                {item.title}
              </h3>
            </div>
          </div>

          {/* Right: Amount */}
          {item.amount && item.amount > 0 && (
            <div className="flex-shrink-0 text-right">
              <div className={`
                font-extrabold bg-gradient-to-r ${accent.gradient} 
                bg-clip-text text-transparent
                ${isPrimary ? 'text-2xl' : 'text-xl'}
              `}>
                ${item.amount.toFixed(0)}
              </div>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                Earnings
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <p className={`
          text-gray-500 leading-relaxed mb-4 line-clamp-2
          ${isPrimary ? 'text-[14px]' : 'text-[13px]'}
        `}>
          {item.subtitle}
        </p>

        {/* Meta Row */}
        <div className="flex items-center justify-between mb-4">
          {/* Time */}
          {item.timeWaiting && (
            <div className={`
              flex items-center gap-1.5 text-xs
              ${item.urgencyLevel === 'urgent' ? `${accent.text} font-semibold` : 'text-gray-400'}
            `}>
              <Clock className="w-3.5 h-3.5" />
              <span>{item.timeWaiting}</span>
            </div>
          )}

          {/* VIP Badge */}
          {item.isVIP && (
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200/60 rounded-full px-2.5 py-1">
              <Star className="w-3.5 h-3.5 text-amber-500" fill="currentColor" />
              <span className="text-[11px] font-bold text-amber-600">VIP</span>
            </div>
          )}
        </div>

        {/* Urgent Alert */}
        {item.urgencyLevel === 'urgent' && isPrimary && (
          <div className={`
            mb-4 p-3.5 rounded-2xl
            bg-gradient-to-r from-rose-50 to-orange-50
            border border-rose-200/60
          `}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
                <Zap className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-rose-700 uppercase tracking-wide">Priority Action</p>
                <p className="text-[11px] text-rose-600/80">This has been waiting longer than usual</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={item.onAction}
          className={`
            w-full py-3.5 px-5 rounded-2xl
            bg-gradient-to-r ${accent.gradient}
            text-white font-bold
            shadow-lg ${accent.glow}
            transition-all duration-200
            hover:shadow-xl hover:-translate-y-0.5
            active:translate-y-0 active:shadow-md active:scale-[0.98]
            flex items-center justify-center gap-2
            ${isPrimary ? 'text-[15px]' : 'text-[14px]'}
          `}
        >
          {item.urgencyLevel === 'urgent' && isPrimary && (
            <Zap className="w-4 h-4" fill="currentColor" />
          )}
          <span>{item.actionLabel}</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default PriorityFeedCard;
