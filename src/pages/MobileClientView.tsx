import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Loader2, 
  AlertCircle, 
  Star, 
  Clock, 
  Upload, 
  User,
  Home,import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Loader2, 
  AlertCircle, 
  Star, 
  User,
  Home,
  Settings,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useClients } from '../hooks/useClients';
import { useClientPreferences } from '../hooks/useClientPreferences';
import { useContentScenes } from '../hooks/useContentScenes';
import { Database } from '../lib/database.types';
import MobileCustomCard from '../components/ui/MobileCustomCard';
import MobileApprovalModal from '../components/modals/MobileApprovalModal';
import MobileUploadModal from '../components/modals/MobileUploadModal';
import MobileSettingsView from '../components/ui/MobileSettingsView';
import MobilePinLock from '../components/auth/MobilePinLock';
import MobileSceneCard from '../components/ui/MobileSceneCard';
import SceneUploadModal from '../components/modals/SceneUploadModal';
import PriorityFeed from '../components/ui/PriorityFeed';
import StatusLine from '../components/ui/StatusLine';
import { priorityEngine } from '../lib/priorityEngine';
import { useClientNotifications } from '../hooks/useClientNotifications';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

const MobileClientView: React.FC = () => {
  const { clientUsername } = useParams<{ clientUsername: string }>();
  const [selectedCustom, setSelectedCustom] = useState<CustomRequest | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Scene state
  const [clientSceneAssignments, setClientSceneAssignments] = useState<any[]>([]);
  const [selectedSceneAssignment, setSelectedSceneAssignment] = useState<any>(null);
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [isSceneUploadModalOpen, setIsSceneUploadModalOpen] = useState(false);
  const [scenesLoading, setScenesLoading] = useState(false);
  const [lastVisit, setLastVisit] = useState<Date | null>(null);
  
  const { customRequests, loading: customsLoading, error: customsError, approveByClient, markAsCompleted } = useCustomRequests();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { fetchClientScenes, markSceneComplete } = useContentScenes();
  
  const client = clients.find((c: Client) => c.username.toLowerCase() === clientUsername?.toLowerCase());
  const { preferences, loading: preferencesLoading, savePreferences } = useClientPreferences(client?.id);
  
  // Client-side notifications
  useClientNotifications(client?.id, client?.username);
  const allClientCustoms: CustomRequest[] = customRequests.filter((c: CustomRequest) => 
    (c as any).clients?.username?.toLowerCase() === clientUsername?.toLowerCase() &&
    c.status !== 'pending'
  );

  // Calculate metrics
  const totalEarned = allClientCustoms.reduce((sum, custom) => sum + (custom.amount_paid || 0), 0);
  const pendingEarnings = allClientCustoms
    .filter(c => (c as any).status !== 'delivered' && (c as any).status !== 'cancelled')
    .reduce((sum, custom) => {
      const proposed = custom.proposed_amount || 0;
      const paid = custom.amount_paid || 0;
      return sum + Math.max(0, proposed - paid);
    }, 0);

  // Note: The database status field uses 'pending', 'in_progress', 'completed', 'cancelled'
  // but the application may have custom logic that adds 'pending_client_approval' and 'delivered'
  const pendingApproval = allClientCustoms.filter(c => {
    const status = (c as any).status;
    return status === 'pending' || status === 'pending_client_approval';
  });
  const needsUpload = allClientCustoms.filter(c => c.status === 'in_progress');
  const completedCustoms = allClientCustoms.filter(c => {
    const status = (c as any).status;
    return status === 'completed' || status === 'delivered';
  });

  // Scene metrics
  const pendingScenes = clientSceneAssignments.filter(a => a.status === 'pending');
  const completedScenes = clientSceneAssignments.filter(a => a.status === 'completed');

  // Load client scene assignments
  useEffect(() => {
    const loadSceneAssignments = async () => {
      if (client?.id) {
        setScenesLoading(true);
        const { data } = await fetchClientScenes(client.id);
        setClientSceneAssignments(data || []);
        setScenesLoading(false);
      }
    };
    loadSceneAssignments();
  }, [client?.id]);

  // Track last visit
  useEffect(() => {
    if (client?.id) {
      const lastVisitKey = `lastVisit_${client.id}`;
      const storedLastVisit = localStorage.getItem(lastVisitKey);
      
      if (storedLastVisit) {
        setLastVisit(new Date(storedLastVisit));
      }
      
      // Update last visit
      localStorage.setItem(lastVisitKey, new Date().toISOString());
    }
  }, [client?.id]);

  // Filter customs based on active filter
  const getFilteredCustoms = () => {
    switch (activeFilter) {
      case 'pending_approval':
        return pendingApproval;
      case 'needs_upload':
        return needsUpload;
      case 'settings':
        return [];
      case 'content_scenes':
        return [];
      case 'work':
        // Show all pending work (approvals + uploads)
        return [...pendingApproval, ...needsUpload];
      case 'done':
        return completedCustoms;
      default:
        return allClientCustoms.filter(c => (c as any).status !== 'delivered');
    }
  };

  const filteredCustoms = getFilteredCustoms();

  const loading = customsLoading || clientsLoading || preferencesLoading || scenesLoading;
  const error = customsError || clientsError;

  const handleApprovalClick = (custom: CustomRequest) => {
    setSelectedCustom(custom);
    setIsApprovalModalOpen(true);
  };

  const handleUploadClick = (custom: CustomRequest) => {
    setSelectedCustom(custom);
    setIsUploadModalOpen(true);
  };

  const handleApprove = async (customId: string, estimatedDeliveryDate: string) => {
    const { error } = await approveByClient(customId, estimatedDeliveryDate);
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    return { error };
  };

  const handleMarkComplete = async (customId: string) => {
    const { error } = await markAsCompleted(customId);
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    return { error };
  };

  const handleSavePreferences = async (preferencesData: any) => {
    if (!client) return { error: 'Client not found' };
    
    const { error } = await savePreferences(client.id, preferencesData);
    return { error };
  };

  const handleSceneUploadClick = (assignment: any, scene: any, stepIndex: number) => {
    setSelectedSceneAssignment(assignment);
    setSelectedScene(scene);
    setSelectedStepIndex(stepIndex);
    setIsSceneUploadModalOpen(true);
  };

  const handleMarkSceneComplete = async (assignmentId: string) => {
    const { error } = await markSceneComplete(assignmentId);
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      // Reload scene assignments
      if (client?.id) {
        const { data } = await fetchClientScenes(client.id);
        setClientSceneAssignments(data || []);
      }
    }
    return { error };
  };

  // Generate priority feed items
  const priorityFeedItems = priorityEngine.processFeed(
    allClientCustoms,
    clientSceneAssignments,
    {
      onCustomAction: (custom) => {
        const status = (custom as any).status;
        if (status === 'pending' || status === 'pending_client_approval') {
          handleApprovalClick(custom);
        } else if (custom.status === 'in_progress') {
          handleUploadClick(custom);
        }
      },
      onSceneAction: () => {
        setActiveFilter('content_scenes');
      }
    }
  );

  // Calculate total actionable items for badge
  const totalActionableItems = pendingApproval.length + needsUpload.length + pendingScenes.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Oops! Something went wrong</h2>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Creator not found</h2>
          <p className="text-gray-600">We couldn't find this creator's dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <MobilePinLock clientId={client.id} clientUsername={clientUsername || ''}>
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-20 animate-pulse"></div>
        </div>
      )}

      {/* Header Section */}
      <div className="relative overflow-hidden ios-hero safe-area-pt">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500"></div>
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className={`relative px-4 transition-all duration-500 ease-in-out ${
          activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
            ? 'pt-4 pb-2'
            : 'pt-12 pb-8'
        }`}>
          <div className="flex items-center mb-6">
            <div className={`bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center mr-4 transition-all duration-500 ease-in-out overflow-hidden ${
              activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
                ? 'w-12 h-12'
                : 'w-16 h-16'
            }`}>
              {client.avatar_url ? (
                <img
                  src={client.avatar_url}
                  alt={`@${client.username}`}
                  className="w-full h-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    // Fallback to star icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const star = document.createElement('div');
                      star.innerHTML = `<svg class="w-${activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' ? '6' : '8'} h-${activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' ? '6' : '8'} text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
                      parent.appendChild(star);
                    }
                  }}
                />
              ) : (
                <Star className={`text-white transition-all duration-500 ease-in-out ${
                  activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
                    ? 'w-6 h-6'
                    : 'w-8 h-8'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <h1 className={`font-bold text-white mb-1 transition-all duration-500 ease-in-out ${
                activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes' || activeFilter === 'done'
                  ? 'text-xl'
                  : 'text-2xl'
              }`}>
                {activeFilter === 'pending_approval' ? 'Pending Requests' :
                 activeFilter === 'needs_upload' ? 'Ready to Upload' :
                 activeFilter === 'settings' ? 'Settings' :
                 activeFilter === 'content_scenes' ? 'Content Scenes' :
                 activeFilter === 'done' ? 'Completed Work' :
                 `Hey @${client.username}! 👋`}
              </h1>
              {activeFilter === 'all' ? (
                <StatusLine itemCount={totalActionableItems} lastVisit={lastVisit} />
              ) : (
                <p className={`text-pink-100 text-sm transition-all duration-500 ease-in-out ${
                  activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes' || activeFilter === 'done'
                    ? 'opacity-100'
                    : 'opacity-90'
                }`}>
                  {activeFilter === 'pending_approval' ? `${pendingApproval.length} request${pendingApproval.length !== 1 ? 's' : ''} need${pendingApproval.length === 1 ? 's' : ''} your approval` :
                   activeFilter === 'needs_upload' ? `${needsUpload.length} custom${needsUpload.length !== 1 ? 's' : ''} ready for content` :
                   activeFilter === 'settings' ? 'Manage your preferences and pricing' :
                 activeFilter === 'content_scenes' ? `${clientSceneAssignments.length} scene${clientSceneAssignments.length !== 1 ? 's' : ''} assigned to you` :
                 activeFilter === 'done' ? `${completedScenes.length + completedCustoms.length} completed items` :
                   `You've got ${pendingApproval.length + needsUpload.length} customs waiting`}
                </p>
              )}
            </div>
          </div>

          {/* Segmented control removed per request */}

          {/* Earnings Pills */}
          {activeFilter === 'all' && (
            <div className="flex space-x-3 mb-6">
              <div className="stagger-item ios-pill px-4 py-2 flex-1 hover:scale-105 transition-transform duration-200" style={{ animationDelay: '0.1s' }}>
                <div className="text-center">
                  <div className="text-gray-900 font-extrabold text-lg transition-all duration-300">${totalEarned.toFixed(0)}</div>
                  <div className="text-gray-500 text-xs font-medium">Total Earned</div>
                </div>
              </div>
              <div className="stagger-item ios-pill px-4 py-2 flex-1 hover:scale-105 transition-transform duration-200" style={{ animationDelay: '0.15s' }}>
                <div className="text-center">
                  <div className="text-gray-900 font-extrabold text-lg transition-all duration-300">${pendingEarnings.toFixed(0)}</div>
                  <div className="text-gray-500 text-xs font-medium">Pending</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Priority Feed - Replaces Quick Action Tiles */}
      {activeFilter === 'all' && (
        <div className="px-4 -mt-4 mb-6">
          <PriorityFeed 
            items={priorityFeedItems}
            totalEarned={totalEarned}
            onNavigateSettings={() => setActiveFilter('settings')}
            onNavigateCompleted={() => setActiveFilter('done')}
          />
        </div>
      )}

      {/* Active Filter Indicator */}

      {/* Requests Feed */}
      <div className={`px-4 pb-24 transition-all duration-300 ${activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes' || activeFilter === 'work' || activeFilter === 'done' ? 'mt-4' : ''}`}>
        <div className="page-transition-enter" key={activeFilter}>
        {activeFilter === 'settings' ? (
          <div className="animate-fade-in-scale">
            <MobileSettingsView 
              client={client}
              preferences={preferences}
              onSave={handleSavePreferences}
            />
          </div>
        ) : activeFilter === 'content_scenes' ? (
          clientSceneAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-bounce-in">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No content scenes yet! 📹
              </h3>
              <p className="text-gray-600 text-sm">
                Your team will assign content scenes for you to work on. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {clientSceneAssignments.map((assignment, index) => (
                <div key={assignment.id} className="stagger-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <MobileSceneCard
                    assignment={assignment}
                    scene={assignment.content_scenes}
                    onUploadClick={(stepIndex) => handleSceneUploadClick(assignment, assignment.content_scenes, stepIndex)}
                    onMarkComplete={() => handleMarkSceneComplete(assignment.id)}
                  />
                </div>
              ))}
            </div>
          )
        ) : activeFilter === 'work' ? (
          // Combined Work View - Shows both customs and scenes
          <div className="space-y-4">
            {/* Show customs first */}
            {filteredCustoms.map((custom, index) => (
              <div key={custom.id} className="stagger-item" style={{ animationDelay: `${index * 0.08}s` }}>
                <MobileCustomCard
                  custom={custom}
                  onApprove={() => handleApprovalClick(custom)}
                  onUpload={() => handleUploadClick(custom)}
                  onMarkComplete={() => handleMarkComplete(custom.id)}
                />
              </div>
            ))}
            
            {/* Show pending scenes */}
            {pendingScenes.map((assignment, index) => (
              <div key={assignment.id} className="stagger-item" style={{ animationDelay: `${(filteredCustoms.length + index) * 0.08}s` }}>
                <MobileSceneCard
                  assignment={assignment}
                  scene={assignment.content_scenes}
                  onUploadClick={(stepIndex) => handleSceneUploadClick(assignment, assignment.content_scenes, stepIndex)}
                  onMarkComplete={() => handleMarkSceneComplete(assignment.id)}
                />
              </div>
            ))}
            
            {/* Empty state for work view */}
            {filteredCustoms.length === 0 && pendingScenes.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-bounce-in">
                <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  All caught up! ✨
                </h3>
                <p className="text-gray-600 text-sm">
                  No pending work right now. Great job!
                </p>
              </div>
            )}
          </div>
        ) : activeFilter === 'done' ? (
          // Completed Work View
          <div className="space-y-4">
            {/* Show completed scenes */}
            {completedScenes.map((assignment, index) => (
              <div key={assignment.id} className="stagger-item" style={{ animationDelay: `${index * 0.08}s` }}>
                <MobileSceneCard
                  assignment={assignment}
                  scene={assignment.content_scenes}
                  onUploadClick={(stepIndex) => handleSceneUploadClick(assignment, assignment.content_scenes, stepIndex)}
                  onMarkComplete={() => handleMarkSceneComplete(assignment.id)}
                />
              </div>
            ))}
            
            {/* Show delivered customs */}
            {completedCustoms.map((custom, index) => (
              <div key={custom.id} className="stagger-item" style={{ animationDelay: `${(completedScenes.length + index) * 0.08}s` }}>
                <MobileCustomCard
                  custom={custom}
                  onApprove={() => handleApprovalClick(custom)}
                  onUpload={() => handleUploadClick(custom)}
                  onMarkComplete={() => handleMarkComplete(custom.id)}
                />
              </div>
            ))}
            
            {/* Empty state for done view */}
            {completedScenes.length === 0 && completedCustoms.length === 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-bounce-in">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No completed work yet
                </h3>
                <p className="text-gray-600 text-sm">
                  Completed customs and scenes will appear here
                </p>
              </div>
            )}
          </div>
        ) : filteredCustoms.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-bounce-in">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeFilter === 'all' ? 'All caught up! ✨' : 'Nothing here yet!'}
            </h3>
            <p className="text-gray-600 text-sm">
              {activeFilter === 'all' 
                ? 'No active customs right now. Time to relax!' 
                : 'No items in this category right now.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustoms.map((custom, index) => (
              <div key={custom.id} className="stagger-item" style={{ animationDelay: `${index * 0.08}s` }}>
                <MobileCustomCard
                  custom={custom}
                  onApprove={() => handleApprovalClick(custom)}
                  onUpload={() => handleUploadClick(custom)}
                  onMarkComplete={() => handleMarkComplete(custom.id)}
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Bottom Navigation - Simplified */}
      <div className="fixed bottom-0 left-0 right-0 ios-tabbar px-4 py-2 safe-area-pb shadow-[0_-6px_20px_rgba(16,24,40,0.08)] animate-slide-down z-40">
        <div className="flex justify-around items-center">
          {/* Home */}
          <button 
            onClick={() => setActiveFilter('all')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              activeFilter === 'all' ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
            }`}
          >
            <Home className={`w-5 h-5 mb-1 transition-transform duration-200 ${activeFilter === 'all' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Home</span>
          </button>
          
          {/* Work - Combines customs + scenes */}
          <button 
            onClick={() => setActiveFilter('work')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 relative ${
              activeFilter === 'work' || activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'content_scenes' ? 'text-pink-600 bg-pink-50' : 'text-gray-600'
            }`}
          >
            <Sparkles className={`w-5 h-5 mb-1 transition-transform duration-200 ${activeFilter === 'work' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Work</span>
            {totalActionableItems > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{totalActionableItems}</span>
              </div>
            )}
          </button>
          
          {/* Done - Completed work */}
          <button 
            onClick={() => setActiveFilter('done')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              activeFilter === 'done' ? 'text-green-600 bg-green-50' : 'text-gray-600'
            }`}
          >
            <CheckCircle className={`w-5 h-5 mb-1 transition-transform duration-200 ${activeFilter === 'done' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Done</span>
          </button>
          
          {/* Settings */}
          <button 
            onClick={() => setActiveFilter('settings')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              activeFilter === 'settings' ? 'text-gray-600 bg-gray-50' : 'text-gray-600'
            }`}
          >
            <Settings className={`w-5 h-5 mb-1 transition-transform duration-200 ${activeFilter === 'settings' ? 'scale-110 rotate-90' : ''}`} />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <MobileApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedCustom(null);
        }}
        custom={selectedCustom}
        onApprove={handleApprove}
      />

      <MobileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedCustom(null);
        }}
        custom={selectedCustom}
        onComplete={handleMarkComplete}
      />

      <SceneUploadModal
        isOpen={isSceneUploadModalOpen}
        onClose={() => {
          setIsSceneUploadModalOpen(false);
          setSelectedSceneAssignment(null);
          setSelectedScene(null);
        }}
        assignment={selectedSceneAssignment}
        scene={selectedScene}
        stepIndex={selectedStepIndex}
      />
    </div>
    </MobilePinLock>
  );
};

export default MobileClientView;
  FileText,
  Settings,
  Sparkles,
  Film
} from 'lucide-react';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useClients } from '../hooks/useClients';
import { useClientPreferences } from '../hooks/useClientPreferences';
import { useContentScenes } from '../hooks/useContentScenes';
import { Database } from '../lib/database.types';
import MobileCustomCard from '../components/ui/MobileCustomCard';
import MobileApprovalModal from '../components/modals/MobileApprovalModal';
import MobileUploadModal from '../components/modals/MobileUploadModal';
import MobileSettingsView from '../components/ui/MobileSettingsView';
import MobilePinLock from '../components/auth/MobilePinLock';
import MobileSceneCard from '../components/ui/MobileSceneCard';
import SceneUploadModal from '../components/modals/SceneUploadModal';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];
type Client = Database['public']['Tables']['clients']['Row'];

const MobileClientView: React.FC = () => {
  const { clientUsername } = useParams<{ clientUsername: string }>();
  const [selectedCustom, setSelectedCustom] = useState<CustomRequest | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCustomsDropdown, setShowCustomsDropdown] = useState(false);
  
  // Scene state
  const [clientSceneAssignments, setClientSceneAssignments] = useState<any[]>([]);
  const [selectedSceneAssignment, setSelectedSceneAssignment] = useState<any>(null);
  const [selectedScene, setSelectedScene] = useState<any>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [isSceneUploadModalOpen, setIsSceneUploadModalOpen] = useState(false);
  const [scenesLoading, setScenesLoading] = useState(false);
  
  const { customRequests, loading: customsLoading, error: customsError, approveByClient, markAsCompleted } = useCustomRequests();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { fetchClientScenes, markSceneComplete } = useContentScenes();
  
  const client = clients.find((c: Client) => c.username.toLowerCase() === clientUsername?.toLowerCase());
  const { preferences, loading: preferencesLoading, savePreferences } = useClientPreferences(client?.id);
  const allClientCustoms: CustomRequest[] = customRequests.filter((c: CustomRequest) => 
    (c as any).clients?.username?.toLowerCase() === clientUsername?.toLowerCase() &&
    c.status !== 'pending'
  );

  // Calculate metrics
  const totalEarned = allClientCustoms.reduce((sum, custom) => sum + (custom.amount_paid || 0), 0);
  const pendingEarnings = allClientCustoms
    .filter(c => (c as any).status !== 'delivered' && (c as any).status !== 'cancelled')
    .reduce((sum, custom) => {
      const proposed = custom.proposed_amount || 0;
      const paid = custom.amount_paid || 0;
      return sum + Math.max(0, proposed - paid);
    }, 0);

  const pendingApproval = allClientCustoms.filter(c => (c as any).status === 'pending_client_approval');
  const needsUpload = allClientCustoms.filter(c => c.status === 'in_progress');

  // Scene metrics
  const pendingScenes = clientSceneAssignments.filter(a => a.status === 'pending');
  const completedScenes = clientSceneAssignments.filter(a => a.status === 'completed');

  // Load client scene assignments
  useEffect(() => {
    const loadSceneAssignments = async () => {
      if (client?.id) {
        setScenesLoading(true);
        const { data } = await fetchClientScenes(client.id);
        setClientSceneAssignments(data || []);
        setScenesLoading(false);
      }
    };
    loadSceneAssignments();
  }, [client?.id]);

  // Filter customs based on active filter
  const getFilteredCustoms = () => {
    switch (activeFilter) {
      case 'pending_approval':
        return pendingApproval;
      case 'needs_upload':
        return needsUpload;
      case 'settings':
        return [];
      case 'content_scenes':
        return [];
      case 'completed':
        return allClientCustoms.filter(c => (c as any).status === 'delivered');
      default:
        return allClientCustoms.filter(c => (c as any).status !== 'delivered');
    }
  };

  const filteredCustoms = getFilteredCustoms();

  const loading = customsLoading || clientsLoading || preferencesLoading || scenesLoading;
  const error = customsError || clientsError;

  const handleApprovalClick = (custom: CustomRequest) => {
    setSelectedCustom(custom);
    setIsApprovalModalOpen(true);
  };

  const handleUploadClick = (custom: CustomRequest) => {
    setSelectedCustom(custom);
    setIsUploadModalOpen(true);
  };

  const handleApprove = async (customId: string, estimatedDeliveryDate: string) => {
    const { error } = await approveByClient(customId, estimatedDeliveryDate);
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    return { error };
  };

  const handleMarkComplete = async (customId: string) => {
    const { error } = await markAsCompleted(customId);
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    return { error };
  };

  const handleSavePreferences = async (preferencesData: any) => {
    if (!client) return { error: 'Client not found' };
    
    const { error } = await savePreferences(client.id, preferencesData);
    return { error };
  };

  const handleSceneUploadClick = (assignment: any, scene: any, stepIndex: number) => {
    setSelectedSceneAssignment(assignment);
    setSelectedScene(scene);
    setSelectedStepIndex(stepIndex);
    setIsSceneUploadModalOpen(true);
  };

  const handleMarkSceneComplete = async (assignmentId: string) => {
    const { error } = await markSceneComplete(assignmentId);
    if (!error) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
      // Reload scene assignments
      if (client?.id) {
        const { data } = await fetchClientScenes(client.id);
        setClientSceneAssignments(data || []);
      }
    }
    return { error };
  };
  const quickActionTiles = [
    {
      id: 'pending_approval',
      title: 'Pending Approval',
      count: pendingApproval.length,
      value: pendingApproval.reduce((sum, c) => sum + (c.proposed_amount || 0), 0),
      icon: Clock,
      gradient: 'from-orange-400 to-pink-400',
      textColor: 'text-orange-600'
    },
    {
      id: 'needs_upload',
      title: 'Needs Upload',
      count: needsUpload.length,
      value: needsUpload.reduce((sum, c) => sum + (c.proposed_amount || 0), 0),
      icon: Upload,
      gradient: 'from-blue-400 to-purple-400',
      textColor: 'text-blue-600'
    },
    {
      id: 'content_scenes',
      title: 'Content Scenes',
      count: pendingScenes.length,
      value: clientSceneAssignments.length,
      icon: Film,
      gradient: 'from-orange-500 to-red-500',
      textColor: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 mx-auto">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">Oops! Something went wrong</h2>
          </div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Creator not found</h2>
          <p className="text-gray-600">We couldn't find this creator's dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <MobilePinLock clientId={client.id} clientUsername={clientUsername || ''}>
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-20 animate-pulse"></div>
        </div>
      )}

      {/* Header Section */}
      <div className="relative overflow-hidden ios-hero safe-area-pt">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500"></div>
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className={`relative px-4 transition-all duration-500 ease-in-out ${
          activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
            ? 'pt-4 pb-2'
            : 'pt-12 pb-8'
        }`}>
          <div className="flex items-center mb-6">
            <div className={`bg-white bg-opacity-20 backdrop-blur-sm rounded-full flex items-center justify-center mr-4 transition-all duration-500 ease-in-out overflow-hidden ${
              activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
                ? 'w-12 h-12'
                : 'w-16 h-16'
            }`}>
              {client.avatar_url ? (
                <img
                  src={client.avatar_url}
                  alt={`@${client.username}`}
                  className="w-full h-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    // Fallback to star icon if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      const star = document.createElement('div');
                      star.innerHTML = `<svg class="w-${activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' ? '6' : '8'} h-${activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' ? '6' : '8'} text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
                      parent.appendChild(star);
                    }
                  }}
                />
              ) : (
                <Star className={`text-white transition-all duration-500 ease-in-out ${
                  activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
                    ? 'w-6 h-6'
                    : 'w-8 h-8'
                }`} />
              )}
            </div>
            <div className="flex-1">
              <h1 className={`font-bold text-white mb-1 transition-all duration-500 ease-in-out ${
                activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
                  ? 'text-xl'
                  : 'text-2xl'
              }`}>
                {activeFilter === 'pending_approval' ? 'Pending Requests' :
                 activeFilter === 'needs_upload' ? 'Ready to Upload' :
                 activeFilter === 'settings' ? 'Settings' :
                 activeFilter === 'content_scenes' ? 'Content Scenes' :
                 `Hey @${client.username}! 👋`}
              </h1>
              <p className={`text-pink-100 text-sm transition-all duration-500 ease-in-out ${
                activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes'
                  ? 'opacity-100'
                  : 'opacity-90'
              }`}>
                {activeFilter === 'pending_approval' ? `${pendingApproval.length} request${pendingApproval.length !== 1 ? 's' : ''} need${pendingApproval.length === 1 ? 's' : ''} your approval` :
                 activeFilter === 'needs_upload' ? `${needsUpload.length} custom${needsUpload.length !== 1 ? 's' : ''} ready for content` :
                 activeFilter === 'settings' ? 'Manage your preferences and pricing' :
                 activeFilter === 'content_scenes' ? `${clientSceneAssignments.length} scene${clientSceneAssignments.length !== 1 ? 's' : ''} assigned to you` :
                 `You've got ${pendingApproval.length + needsUpload.length} customs waiting`}
              </p>
            </div>
          </div>

          {/* Segmented control removed per request */}

          {/* Earnings Pills */}
          {activeFilter === 'all' && (
            <div className="flex space-x-3 mb-6">
              <div className="stagger-item ios-pill px-4 py-2 flex-1 hover:scale-105 transition-transform duration-200" style={{ animationDelay: '0.1s' }}>
                <div className="text-center">
                  <div className="text-gray-900 font-extrabold text-lg transition-all duration-300">${totalEarned.toFixed(0)}</div>
                  <div className="text-gray-500 text-xs font-medium">Total Earned</div>
                </div>
              </div>
              <div className="stagger-item ios-pill px-4 py-2 flex-1 hover:scale-105 transition-transform duration-200" style={{ animationDelay: '0.15s' }}>
                <div className="text-center">
                  <div className="text-gray-900 font-extrabold text-lg transition-all duration-300">${pendingEarnings.toFixed(0)}</div>
                  <div className="text-gray-500 text-xs font-medium">Pending</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Tiles */}
      {activeFilter === 'all' && (
        <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          {quickActionTiles.map((tile, index) => {
            const Icon = tile.icon;
            const isActive = activeFilter === tile.id;
            
            return (
              <button
                key={tile.id}
                onClick={() => setActiveFilter(isActive ? 'all' : tile.id)}
                className={`stagger-item ios-card ios-pressable rounded-2xl p-4 transition-all duration-300 hover:scale-105 active:scale-95 ${
                  isActive ? 'ring-2 ring-purple-400 ring-opacity-50' : ''
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center mb-3 mx-auto transition-transform duration-300 hover:rotate-6`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${tile.textColor} mb-1 transition-all duration-200`}>
                    {tile.id === 'settings' ? (preferences ? '✓' : '!') : tile.count}
                  </div>
                  <div className="text-xs text-gray-600 mb-2 font-medium">
                    {tile.title}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">
                    {tile.id === 'settings' 
                      ? `$${(preferences?.minimum_pricing || 0).toFixed(0)} min` 
                      : tile.id === 'content_scenes'
                      ? `${tile.value} total`
                      : `$${tile.value.toFixed(0)}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Active Filter Indicator */}

      {/* Requests Feed */}
      <div className={`px-4 pb-24 transition-all duration-300 ${activeFilter === 'pending_approval' || activeFilter === 'needs_upload' || activeFilter === 'settings' || activeFilter === 'content_scenes' ? 'mt-4' : ''}`}>
        <div className="page-transition-enter" key={activeFilter}>
        {activeFilter === 'settings' ? (
          <div className="animate-fade-in-scale">
            <MobileSettingsView 
              client={client}
              preferences={preferences}
              onSave={handleSavePreferences}
            />
          </div>
        ) : activeFilter === 'content_scenes' ? (
          clientSceneAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-bounce-in">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                <Film className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No content scenes yet! 📹
              </h3>
              <p className="text-gray-600 text-sm">
                Your team will assign content scenes for you to work on. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {clientSceneAssignments.map((assignment, index) => (
                <div key={assignment.id} className="stagger-item" style={{ animationDelay: `${index * 0.1}s` }}>
                  <MobileSceneCard
                    assignment={assignment}
                    scene={assignment.content_scenes}
                    onUploadClick={(stepIndex) => handleSceneUploadClick(assignment, assignment.content_scenes, stepIndex)}
                    onMarkComplete={() => handleMarkSceneComplete(assignment.id)}
                  />
                </div>
              ))}
            </div>
          )
        ) : filteredCustoms.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-bounce-in">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeFilter === 'all' ? 'All caught up! ✨' : 'Nothing here yet!'}
            </h3>
            <p className="text-gray-600 text-sm">
              {activeFilter === 'all' 
                ? 'No active customs right now. Time to relax!' 
                : `No customs in the ${quickActionTiles.find(t => t.id === activeFilter)?.title.toLowerCase()} category.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustoms.map((custom, index) => (
              <div key={custom.id} className="stagger-item" style={{ animationDelay: `${index * 0.08}s` }}>
                <MobileCustomCard
                  custom={custom}
                  onApprove={() => handleApprovalClick(custom)}
                  onUpload={() => handleUploadClick(custom)}
                  onMarkComplete={() => handleMarkComplete(custom.id)}
                />
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 ios-tabbar px-4 py-2 safe-area-pb shadow-[0_-6px_20px_rgba(16,24,40,0.08)] animate-slide-down z-40">
        <div className="flex justify-around items-end relative">
          <button 
            onClick={() => {
              setActiveFilter('all');
              setShowCustomsDropdown(false);
            }}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              activeFilter === 'all' ? 'text-purple-600 bg-purple-50' : 'text-gray-600'
            }`}
          >
            <Home className={`w-5 h-5 mb-1 transition-transform duration-200 ${activeFilter === 'all' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Home</span>
          </button>
          
          {/* Customs Dropdown */}
          <div className="relative">
            {/* Dropdown Menu */}
            {showCustomsDropdown && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in-scale border border-gray-100">
                <button
                  onClick={() => {
                    setActiveFilter('pending_approval');
                    setShowCustomsDropdown(false);
                  }}
                  className="flex items-center w-full px-5 py-3 hover:bg-orange-50 transition-colors border-b border-gray-100 relative"
                >
                  <FileText className="w-5 h-5 mr-3 text-orange-600" />
                  <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Requests</span>
                  {pendingApproval.length > 0 && (
                    <span className="ml-3 px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                      {pendingApproval.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveFilter('needs_upload');
                    setShowCustomsDropdown(false);
                  }}
                  className="flex items-center w-full px-5 py-3 hover:bg-blue-50 transition-colors relative"
                >
                  <Upload className="w-5 h-5 mr-3 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900 whitespace-nowrap">Upload</span>
                  {needsUpload.length > 0 && (
                    <span className="ml-3 px-2 py-0.5 bg-blue-500 text-white text-xs font-bold rounded-full">
                      {needsUpload.length}
                    </span>
                  )}
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setShowCustomsDropdown(!showCustomsDropdown)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 relative ${
                activeFilter === 'pending_approval' || activeFilter === 'needs_upload' ? 'text-pink-600 bg-pink-50' : 'text-gray-600'
              }`}
            >
              <Sparkles className={`w-5 h-5 mb-1 transition-transform duration-200 ${showCustomsDropdown ? 'scale-110 rotate-12' : ''}`} />
              <span className="text-xs font-medium">Customs</span>
              {(pendingApproval.length > 0 || needsUpload.length > 0) && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{pendingApproval.length + needsUpload.length}</span>
                </div>
              )}
            </button>
          </div>
          
          <button 
            onClick={() => {
              setActiveFilter('content_scenes');
              setShowCustomsDropdown(false);
            }}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 relative ${
              activeFilter === 'content_scenes' ? 'text-orange-600 bg-orange-50' : 'text-gray-600'
            }`}
          >
            <Film className={`w-5 h-5 mb-1 transition-transform duration-200 ${activeFilter === 'content_scenes' ? 'scale-110' : ''}`} />
            <span className="text-xs font-medium">Scenes</span>
            {pendingScenes.length > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">{pendingScenes.length}</span>
              </div>
            )}
          </button>
          
          <button 
            onClick={() => {
              setActiveFilter('settings');
              setShowCustomsDropdown(false);
            }}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-300 transform hover:scale-110 active:scale-95 ${
              activeFilter === 'settings' ? 'text-gray-600 bg-gray-50' : 'text-gray-600'
            }`}
          >
            <Settings className={`w-5 h-5 mb-1 transition-transform duration-200 ${activeFilter === 'settings' ? 'scale-110 rotate-90' : ''}`} />
            <span className="text-xs font-medium">Settings</span>
          </button>
        </div>
      </div>
      
      {/* Dropdown backdrop to close on outside click */}
      {showCustomsDropdown && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowCustomsDropdown(false)}
        />
      )}

      {/* Modals */}
      <MobileApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setSelectedCustom(null);
        }}
        custom={selectedCustom}
        onApprove={handleApprove}
      />

      <MobileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedCustom(null);
        }}
        custom={selectedCustom}
        onComplete={handleMarkComplete}
      />

      <SceneUploadModal
        isOpen={isSceneUploadModalOpen}
        onClose={() => {
          setIsSceneUploadModalOpen(false);
          setSelectedSceneAssignment(null);
          setSelectedScene(null);
        }}
        assignment={selectedSceneAssignment}
        scene={selectedScene}
        stepIndex={selectedStepIndex}
      />
    </div>
    </MobilePinLock>
  );
};

export default MobileClientView;