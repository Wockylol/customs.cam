import React, { useState } from 'react';
import { ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { PriorityFeedItem } from '../../types/priorityFeed';
import PriorityFeedCard from './PriorityFeedCard';
import PriorityFeedZeroState from './PriorityFeedZeroState';

interface PriorityFeedProps {
  items: PriorityFeedItem[];
  totalEarned?: number;
  onNavigateSettings?: () => void;
  maxVisibleItems?: number;
}

const PriorityFeed: React.FC<PriorityFeedProps> = ({
  items,
  totalEarned = 0,
  onNavigateSettings,
  maxVisibleItems = 5,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Zero state
  if (items.length === 0) {
    return (
      <PriorityFeedZeroState
        totalEarned={totalEarned}
        onNavigateSettings={onNavigateSettings}
      />
    );
  }

  // Determine visible items
  const visibleItems = isExpanded ? items : items.slice(0, maxVisibleItems);
  const hasMore = items.length > maxVisibleItems;
  const hiddenCount = items.length - maxVisibleItems;

  return (
    <div className="space-y-4">
      {/* Priority Items */}
      {visibleItems.map((item, index) => (
        <div
          key={item.id}
          className="stagger-item animate-slide-in-up"
          style={{ animationDelay: `${index * 0.08}s` }}
        >
          <PriorityFeedCard 
            item={item} 
            isPrimary={index === 0} 
          />
        </div>
      ))}

      {/* Show More/Less Button */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            w-full py-4 px-5 rounded-[20px]
            bg-white border border-gray-100
            shadow-md hover:shadow-lg
            flex items-center justify-center gap-2
            text-gray-600 font-semibold text-[14px]
            transition-all duration-300
            hover:bg-gray-50 active:scale-[0.98]
          "
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Show Less</span>
            </>
          ) : (
            <>
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
              <span>View {hiddenCount} More {hiddenCount === 1 ? 'Item' : 'Items'}</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default PriorityFeed;
