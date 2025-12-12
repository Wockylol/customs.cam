import React from 'react';
import { motion } from 'framer-motion';

interface StaggerContainerProps {
  children: React.ReactNode;
  initialDelay?: number;
  staggerDelay?: number;
  className?: string;
}

/**
 * StaggerContainer - Automatically applies stagger animations to all direct children
 * 
 * Usage:
 * <StaggerContainer>
 *   <div>First item (delay 0.1s)</div>
 *   <div>Second item (delay 0.2s)</div>
 *   <div>Third item (delay 0.3s)</div>
 * </StaggerContainer>
 */
export function StaggerContainer({ 
  children, 
  initialDelay = 0.1,
  staggerDelay = 0.1,
  className = '' 
}: StaggerContainerProps) {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            delay: initialDelay + (index * staggerDelay), 
            duration: 0.3, 
            ease: 'easeInOut' 
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

