import React, { useState, useEffect } from 'react';
import { Menu, Building2 } from 'lucide-react';

interface AgencyTopbarHeaderProps {
  title: string;
  onMenuClick: () => void;
}

const AgencyTopbarHeader: React.FC<AgencyTopbarHeaderProps> = ({ title, onMenuClick }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 mr-4"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-medium text-gray-700">
              {formatDateTime()}
            </span>
            <span className="text-xs text-gray-500">
              EST/EDT
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
              <Building2 className="w-4 h-4 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block">
              Agency Dashboard
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AgencyTopbarHeader;