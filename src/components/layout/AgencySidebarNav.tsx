import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Menu, X, Building2, BarChart3 } from 'lucide-react';

interface AgencySidebarNavProps {
  isOpen: boolean;
  onToggle: () => void;
  agencySlug: string;
}

const AgencySidebarNav: React.FC<AgencySidebarNavProps> = ({ isOpen, onToggle, agencySlug }) => {
  const location = useLocation();
  
  const navigationItems = [
    {
      name: 'Dashboard',
      href: `/agency/${agencySlug}`,
      icon: LayoutDashboard,
      current: location.pathname === `/agency/${agencySlug}`,
    },
    {
      name: 'Analytics',
      href: `/agency/${agencySlug}/analytics`,
      icon: BarChart3,
      current: location.pathname === `/agency/${agencySlug}/analytics`,
    },
    {
      name: 'Clients',
      href: `/agency/${agencySlug}/clients`,
      icon: Users,
      current: location.pathname === `/agency/${agencySlug}/clients`,
    },
    {
      name: 'All Customs',
      href: `/agency/${agencySlug}/all-customs`,
      icon: FileText,
      current: location.pathname === `/agency/${agencySlug}/all-customs`,
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900">Agency</h2>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      item.current
                        ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${
                      item.current ? 'text-purple-500' : 'text-gray-400'
                    }`} />
                    <span className="flex-1">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
};

export default AgencySidebarNav;