import React, { useState, useEffect } from 'react';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface TopbarHeaderProps {
  title: string;
  onMenuClick: () => void;
}

const TopbarHeader: React.FC<TopbarHeaderProps> = ({ title, onMenuClick }) => {
  const { teamMember, signOut } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  // Format date and time in EST/EDT
  const formatDateTime = () => {
    const estTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(currentTime);

    return estTime;
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 mr-4"
          >
            <Menu className="w-5 h-5 dark:text-gray-300" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatDateTime()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              EST/EDT
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-800">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block dark:text-gray-300">
              {teamMember?.full_name || 'Team Member'}
            </span>
            <span className="text-xs text-gray-500 hidden md:block capitalize dark:text-gray-400">
              {teamMember?.role}
            </span>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopbarHeader;