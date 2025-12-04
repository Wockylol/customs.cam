import React, { useEffect, useState } from 'react';
import { Calendar, DollarSign, Clock, CheckCircle, Upload, ThumbsUp, User, Zap, Heart, MessageCircle, FileText } from 'lucide-react';
import { Database } from '../../lib/database.types';
import ClientAvatar from './ClientAvatar';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

interface MobileCustomCardProps {
  custom: CustomRequest;
  onApprove?: () => void;
  onUpload?: () => void;
  onMarkComplete?: () => void;
}

const MobileCustomCard: React.FC<MobileCustomCardProps> = ({ 
  custom, 
  onApprove, 
  onUpload, 
  onMarkComplete 
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  };

  // Swipe hint removed

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '$0';
    return `$${amount.toFixed(0)}`;
  };

  const getStatusColor = () => {
    switch (custom.status) {
      case 'pending_client_approval':
        return 'from-orange-400 to-pink-400';
      case 'in_progress':
        return 'from-blue-400 to-purple-400';
      case 'completed':
        return 'from-purple-400 to-indigo-400';
      case 'delivered':
        return 'from-green-400 to-teal-400';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getStatusText = () => {
    switch (custom.status) {
      case 'pending_client_approval':
        return 'Needs Your Approval';
      case 'in_progress':
        return 'Ready for Upload';
      case 'completed':
        return 'Completed';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Unknown';
    }
  };

  const getStatusIcon = () => {
    switch (custom.status) {
      case 'pending_client_approval':
        return Clock;
      case 'in_progress':
        return Upload;
      case 'completed':
        return CheckCircle;
      case 'delivered':
        return Heart;
      default:
        return Clock;
    }
  };

  const isOverdue = custom.estimated_delivery_date && 
    new Date(custom.estimated_delivery_date) < new Date() && 
    custom.status !== 'delivered';

  const StatusIcon = getStatusIcon();

  const proposed = custom.proposed_amount || 0;
  const paid = custom.amount_paid || 0;
  const remaining = Math.max(0, proposed - paid);
  const progress = proposed > 0 ? Math.min(100, Math.round((paid / proposed) * 100)) : 0;
  const chatUrl: string | null = (custom as any).chat_link || (custom as any).chatLink || (custom as any).chat_url || null;
  const notes: string | null = (custom as any).notes || (custom as any).manager_notes || (custom as any).team_notes || null;

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden min-h-[380px] flex flex-col card-hover-lift">
      {/* Card Header */}
      <div className={`bg-gradient-to-r ${getStatusColor()} p-4 transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center mr-3 p-0.5">
              <ClientAvatar
                client={{ username: (custom as any).clients?.username || 'unknown', avatar_url: null }}
                size="sm"
                className="w-full h-full"
              />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{custom.fan_name}</h3>
              <div className="flex items-center">
                <StatusIcon className="w-4 h-4 text-white mr-1" />
                <span className="text-white text-sm opacity-90">{getStatusText()}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-xl">{formatCurrency(custom.proposed_amount)}</div>
            {paid > 0 && (
              <div className="text-white text-xs opacity-80">${paid.toFixed(0)} paid</div>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Swipe hint removed */}

        {/* Description and Payment */}
        <div className="grid grid-cols-1 gap-4 mb-4">
          <div>
            <p className="text-gray-800 leading-relaxed text-sm whitespace-pre-line">
              {custom.description}
            </p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <div className="flex items-center"><DollarSign className="w-4 h-4 mr-1" />Proposed: <span className="ml-1 font-semibold text-gray-800">{formatCurrency(proposed)}</span></div>
              <div>Paid: <span className="font-semibold text-gray-800">{formatCurrency(paid)}</span></div>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-500 to-teal-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-right text-xs text-gray-600 mt-1">
              Remaining: <span className="font-semibold text-gray-800">{formatCurrency(remaining)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="bg-yellow-50 rounded-xl p-3 mb-4">
            <div className="flex items-start">
              <FileText className="w-4 h-4 text-yellow-700 mr-2 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-yellow-800 mb-1">Notes</div>
                <p className="text-sm text-yellow-900 whitespace-pre-line">{notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Meta and Dates */}
        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />Submitted: {formatDate(custom.date_submitted)}
          </div>
          <div className="flex items-center justify-end text-gray-600">
            <Clock className="w-4 h-4 mr-1" />ETA: {custom.estimated_delivery_date ? formatDate(custom.estimated_delivery_date) : 'TBD'}
          </div>
          {custom.length_duration && (
            <div className="col-span-2 flex items-center justify-between">
              <span className="bg-gray-100 px-2 py-1 rounded-full text-gray-700">Duration: {custom.length_duration}</span>
              {isOverdue && (
                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">Overdue</span>
              )}
            </div>
          )}
          {custom.fan_lifetime_spend && (
            <div className="col-span-2 bg-purple-50 rounded-lg p-3">
              <div className="flex items-center">
                <Zap className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm text-purple-800 font-medium">VIP Fan • ${custom.fan_lifetime_spend.toFixed(0)} lifetime spend</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-2">
          <a
            href={chatUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full inline-flex items-center justify-center border-2 rounded-xl font-semibold text-sm py-3 px-4 transition-all duration-300 transform ${chatUrl ? 'border-purple-300 text-purple-700 hover:bg-purple-50 hover:scale-105 active:scale-95' : 'border-gray-200 text-gray-400 pointer-events-none'}`}
          >
            <MessageCircle className="w-4 h-4 mr-2 transition-transform duration-200" />
            Message
          </a>
          {custom.status === 'pending_client_approval' && (
            <div className="flex space-x-2">
              <button
                onClick={onApprove}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center btn-press"
              >
                <ThumbsUp className="w-4 h-4 mr-2 transition-transform duration-200" />
                Approve
              </button>
              <button className="flex-1 border-2 border-red-300 text-red-600 py-3 px-4 rounded-xl font-semibold text-sm hover:bg-red-50 transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center btn-press">
                <ThumbsUp className="w-4 h-4 mr-2 rotate-180 transition-transform duration-200" />
                Decline
              </button>
            </div>
          )}

          {custom.status === 'in_progress' && (
            <button
              onClick={onUpload}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 px-4 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 flex items-center justify-center btn-press"
            >
              <Upload className="w-4 h-4 mr-2 transition-transform duration-200" />
              Upload Content
            </button>
          )}

          {custom.status === 'completed' && (
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center text-purple-600 mb-1">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-semibold">Ready for Delivery!</span>
              </div>
              <p className="text-xs text-purple-700">Your content is complete and will be delivered soon</p>
            </div>
          )}

          {custom.status === 'delivered' && (
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center text-green-600 mb-1">
                <Heart className="w-5 h-5 mr-2" />
                <span className="font-semibold">Delivered!</span>
              </div>
              <p className="text-xs text-green-700">Content successfully delivered to your fan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileCustomCard;