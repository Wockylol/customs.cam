import React from 'react';
import { CheckCircle, TrendingUp, Settings } from 'lucide-react';

interface PriorityFeedZeroStateProps {
  onNavigateSettings?: () => void;
  totalEarned?: number;
}

const PriorityFeedZeroState: React.FC<PriorityFeedZeroStateProps> = ({
  onNavigateSettings,
  totalEarned = 0,
}) => {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-sm text-center animate-fade-in-scale">
      {/* Animated Checkmark */}
      <div className="relative mb-6">
        <div className="w-20 h-20 mx-auto bg-green-50 border-2 border-green-200 rounded-full flex items-center justify-center animate-bounce-in">
          <CheckCircle className="w-10 h-10 text-green-600 animate-scale-in" style={{ animationDelay: '0.2s' }} />
        </div>
        {/* Sparkles */}
        <div className="absolute -top-2 -right-2 text-3xl animate-float" style={{ animationDelay: '0.1s' }}>✨</div>
        <div className="absolute -bottom-2 -left-2 text-3xl animate-float" style={{ animationDelay: '0.3s' }}>🎉</div>
      </div>

      {/* Main Message */}
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        All caught up!
      </h3>
      <p className="text-gray-600 text-sm mb-6 leading-relaxed">
        No pending work right now. Time to relax! 🌟
      </p>

      {/* Earnings Highlight */}
      {totalEarned > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-purple-600 mr-2" />
            <span className="text-xs text-purple-700 font-semibold">Total Earned</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">
            ${totalEarned.toFixed(0)}
          </div>
        </div>
      )}

      {/* Suggested Actions */}
      {onNavigateSettings && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-3">What would you like to do?</p>
          
          <button
            onClick={onNavigateSettings}
            className="w-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 active:scale-95 border border-gray-200"
          >
            <Settings className="w-4 h-4 mr-2" />
            Update Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default PriorityFeedZeroState;

