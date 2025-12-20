import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, X, Clock, Package, TrendingUp, Building2, MessageSquare, Moon, Sun, UserCheck, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, User, Phone, Database, Smartphone, Film, DollarSign, Calendar, Bell } from 'lucide-react';
import { UserCog, Layers } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCustomRequests } from '../../hooks/useCustomRequests';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { useThreads } from '../../hooks/useThreads';
import { useChatterAssignments } from '../../hooks/useChatterAssignments';
import { useClients } from '../../hooks/useClients';
import { useNotifications } from '../../hooks/useNotifications';

interface SidebarNavProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onToggleCollapse: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({ isOpen, isCollapsed, onToggle, onToggleCollapse }) => {
  const location = useLocation();
  const { teamMember } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const { customRequests } = useCustomRequests();
  const { teamMembers } = useTeamMembers();
  const { getUnreadCount } = useThreads();
  const { assignments } = useChatterAssignments();
  const { clients } = useClients();
  const { unreadCount: notificationsUnreadCount } = useNotifications();
  const [isMyClientsExpanded, setIsMyClientsExpanded] = useState(true);
  const [isAllClientsExpanded, setIsAllClientsExpanded] = useState(false);
  const [isCustomsExpanded, setIsCustomsExpanded] = useState(
    location.pathname === '/pending-approval' || 
    location.pathname === '/pending-completion' || 
    location.pathname === '/pending-delivery' || 
    location.pathname === '/customs' ||
    location.pathname === '/calls'
  );
  const [isClientManagementExpanded, setIsClientManagementExpanded] = useState(
    location.pathname === '/clients' || 
    location.pathname === '/client-data' || 
    location.pathname === '/platform-assignments'
  );
  const [isScenesExpanded, setIsScenesExpanded] = useState(
    location.pathname === '/scene-library' || 
    location.pathname === '/scene-assignments'
  );
  const [isCommunicationsExpanded, setIsCommunicationsExpanded] = useState(
    location.pathname === '/chats' || 
    location.pathname === '/sms-messaging'
  );
  const [isTeamManagementExpanded, setIsTeamManagementExpanded] = useState(
    location.pathname === '/attendance' || 
    location.pathname === '/assignments' || 
    location.pathname === '/user-approvals'
  );
  const [isSalesManagementExpanded, setIsSalesManagementExpanded] = useState(
    location.pathname.startsWith('/sales-management') || location.pathname === '/payroll'
  );
  
  // Ref for the scrollable nav container
  const navRef = useRef<HTMLElement>(null);
  
  // Check if user has manager or admin role
  const hasManagerAccess = teamMember?.role === 'manager' || teamMember?.role === 'admin';
  const hasAdminAccess = teamMember?.role === 'admin';
  const isChatter = teamMember?.role === 'chatter';
  
  // Save scroll position when scrolling
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;
    
    const handleScroll = () => {
      sessionStorage.setItem('sidebarScrollPosition', navElement.scrollTop.toString());
    };
    
    navElement.addEventListener('scroll', handleScroll);
    return () => navElement.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Restore scroll position after navigation
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;
    
    // Use requestAnimationFrame to ensure DOM is ready
    const restoreScroll = () => {
      const savedPosition = sessionStorage.getItem('sidebarScrollPosition');
      if (savedPosition) {
        navElement.scrollTop = parseInt(savedPosition, 10);
      }
    };
    
    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(restoreScroll);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [location.pathname]);
  
  // Keep sections expanded when on their respective pages
  React.useEffect(() => {
    if (location.pathname.startsWith('/sales-management') || location.pathname === '/payroll') {
      setIsSalesManagementExpanded(true);
    }
    if (location.pathname === '/chats' || location.pathname === '/sms-messaging') {
      setIsCommunicationsExpanded(true);
    }
    if (location.pathname === '/clients' || location.pathname === '/client-data' || location.pathname === '/platform-assignments') {
      setIsClientManagementExpanded(true);
    }
    if (location.pathname === '/scene-library' || location.pathname === '/scene-assignments') {
      setIsScenesExpanded(true);
    }
    if (location.pathname === '/pending-approval' || location.pathname === '/pending-completion' || location.pathname === '/pending-delivery' || location.pathname === '/customs' || location.pathname === '/calls') {
      setIsCustomsExpanded(true);
    }
    if (location.pathname === '/attendance' || location.pathname === '/assignments' || location.pathname === '/user-approvals') {
      setIsTeamManagementExpanded(true);
    }
  }, [location.pathname]);
  
  // Memoize counts to prevent flickering during re-renders
  const pendingCount = useMemo(() => 
    customRequests.filter(c => c.status === 'pending').length,
    [customRequests]
  );
  
  const inProgressCount = useMemo(() => 
    customRequests.filter(c => c.status === 'in_progress').length,
    [customRequests]
  );
  
  const deliveryCount = useMemo(() => 
    customRequests.filter(c => c.status === 'completed').length,
    [customRequests]
  );
  
  const pendingUserApprovalsCount = useMemo(() => 
    teamMembers.filter(m => m.role === 'pending').length,
    [teamMembers]
  );
  
  const unreadMessagesCount = useMemo(() => 
    hasAdminAccess ? getUnreadCount() : 0,
    [hasAdminAccess, getUnreadCount]
  );
  
  // Memoize assigned clients for chatter to prevent flickering
  const myAssignedClients = useMemo(() => {
    if (!isChatter || !teamMember) return [];
    return assignments
      .filter(a => a.chatter_id === teamMember.id && a.is_active)
      .map(a => a.client)
      .filter(Boolean);
  }, [isChatter, teamMember, assignments]);
  
  // Memoize all clients for admins/managers to prevent flickering
  const allClients = useMemo(() => {
    return hasManagerAccess ? clients.filter(c => c.username) : [];
  }, [hasManagerAccess, clients]);
  
  // Memoize navigation items to prevent recreation on every render
  const navigationItems = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard',
      count: null
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: Bell,
      current: location.pathname === '/notifications',
      count: notificationsUnreadCount
    },
    // Chatter-specific items
    {
      name: 'My Customs',
      href: '/my-customs',
      icon: FileText,
      current: location.pathname === '/my-customs',
      count: null,
      chatterOnly: true
    },
    {
      name: 'Sales Tracker',
      href: '/sales-tracker',
      icon: DollarSign,
      current: location.pathname === '/sales-tracker',
      count: null,
      chatterOnly: true
    }
  ], [
    location.pathname,
    notificationsUnreadCount
  ]);

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
      <div className={`fixed inset-y-0 left-0 z-30 ${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } dark:bg-gray-900 dark:border-gray-700 overflow-hidden`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 ${isCollapsed ? 'px-2' : 'px-6'} border-b border-gray-200 dark:border-gray-700 transition-all duration-300`}>
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="ml-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customs</h2>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={onToggle}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5 dark:text-gray-300" />
            </button>
          )}
        </div>
        
        {/* Collapse Toggle Button - Desktop Only */}
        <div className="hidden lg:block">
          <button
            onClick={onToggleCollapse}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-end px-4'} py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 transition-colors border-b border-gray-200 dark:border-gray-700`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4 mr-2" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
        
        <nav ref={navRef} className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-6 overflow-y-auto transition-all duration-300`}>
          <ul className="space-y-2">
            {/* Dashboard - Always visible */}
            {navigationItems.filter(item => !item.chatterOnly || isChatter).map((item) => {
              const Icon = item.icon as any;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium rounded-lg transition-colors group relative ${
                      item.current
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-500'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                    title={isCollapsed ? item.name : undefined}
                    onClick={() => {
                      if (window.innerWidth < 1024) {
                        onToggle();
                      }
                    }}
                  >
                    <Icon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                      item.current ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                    }`} />
                    {!isCollapsed && <span className="flex-1 whitespace-nowrap overflow-hidden">{item.name}</span>}
                    {item.count !== null && item.count > 0 && (
                      <span className={`${isCollapsed ? 'absolute -top-1 -right-1 w-5 h-5' : 'ml-2 px-2 py-1'} inline-flex items-center justify-center text-xs font-bold leading-none rounded-full ${
                        item.current 
                          ? 'bg-blue-600 text-white dark:bg-blue-600' 
                          : 'bg-orange-500 text-white dark:bg-orange-600'
                      }`}>
                        {item.count}
                      </span>
                    )}
                    
                    {/* Tooltip for collapsed state */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {item.name}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
            
            {/* My Clients Collapsible Section - Only for Chatters */}
            {isChatter && !isCollapsed && myAssignedClients.length > 0 && (
              <li className="pt-2">
                <button
                  onClick={() => setIsMyClientsExpanded(!isMyClientsExpanded)}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Users className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1 text-left">My Clients</span>
                  {isMyClientsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {/* Nested Client List */}
                {isMyClientsExpanded && (
                  <ul className="mt-2 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {myAssignedClients.map((client: any) => {
                      const isClientActive = location.pathname === `/client-profile/${client.id}`;
                      return (
                        <li key={client.id}>
                          <Link
                            to={`/client-profile/${client.id}`}
                            className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                              isClientActive
                                ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                            }`}
                            onClick={() => {
                              if (window.innerWidth < 1024) {
                                onToggle();
                              }
                            }}
                          >
                            {client.avatar_url ? (
                              <img 
                                src={client.avatar_url} 
                                alt={client.username}
                                className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
                              />
                            ) : (
                              <User className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                            )}
                            <span className="truncate">@{client.username}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            )}
            
            {/* Communications - Manager+ Only */}
            {hasManagerAccess && !isCollapsed && (
              <li className="pt-2">
                <button
                  onClick={() => setIsCommunicationsExpanded(!isCommunicationsExpanded)}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <MessageSquare className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1 text-left">Communications</span>
                  {isCommunicationsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {/* Nested Communications Menu */}
                {isCommunicationsExpanded && (
                  <ul className="mt-2 mb-2 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {hasAdminAccess && (
                      <li>
                        <Link
                          to="/chats"
                          className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                            location.pathname === '/chats'
                              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                          }`}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              onToggle();
                            }
                          }}
                        >
                          <MessageSquare className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                          <span className="flex-1 truncate">Chats</span>
                          {unreadMessagesCount > 0 && (
                            <span className="ml-2 px-2 py-1 inline-flex items-center justify-center text-xs font-bold leading-none rounded-full bg-orange-500 text-white dark:bg-orange-600">
                              {unreadMessagesCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    )}
                    {hasAdminAccess && (
                      <li>
                        <Link
                          to="/sms-messaging"
                          className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                            location.pathname === '/sms-messaging'
                              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                          }`}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              onToggle();
                            }
                          }}
                        >
                          <Smartphone className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                          <span className="flex-1 truncate">SMS Messaging</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}
            
            {/* Client Management - Manager+ Only */}
            {hasManagerAccess && !isCollapsed && (
              <li className="pt-2">
                <button
                  onClick={() => setIsClientManagementExpanded(!isClientManagementExpanded)}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Users className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1 text-left">Client Management</span>
                  {isClientManagementExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {/* Nested Client Management Menu */}
                {isClientManagementExpanded && (
                  <ul className="mt-2 mb-2 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                    {/* All Clients Expandable */}
                    <li>
                      <button
                        onClick={() => setIsAllClientsExpanded(!isAllClientsExpanded)}
                        className="flex items-center w-full pl-4 pr-3 py-2 text-sm rounded-lg transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                      >
                        <Users className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 text-left">All Clients</span>
                        {isAllClientsExpanded ? (
                          <ChevronUp className="h-3 w-3 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-gray-400" />
                        )}
                      </button>
                      
                      {/* Nested Client List */}
                      {isAllClientsExpanded && (
                        <ul className="mt-1 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                          {allClients.length > 0 ? (
                            allClients
                              .sort((a, b) => a.username.localeCompare(b.username))
                              .map((client: any) => {
                                const isClientActive = location.pathname === `/client-profile/${client.id}`;
                                return (
                                  <li key={client.id}>
                                    <Link
                                      to={`/client-profile/${client.id}`}
                                      className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                                        isClientActive
                                          ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                                      }`}
                                      onClick={() => {
                                        if (window.innerWidth < 1024) {
                                          onToggle();
                                        }
                                      }}
                                    >
                                      {client.avatar_url ? (
                                        <img 
                                          src={client.avatar_url} 
                                          alt={client.username}
                                          className="w-5 h-5 rounded-full mr-2 flex-shrink-0"
                                        />
                                      ) : (
                                        <User className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                                      )}
                                      <span className="truncate">@{client.username}</span>
                                    </Link>
                                  </li>
                                );
                              })
                          ) : (
                            <li className="pl-4 pr-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                              No clients yet
                            </li>
                          )}
                        </ul>
                      )}
                    </li>
                    
                    <li>
                      <Link
                        to="/clients"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/clients'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Users className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Clients List</span>
                      </Link>
                    </li>
                    {hasAdminAccess && (
                      <li>
                        <Link
                          to="/client-data"
                          className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                            location.pathname === '/client-data'
                              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                          }`}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              onToggle();
                            }
                          }}
                        >
                          <Database className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                          <span className="flex-1 truncate">Client Data</span>
                        </Link>
                      </li>
                    )}
                    <li>
                      <Link
                        to="/platform-assignments"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/platform-assignments'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Layers className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Platform Overview</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}
            
            {/* Content & Scenes - Admin Only */}
            {hasAdminAccess && !isCollapsed && (
              <li className="pt-2">
                <button
                  onClick={() => setIsScenesExpanded(!isScenesExpanded)}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <Film className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1 text-left">Content & Scenes</span>
                  {isScenesExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {/* Nested Scenes Menu */}
                {isScenesExpanded && (
                  <ul className="mt-2 mb-2 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <li>
                      <Link
                        to="/scene-library"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/scene-library'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Film className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Scene Library</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/scene-assignments"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/scene-assignments'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Layers className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Scene Assignments</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}
            
            {/* Sales Management - Manager+ Only */}
            {hasManagerAccess && !isCollapsed && (
              <li className="pt-2">
                <button
                  onClick={() => setIsSalesManagementExpanded(!isSalesManagementExpanded)}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <DollarSign className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1 text-left">Sales Management</span>
                  {isSalesManagementExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {/* Nested Sales Management Menu */}
                {isSalesManagementExpanded && (
                  <ul className="mt-2 mb-2 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <li>
                      <Link
                        to="/sales-management"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/sales-management'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <LayoutDashboard className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Overview</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/sales-management/pending"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/sales-management/pending'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Clock className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Pending Approvals</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/sales-management/all-sales"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/sales-management/all-sales'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Calendar className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">All Sales</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/sales-management/performance"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/sales-management/performance'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <TrendingUp className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Chatter Performance</span>
                      </Link>
                    </li>
                    {hasAdminAccess && (
                      <li>
                        <Link
                          to="/payroll"
                          className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                            location.pathname === '/payroll'
                              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                          }`}
                          onClick={() => {
                            if (window.innerWidth < 1024) {
                              onToggle();
                            }
                          }}
                        >
                          <DollarSign className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                          <span className="flex-1 truncate">Payroll Sheet</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}
            
            {/* Customs Management - Manager+ Only */}
            {hasManagerAccess && !isCollapsed && (
              <li className="pt-2">
                <button
                  onClick={() => setIsCustomsExpanded(!isCustomsExpanded)}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <FileText className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1 text-left">Customs Management</span>
                  {isCustomsExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {/* Nested Customs Menu */}
                {isCustomsExpanded && (
                  <ul className="mt-2 mb-2 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <li>
                      <Link
                        to="/pending-approval"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/pending-approval'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Clock className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Pending Approval</span>
                        {pendingCount > 0 && (
                          <span className="ml-2 px-2 py-1 inline-flex items-center justify-center text-xs font-bold leading-none rounded-full bg-orange-500 text-white dark:bg-orange-600">
                            {pendingCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/pending-completion"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/pending-completion'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <TrendingUp className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Pending Completion</span>
                        {inProgressCount > 0 && (
                          <span className="ml-2 px-2 py-1 inline-flex items-center justify-center text-xs font-bold leading-none rounded-full bg-orange-500 text-white dark:bg-orange-600">
                            {inProgressCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/pending-delivery"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/pending-delivery'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Package className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Pending Delivery</span>
                        {deliveryCount > 0 && (
                          <span className="ml-2 px-2 py-1 inline-flex items-center justify-center text-xs font-bold leading-none rounded-full bg-orange-500 text-white dark:bg-orange-600">
                            {deliveryCount}
                          </span>
                        )}
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/customs"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/customs'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <FileText className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">All Customs</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/calls"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/calls'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Phone className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Calls</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}
            
            {/* Team Management - Manager+ Only */}
            {hasManagerAccess && !isCollapsed && (
              <li className="pt-2">
                <button
                  onClick={() => setIsTeamManagementExpanded(!isTeamManagementExpanded)}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  <UserCog className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 dark:text-gray-500" />
                  <span className="flex-1 text-left">Team Management</span>
                  {isTeamManagementExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </button>
                
                {/* Nested Team Management Menu */}
                {isTeamManagementExpanded && (
                  <ul className="mt-2 mb-2 space-y-1 ml-4 border-l-2 border-gray-200 dark:border-gray-700">
                    <li>
                      <Link
                        to="/attendance"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/attendance'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <UserCheck className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Attendance</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/assignments"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/assignments'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <UserCog className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">Assignments</span>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/user-approvals"
                        className={`flex items-center pl-4 pr-3 py-2 text-sm rounded-lg transition-colors group ${
                          location.pathname === '/user-approvals'
                            ? 'bg-blue-50 text-blue-700 font-medium dark:bg-gray-800 dark:text-blue-400'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                        }`}
                        onClick={() => {
                          if (window.innerWidth < 1024) {
                            onToggle();
                          }
                        }}
                      >
                        <Clock className="w-5 h-5 mr-2 flex-shrink-0 text-gray-400" />
                        <span className="flex-1 truncate">User Approvals</span>
                        {pendingUserApprovalsCount > 0 && (
                          <span className="ml-2 px-2 py-1 inline-flex items-center justify-center text-xs font-bold leading-none rounded-full bg-orange-500 text-white dark:bg-orange-600">
                            {pendingUserApprovalsCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}
            
            {/* Agencies - Manager+ Only */}
            {hasManagerAccess && (
              <li className="pt-2">
                <Link
                  to="/agencies"
                  className={`flex items-center ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium rounded-lg transition-colors group relative ${
                    location.pathname === '/agencies'
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-500'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                  title={isCollapsed ? 'Agencies' : undefined}
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                >
                  <Building2 className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 ${
                    location.pathname === '/agencies' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  {!isCollapsed && <span className="flex-1 whitespace-nowrap overflow-hidden">Agencies</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      Agencies
                    </div>
                  )}
                </Link>
              </li>
            )}
          </ul>
        </nav>
        
        {/* Sidebar Footer - Dark Mode Toggle */}
        <div className={`${isCollapsed ? 'px-2' : 'px-4'} py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-all duration-300`}>
          <button
            onClick={toggleDarkMode}
            className={`flex items-center w-full ${isCollapsed ? 'justify-center px-2' : 'px-3'} py-2 text-sm font-medium rounded-lg transition-colors text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 group relative`}
            title={isCollapsed ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : undefined}
          >
            {isDarkMode ? (
              <Sun className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 text-gray-400 dark:text-yellow-400`} />
            ) : (
              <Moon className={`${isCollapsed ? '' : 'mr-3'} h-5 w-5 flex-shrink-0 text-gray-400`} />
            )}
            {!isCollapsed && <span className="flex-1 whitespace-nowrap overflow-hidden">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </div>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default SidebarNav;