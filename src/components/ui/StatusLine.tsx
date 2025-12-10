import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface StatusLineProps {
  itemCount: number;
}

const StatusLine: React.FC<StatusLineProps> = ({ itemCount }) => {
  return (
    <div className="flex items-center text-sm">
      {/* Status Message */}
      {itemCount === 0 ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-300 mr-2" />
          <span className="text-white font-semibold opacity-95">All caught up! 🎉</span>
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-yellow-300 mr-2" />
          <span className="text-white font-semibold opacity-95">
            {itemCount} {itemCount === 1 ? 'thing needs' : 'things need'} attention
          </span>
        </>
      )}
    </div>
  );
};

export default StatusLine;

