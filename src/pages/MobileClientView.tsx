import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
  
  const { customRequests, loading: customsLoading, error: customsError, approveByClient, markAsCompleted } = useCustomRequests();
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { fetchClientScenes, markSceneComplete } = useContentScenes();
  
  const client = clients.find((c: Client) => c.username.toLowerCase() === clientUsername?.toLowerCase());
  const { preferences, loading: preferencesLoading, savePreferences } = useClientPreferences(client?.id);
  
  // Client-side notifications
  useClientNotifications(client?.id);
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

  // Scene metrics
  const pendingScenes = clientSceneAssignments.filter(a => a.status === 'pending');

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
      case 'customs':
        // Show all customs (pending approval + needs upload + completed)
        return allClientCustoms;
      case 'scenes':
        return [];
      case 'settings':
        return [];
      default:
        return [];
    }
  };

  const filteredCustoms = getFilteredCustoms();
  
  // Get filtered scenes for scenes tab
  const getFilteredScenes = () => {
    if (activeFilter === 'scenes') {
      return clientSceneAssignments;
    }
    return [];
  };
  
  const filteredScenes = getFilteredScenes();

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
      onSceneAction: (assignment, scene) => {
        // Navigate to scene viewer page
        navigate(`/app/${clientUsername}/scene/${assignment.id}`, {
          state: { assignment, scene }
        });
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
    <div className="min-h-screen bg-gray-50">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 opacity-20 animate-pulse"></div>
        </div>
      )}

      {/* Header Section */}
      <div className="relative overflow-hidden safe-area-pt">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500"></div>
        <div className="absolute inset-0 bg-black opacity-5"></div>
        <div className={`relative px-5 transition-all duration-300 ease-in-out ${
          activeFilter !== 'all' ? 'pt-5 pb-4' : 'pt-8 pb-6'
        }`}>
          <div className="flex items-center mb-5">
            <div className={`bg-white bg-opacity-25 backdrop-blur-sm rounded-full flex items-center justify-center mr-4 transition-all duration-300 ease-in-out overflow-hidden shadow-lg ${
              activeFilter !== 'all' ? 'w-14 h-14' : 'w-20 h-20'
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
              <h1 className={`font-bold text-white mb-1.5 tracking-tight transition-all duration-300 ease-in-out ${
                activeFilter !== 'all' ? 'text-xl' : 'text-2xl'
              }`}>
                {activeFilter === 'customs' ? 'Custom Requests' :
                 activeFilter === 'scenes' ? 'Content Scenes' :
                 activeFilter === 'settings' ? 'Settings' :
                 `Hey @${client.username}! 👋`}
              </h1>
              {activeFilter === 'all' ? (
                <StatusLine itemCount={totalActionableItems} />
              ) : (
                <p className={`text-pink-100 text-sm transition-all duration-500 ease-in-out opacity-100`}>
                  {activeFilter === 'customs' ? `${allClientCustoms.length} custom${allClientCustoms.length !== 1 ? 's' : ''} total` :
                   activeFilter === 'scenes' ? `${clientSceneAssignments.length} scene${clientSceneAssignments.length !== 1 ? 's' : ''} assigned` :
                   activeFilter === 'settings' ? 'Manage your preferences and pricing' :
                   ''}
                </p>
              )}
            </div>
          </div>

          {/* Segmented control removed per request */}

          {/* Earnings Pills */}
          {activeFilter === 'all' && (
            <div className="flex space-x-3">
              <div className="stagger-item bg-white bg-opacity-25 backdrop-blur-sm rounded-2xl px-4 py-3 flex-1 shadow-lg" style={{ animationDelay: '0.1s' }}>
                <div className="text-center">
                  <div className="text-white font-bold text-xl tracking-tight">${totalEarned.toFixed(0)}</div>
                  <div className="text-white text-xs opacity-90 font-medium mt-0.5">Total Earned</div>
                </div>
              </div>
              <div className="stagger-item bg-white bg-opacity-25 backdrop-blur-sm rounded-2xl px-4 py-3 flex-1 shadow-lg" style={{ animationDelay: '0.15s' }}>
                <div className="text-center">
                  <div className="text-white font-bold text-xl tracking-tight">${pendingEarnings.toFixed(0)}</div>
                  <div className="text-white text-xs opacity-90 font-medium mt-0.5">Pending</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Priority Feed - Replaces Quick Action Tiles */}
      {activeFilter === 'all' && (
        <div className="px-5 -mt-4 mb-6">
          <PriorityFeed 
            items={priorityFeedItems}
            totalEarned={totalEarned}
            onNavigateSettings={() => setActiveFilter('settings')}
          />
        </div>
      )}

      {/* Active Filter Indicator */}

      {/* Content Feed */}
      <div className={`px-5 pb-24 transition-all duration-300 ${activeFilter !== 'all' ? 'mt-4' : ''}`}>
        <div className="page-transition-enter" key={activeFilter}>
        {activeFilter === 'settings' ? (
          <div className="animate-fade-in-scale">
            <MobileSettingsView 
              client={client}
              preferences={preferences}
              onSave={handleSavePreferences}
            />
          </div>
        ) : activeFilter === 'customs' ? (
          // Customs Tab - Show all custom requests as priority cards
          filteredCustoms.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center animate-bounce-in">
              <div className="w-16 h-16 bg-purple-50 border-2 border-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                <Sparkles className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No customs yet
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Custom requests will appear here when fans place orders
              </p>
            </div>
          ) : (
            <PriorityFeed 
              items={priorityEngine.processFeed(
                filteredCustoms,
                [],
                {
                  onCustomAction: (custom) => {
                    const status = (custom as any).status;
                    if (status === 'pending' || status === 'pending_client_approval') {
                      handleApprovalClick(custom);
                    } else if (custom.status === 'in_progress') {
                      handleUploadClick(custom);
                    }
                  },
                  onSceneAction: () => {}
                }
              )}
              totalEarned={totalEarned}
              maxVisibleItems={50}
            />
          )
        ) : activeFilter === 'scenes' ? (
          // Scenes Tab - Show all scene assignments
          filteredScenes.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 shadow-sm text-center animate-bounce-in">
              <div className="w-16 h-16 bg-orange-50 border-2 border-orange-200 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
                <CheckCircle className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                No content scenes yet
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your team will assign content scenes for you to work on
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredScenes.map((assignment, index) => (
                <div key={assignment.id} className="stagger-item" style={{ animationDelay: `${index * 0.08}s` }}>
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
        ) : null}
        </div>
      </div>

      {/* Bottom Navigation - Enhanced with Pill Highlights */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg px-4 py-2 safe-area-pb border-t border-gray-100 z-40">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {/* Home - Priority Feed */}
          <button 
            onClick={() => setActiveFilter('all')}
            className={`flex flex-col items-center py-2 px-5 rounded-2xl transition-all duration-300 relative ${
              activeFilter === 'all' 
                ? 'bg-gradient-to-br from-pink-50 to-rose-100 text-pink-600' 
                : 'text-gray-400 hover:text-gray-600 active:scale-95'
            }`}
          >
            <div className={`relative transition-transform duration-200 ${activeFilter === 'all' ? 'scale-110' : ''}`}>
              <Home 
                className={`w-6 h-6 mb-0.5 transition-all duration-200 ${
                  activeFilter === 'all' ? 'stroke-[2.5]' : 'stroke-[1.5]'
                }`} 
                fill={activeFilter === 'all' ? 'rgba(236, 72, 153, 0.15)' : 'none'}
              />
            </div>
            <span className={`text-[11px] transition-all duration-200 ${
              activeFilter === 'all' ? 'font-bold' : 'font-medium'
            }`}>Home</span>
          </button>
          
          {/* Customs - All Custom Requests */}
          <button 
            onClick={() => setActiveFilter('customs')}
            className={`flex flex-col items-center py-2 px-5 rounded-2xl transition-all duration-300 relative ${
              activeFilter === 'customs' 
                ? 'bg-gradient-to-br from-pink-50 to-rose-100 text-pink-600' 
                : 'text-gray-400 hover:text-gray-600 active:scale-95'
            }`}
          >
            <div className={`relative transition-transform duration-200 ${activeFilter === 'customs' ? 'scale-110' : ''}`}>
              <Sparkles 
                className={`w-6 h-6 mb-0.5 transition-all duration-200 ${
                  activeFilter === 'customs' ? 'stroke-[2.5]' : 'stroke-[1.5]'
                }`}
                fill={activeFilter === 'customs' ? 'rgba(236, 72, 153, 0.15)' : 'none'}
              />
              {(pendingApproval.length + needsUpload.length) > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[9px] font-bold text-white">{pendingApproval.length + needsUpload.length}</span>
                </div>
              )}
            </div>
            <span className={`text-[11px] transition-all duration-200 ${
              activeFilter === 'customs' ? 'font-bold' : 'font-medium'
            }`}>Customs</span>
          </button>
          
          {/* Scenes - Content Scene Assignments */}
          <button 
            onClick={() => setActiveFilter('scenes')}
            className={`flex flex-col items-center py-2 px-5 rounded-2xl transition-all duration-300 relative ${
              activeFilter === 'scenes' 
                ? 'bg-gradient-to-br from-pink-50 to-rose-100 text-pink-600' 
                : 'text-gray-400 hover:text-gray-600 active:scale-95'
            }`}
          >
            <div className={`relative transition-transform duration-200 ${activeFilter === 'scenes' ? 'scale-110' : ''}`}>
              <CheckCircle 
                className={`w-6 h-6 mb-0.5 transition-all duration-200 ${
                  activeFilter === 'scenes' ? 'stroke-[2.5]' : 'stroke-[1.5]'
                }`}
                fill={activeFilter === 'scenes' ? 'rgba(236, 72, 153, 0.15)' : 'none'}
              />
              {pendingScenes.length > 0 && (
                <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[9px] font-bold text-white">{pendingScenes.length}</span>
                </div>
              )}
            </div>
            <span className={`text-[11px] transition-all duration-200 ${
              activeFilter === 'scenes' ? 'font-bold' : 'font-medium'
            }`}>Scenes</span>
          </button>
          
          {/* Settings */}
          <button 
            onClick={() => setActiveFilter('settings')}
            className={`flex flex-col items-center py-2 px-5 rounded-2xl transition-all duration-300 relative ${
              activeFilter === 'settings' 
                ? 'bg-gradient-to-br from-pink-50 to-rose-100 text-pink-600' 
                : 'text-gray-400 hover:text-gray-600 active:scale-95'
            }`}
          >
            <div className={`relative transition-all duration-300 ${activeFilter === 'settings' ? 'scale-110 rotate-45' : ''}`}>
              <Settings 
                className={`w-6 h-6 mb-0.5 transition-all duration-200 ${
                  activeFilter === 'settings' ? 'stroke-[2.5]' : 'stroke-[1.5]'
                }`}
                fill={activeFilter === 'settings' ? 'rgba(236, 72, 153, 0.15)' : 'none'}
              />
            </div>
            <span className={`text-[11px] transition-all duration-200 ${
              activeFilter === 'settings' ? 'font-bold' : 'font-medium'
            }`}>Settings</span>
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