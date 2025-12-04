import React from 'react';

interface StatusBadgeProps {
  status: 'pending_team_approval' | 'pending_client_approval' | 'in_progress' | 'completed' | 'delivered' | 'cancelled';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'pending_team_approval':
        return 'bg-orange-100 text-orange-800';
      case 'pending_client_approval':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending_team_approval':
        return 'Pending Team Approval';
      case 'pending_client_approval':
        return 'Pending Client Approval';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {getStatusText()}
    </span>
  );
};

export default StatusBadge;