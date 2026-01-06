import React from 'react';
import { Sparkles, TrendingUp, Settings, PartyPopper } from 'lucide-react';

interface PriorityFeedZeroStateProps {
  onNavigateSettings?: () => void;
  totalEarned?: number;
}

const PriorityFeedZeroState: React.FC<PriorityFeedZeroStateProps> = ({
  onNavigateSettings,
  totalEarned = 0,
}) => {
  return (
    <div className="relative overflow-hidden bg-white rounded-[28px] shadow-lg shadow-gray-200/60 border border-gray-100">
      {/* Decorative gradient top */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400" />
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />
      
      <div className="relative p-8 text-center">
        {/* Celebration Icon */}
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/30 rotate-3 transform hover:rotate-0 transition-transform duration-300">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
          {/* Floating sparkles */}
          <div className="absolute -top-2 -right-3 animate-bounce" style={{ animationDelay: '0.1s' }}>
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div className="absolute -bottom-1 -left-3 animate-bounce" style={{ animationDelay: '0.3s' }}>
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
        </div>

        {/* Message */}
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
          You're All Set!
        </h3>
        <p className="text-gray-500 text-[15px] mb-6 leading-relaxed max-w-xs mx-auto">
          No pending tasks right now. Take a break, you've earned it!
        </p>

        {/* Earnings Card - Only show if there are earnings */}
        {totalEarned > 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold text-violet-700">Your Earnings</span>
            </div>
            <div className="text-4xl font-extrabold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
              ${totalEarned.toFixed(0)}
            </div>
            <p className="text-xs text-violet-500 mt-1 font-medium">Keep up the amazing work!</p>
          </div>
        )}

        {/* Welcome message for new users with $0 */}
        {totalEarned === 0 && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-bold text-amber-700">Welcome!</span>
            </div>
            <p className="text-[13px] text-amber-600 leading-relaxed">
              Your journey starts here. Complete customs and scenes to start earning!
            </p>
          </div>
        )}

        {/* Settings Button */}
        {onNavigateSettings && (
          <button
            onClick={onNavigateSettings}
            className="
              w-full py-3.5 px-5 rounded-2xl
              bg-gray-100 hover:bg-gray-200
              text-gray-700 font-semibold text-[14px]
              transition-all duration-200
              active:scale-[0.98]
              flex items-center justify-center gap-2
            "
          >
            <Settings className="w-4 h-4" />
            <span>Update Your Settings</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PriorityFeedZeroState;
