import React from 'react';
import { CheckCircle2, Bell } from 'lucide-react';

interface StatusLineProps {
  itemCount: number;
}

const StatusLine: React.FC<StatusLineProps> = ({ itemCount }) => {
  if (itemCount === 0) {
    return (
      <div className="flex items-center">
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full pl-2 pr-3 py-1">
          <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-white text-sm font-semibold">All caught up!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center">
      <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full pl-2 pr-3 py-1">
        <div className="relative">
          <div className="w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
            <Bell className="w-3 h-3 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
        </div>
        <span className="text-white text-sm font-semibold">
          {itemCount} {itemCount === 1 ? 'item' : 'items'} need{itemCount === 1 ? 's' : ''} attention
        </span>
      </div>
    </div>
  );
};

export default StatusLine;
