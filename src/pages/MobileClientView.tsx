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
  CheckCircle,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { usePublicCustomRequests } from '../hooks/usePublicCustomRequests';
import { usePublicClient } from '../hooks/usePublicClient';
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
import VibeCheckCard from '../components/ui/VibeCheckCard';

type CustomRequest = Database['public']['Tables']['custom_requests']['Row'];

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
  
  const { client, loading: clientLoading, error: clientError } = usePublicClient(clientUsername);
  const { customRequests, loading: customsLoading, error: customsError, approveByClient, markAsCompleted } = usePublicCustomRequests(client?.id);
  const { fetchClientScenes, markSceneComplete } = useContentScenes();
  
  const { preferences, loading: preferencesLoading, savePreferences } = useClientPreferences(client?.id);
  
  // Client-side notifications
  useClientNotifications(client?.id);
  // Filter out pending requests (not yet approved by team)
  const allClientCustoms: CustomRequest[] = customRequests.filter((c: CustomRequest) => 
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

  const loading = customsLoading || clientLoading || preferencesLoading || scenesLoading;
  const error = customsError || clientError;

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
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-violet-500/20 mx-auto mb-5">
              <Loader2 className="w-9 h-9 animate-spin text-violet-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg animate-bounce" />
          </div>
          <p className="text-gray-600 font-semibold text-[15px]">Loading your dashboard...</p>
          <p className="text-gray-400 text-sm mt-1">Just a moment</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-100 flex items-center justify-center p-5">
        <div className="relative overflow-hidden bg-white rounded-[28px] shadow-2xl max-w-md w-full">
          <div className="h-1.5 bg-gradient-to-r from-red-400 via-rose-400 to-pink-400" />
          <div className="p-7">
            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 mb-5">
              <AlertCircle className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Something Went Wrong</h2>
            <p className="text-gray-500 text-[15px] leading-relaxed">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-fuchsia-50 to-rose-100 flex items-center justify-center p-5">
        <div className="relative overflow-hidden bg-white rounded-[28px] shadow-2xl max-w-md w-full">
          <div className="h-1.5 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300" />
          <div className="p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg">
              <User className="w-9 h-9 text-gray-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Creator Not Found</h2>
            <p className="text-gray-500 text-[15px]">We couldn't find this creator's dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobilePinLock clientId={client.id} clientUsername={clientUsername || ''}>
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Confetti/Success Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-15 animate-pulse"></div>
          <div className="absolute top-1/4 left-1/4 w-4 h-4 bg-amber-400 rounded-full animate-bounce shadow-lg" />
          <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-violet-500 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.1s' }} />
          <div className="absolute bottom-1/3 left-1/3 w-5 h-5 bg-rose-500 rounded-full animate-bounce shadow-lg" style={{ animationDelay: '0.2s' }} />
        </div>
      )}

      {/* Header Section - Premium Design */}
      <div className="relative overflow-hidden safe-area-pt">
        {/* Multi-layer gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 to-rose-500"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/10 to-transparent"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 right-5 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-5 left-5 w-24 h-24 bg-fuchsia-300/20 rounded-full blur-2xl"></div>
        
        <div className={`relative px-5 transition-all duration-300 ease-in-out ${
          activeFilter !== 'all' ? 'pt-6 pb-5' : 'pt-8 pb-8'
        }`}>
          {/* Profile Row */}
          <div className="flex items-center mb-6">
            {/* Avatar with glow effect */}
            <div className="relative mr-4">
              <div className={`
                rounded-2xl flex items-center justify-center overflow-hidden
                bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm
                border border-white/30 shadow-xl shadow-purple-900/20
                transition-all duration-300 ease-in-out
                ${activeFilter !== 'all' ? 'w-14 h-14' : 'w-[72px] h-[72px]'}
              `}>
                {client.avatar_url ? (
                  <img
                    src={client.avatar_url}
                    alt={`@${client.username}`}
                    className="w-full h-full object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <Star className={`text-white drop-shadow-lg ${
                    activeFilter !== 'all' ? 'w-6 h-6' : 'w-8 h-8'
                  }`} fill="currentColor" />
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-[3px] border-fuchsia-500 shadow-lg"></div>
            </div>
            
            {/* Greeting */}
            <div className="flex-1">
              <h1 className={`font-extrabold text-white tracking-tight leading-tight transition-all duration-300 ${
                activeFilter !== 'all' ? 'text-xl' : 'text-[26px]'
              }`}>
                {activeFilter === 'customs' ? 'Custom Requests' :
                 activeFilter === 'scenes' ? 'Content Scenes' :
                 activeFilter === 'settings' ? 'Settings' :
                 <>Hey, <span className="text-amber-200">@{client.username}</span>!</>}
              </h1>
              {activeFilter === 'all' ? (
                <div className="mt-2">
                  <StatusLine itemCount={totalActionableItems} />
                </div>
              ) : (
                <p className="text-white/70 text-sm mt-1 font-medium">
                  {activeFilter === 'customs' ? `${allClientCustoms.length} custom${allClientCustoms.length !== 1 ? 's' : ''} total` :
                   activeFilter === 'scenes' ? `${clientSceneAssignments.length} scene${clientSceneAssignments.length !== 1 ? 's' : ''} assigned` :
                   activeFilter === 'settings' ? 'Manage your preferences' :
                   ''}
                </p>
              )}
            </div>
          </div>

          {/* Earnings Cards - Premium Glass Design */}
          {activeFilter === 'all' && (
            <div className="grid grid-cols-2 gap-3">
              {/* Total Earned Card */}
              <div className="stagger-item group" style={{ animationDelay: '0.1s' }}>
                <div className="relative overflow-hidden bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300">
                  {/* Icon */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-emerald-300" />
                  </div>
                  {/* Amount */}
                  <div className="text-white font-extrabold text-2xl tracking-tight">
                    ${totalEarned.toFixed(0)}
                  </div>
                  <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    Total Earned
                  </div>
                </div>
              </div>
              
              {/* Pending Card */}
              <div className="stagger-item group" style={{ animationDelay: '0.15s' }}>
                <div className="relative overflow-hidden bg-white/15 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg hover:bg-white/20 transition-all duration-300">
                  {/* Icon */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    {pendingEarnings > 0 && (
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                    )}
                  </div>
                  {/* Amount */}
                  <div className="text-white font-extrabold text-2xl tracking-tight">
                    ${pendingEarnings.toFixed(0)}
                  </div>
                  <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mt-0.5">
                    Pending
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vibe Check Card - Above Priority Feed */}
      {activeFilter === 'all' && client && (
        <div className="px-5 -mt-2 mb-4">
          <VibeCheckCard 
            clientId={client.id} 
            clientUsername={clientUsername || ''} 
          />
        </div>
      )}

      {/* Priority Feed - Replaces Quick Action Tiles */}
      {activeFilter === 'all' && (
        <div className="px-5 -mt-2 mb-6">
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
            <div className="relative overflow-hidden bg-white rounded-[28px] shadow-lg shadow-gray-200/60 border border-gray-100 animate-bounce-in">
              <div className="h-1.5 bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400" />
              <div className="p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-500 rounded-3xl flex items-center justify-center shadow-xl shadow-violet-500/30 rotate-3">
                    <Sparkles className="w-9 h-9 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
                  No Customs Yet
                </h3>
                <p className="text-gray-500 text-[15px] leading-relaxed max-w-xs mx-auto">
                  Custom requests will appear here when fans place orders
                </p>
              </div>
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
            <div className="relative overflow-hidden bg-white rounded-[28px] shadow-lg shadow-gray-200/60 border border-gray-100 animate-bounce-in">
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />
              <div className="p-8 text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl flex items-center justify-center shadow-xl shadow-orange-500/30 -rotate-3">
                    <CheckCircle className="w-9 h-9 text-white" />
                  </div>
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
                  No Scenes Yet
                </h3>
                <p className="text-gray-500 text-[15px] leading-relaxed max-w-xs mx-auto">
                  Your team will assign content scenes for you to work on
                </p>
              </div>
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