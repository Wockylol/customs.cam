import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
          className="w-full bg-white rounded-xl shadow-md hover:shadow-lg py-3 px-4 flex items-center justify-center text-gray-700 font-medium text-sm transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Show {hiddenCount} More {hiddenCount === 1 ? 'Item' : 'Items'}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default PriorityFeed;

