import React from 'react';
import { motion } from 'framer-motion';

interface StaggeredItemProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function StaggeredItem({ children, delay = 0, className = '' }: StaggeredItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeInOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

