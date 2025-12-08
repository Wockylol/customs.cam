import React from 'react';
import { X, Bell, AlertCircle, CheckCircle, Info, TrendingUp, Users, FileText } from 'lucide-react';
import { Notification } from '../../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  showActions?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead, 
  onDelete,
  showActions = true 
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.recipient_is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'client_note':
        return <FileText className="w-5 h-5" />;
      case 'custom_request':
        return <Bell className="w-5 h-5" />;
      case 'approval_needed':
        return <AlertCircle className="w-5 h-5" />;
      case 'status_update':
        return <CheckCircle className="w-5 h-5" />;
      case 'assignment':
        return <Users className="w-5 h-5" />;
      case 'sale':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'client_note':
        return 'text-blue-500';
      case 'custom_request':
        return 'text-purple-500';
      case 'approval_needed':
        return 'text-orange-500';
      case 'status_update':
        return 'text-green-500';
      case 'assignment':
        return 'text-indigo-500';
      case 'sale':
        return 'text-emerald-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div
      className={`
        relative p-4 border-b border-gray-200 dark:border-gray-700
        ${!notification.recipient_is_read ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'}
        ${notification.link ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
        transition-colors
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${getIconColor()}`}>
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                !notification.recipient_is_read 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                {formatTime(notification.created_at)}
              </p>
            </div>

            {/* Unread indicator */}
            {!notification.recipient_is_read && (
              <div className="flex-shrink-0 ml-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex-shrink-0 flex items-center space-x-2">
            {!notification.recipient_is_read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(notification.id);
                }}
                className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                title="Mark as read"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              title="Delete"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;

