import React, { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AgencySidebarNav from './AgencySidebarNav';
import AgencyTopbarHeader from './AgencyTopbarHeader';

interface AgencyLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AgencyLayout: React.FC<AgencyLayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { agencySlug } = useParams<{ agencySlug: string }>();

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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgencyLayout;