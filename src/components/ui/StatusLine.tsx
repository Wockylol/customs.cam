import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface StatusLineProps {
  itemCount: number;
  lastVisit?: Date | null;
}

const StatusLine: React.FC<StatusLineProps> = ({ itemCount, lastVisit }) => {
  const formatLastVisit = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between text-sm">
      {/* Status Message */}
      <div className="flex items-center">
        {itemCount === 0 ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
            <span className="text-pink-100 font-medium">All caught up! 🎉</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 text-yellow-300 mr-2" />
            <span className="text-pink-100 font-medium">
              {itemCount} {itemCount === 1 ? 'thing needs' : 'things need'} your attention
            </span>
          </>
        )}
      </div>

      {/* Last Visit */}
      {lastVisit && (
        <span className="text-pink-200 text-xs">
          Last visit: {formatLastVisit(lastVisit)}
        </span>
      )}
    </div>
  );
};

export default StatusLine;

