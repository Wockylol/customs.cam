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
    <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-fade-in-scale">
      {/* Animated Checkmark */}
      <div className="relative mb-6">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce-in">
          <CheckCircle className="w-12 h-12 text-white animate-scale-in" style={{ animationDelay: '0.2s' }} />
        </div>
        {/* Sparkles */}
        <div className="absolute -top-2 -right-2 text-4xl animate-float" style={{ animationDelay: '0.1s' }}>✨</div>
        <div className="absolute -bottom-2 -left-2 text-4xl animate-float" style={{ animationDelay: '0.3s' }}>🎉</div>
      </div>

      {/* Main Message */}
      <h3 className="text-2xl font-bold text-gray-900 mb-2">
        All caught up!
      </h3>
      <p className="text-gray-600 mb-6">
        No pending work right now. Time to relax! 🌟
      </p>

      {/* Earnings Highlight */}
      {totalEarned > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
            <span className="text-sm text-purple-700 font-medium">Total Earned</span>
          </div>
          <div className="text-3xl font-bold text-purple-900">
            ${totalEarned.toFixed(0)}
          </div>
        </div>
      )}

      {/* Suggested Actions */}
      {onNavigateSettings && (
        <div>
          <p className="text-sm text-gray-500 font-medium mb-3">What would you like to do?</p>
          
          <button
            onClick={onNavigateSettings}
            className="w-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200 transform hover:scale-105 active:scale-95"
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

