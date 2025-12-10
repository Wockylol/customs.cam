import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import SidebarNav from './SidebarNav';
import TopbarHeader from './TopbarHeader';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const { isDarkMode } = useTheme();
  
  // Don't show sidebar for public client pages
  const isPublicPage = !location.pathname.startsWith('/dashboard') && 
                      !location.pathname.startsWith('/clients') && 
                      !location.pathname.startsWith('/client-profile') &&
                      !location.pathname.startsWith('/client-data') &&
                      !location.pathname.startsWith('/agencies') &&
                      !location.pathname.startsWith('/customs') &&
                      !location.pathname.startsWith('/my-customs') &&
                      !location.pathname.startsWith('/sales-tracker') &&
                      !location.pathname.startsWith('/sales-management') &&
                      !location.pathname.startsWith('/payroll') &&
                      !location.pathname.startsWith('/pending-approval') &&
                      !location.pathname.startsWith('/pending-completion') &&
                      !location.pathname.startsWith('/pending-delivery') &&
                      !location.pathname.startsWith('/platform-assignments') &&
                      !location.pathname.startsWith('/user-approvals') &&
                      !location.pathname.startsWith('/attendance') &&
                      !location.pathname.startsWith('/assignments') &&
                      !location.pathname.startsWith('/chats') &&
                      !location.pathname.startsWith('/sms-messaging') &&
                      !location.pathname.startsWith('/scene-library') &&
                      !location.pathname.startsWith('/scene-assignments') &&
                      !location.pathname.startsWith('/notifications') &&
                      !location.pathname.startsWith('/calls');

  if (isPublicPage) {
    return (
      <div className="h-screen bg-gray-50 flex flex-col dark:bg-gray-950">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0 dark:bg-gray-900 dark:border-gray-800">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        </div>
        <main className="flex-1 py-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex dark:bg-gray-950">
      <SidebarNav 
        isOpen={sidebarOpen} 
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarOpen(!sidebarOpen)} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopbarHeader 
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

export default Layout;