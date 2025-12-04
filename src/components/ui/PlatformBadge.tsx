import React from 'react';

interface PlatformBadgeProps {
  platform: {
    name: string;
    color: string;
    icon?: string | null;
  };
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const PlatformBadge: React.FC<PlatformBadgeProps> = ({ 
  platform, 
  size = 'md', 
  showIcon = true 
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  return (
    <span 
      className={`inline-flex items-center rounded-full font-medium text-white ${sizeClasses[size]}`}
      style={{ backgroundColor: platform.color }}
    >
      {showIcon && platform.icon && (
        <span className={`mr-1 ${iconSizes[size]}`}>
          {platform.icon}
        </span>
      )}
      {platform.name}
    </span>
  );
};

export default PlatformBadge;