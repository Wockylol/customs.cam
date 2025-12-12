import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import AgencySidebarNav from './AgencySidebarNav';
import AgencyTopbarHeader from './AgencyTopbarHeader';

interface AgencyLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AgencyLayout: React.FC<AgencyLayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { agencySlug } = useParams<{ agencySlug: string }>();
  const location = useLocation();

  return (
    <div className="h-screen bg-gray-50 flex">
      <AgencySidebarNav 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        agencySlug={agencySlug || ''}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <AgencyTopbarHeader 
          title={title} 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)} 
        />
        
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AgencyLayout;