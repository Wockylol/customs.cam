import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText, DollarSign, MessageSquare, Settings, CheckCircle, Globe, Heart, MapPin, Briefcase, AlertCircle, Calendar, Search, X, Sparkles, Send, Pin, Trash2, Reply, Image as ImageIcon, Plus, Target, UserPlus, Clock, Phone, Mail } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useClients } from '../hooks/useClients';
import { useAuth } from '../contexts/AuthContext';
import { useClientQuestionnaire } from '../hooks/useClientQuestionnaire';
import { useClientPreferences } from '../hooks/useClientPreferences';
import { useClientNotes } from '../hooks/useClientNotes';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useFanNotes } from '../hooks/useFanNotes';
import { useLeadActivities } from '../hooks/useLeadActivities';
import { useLeads } from '../hooks/useLeads';
import AddCustomModal from '../components/modals/AddCustomModal';
import AddFanNoteModal from '../components/modals/AddFanNoteModal';
import IdiolectAnalysisView from '../components/ui/IdiolectAnalysisView';
import { useIdiolectAnalysis } from '../hooks/useIdiolectAnalysis';
import { Database } from '../lib/database.types';

type ClientStatus = Database['public']['Enums']['client_status'];
type TabType = 'overview' | 'questionnaire' | 'pricing' | 'askAi' | 'notes' | 'fanNotes' | 'voice' | 'pipeline';

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  lead: { label: 'Lead', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: <Target className="w-4 h-4" /> },
  prospect: { label: 'Prospect', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: <UserPlus className="w-4 h-4" /> },
  pending_contract: { label: 'Pending Contract', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: <FileText className="w-4 h-4" /> },
  active: { label: 'Active', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle className="w-4 h-4" /> },
  inactive: { label: 'Inactive', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30', icon: <Clock className="w-4 h-4" /> },
  churned: { label: 'Churned', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: <AlertCircle className="w-4 h-4" /> },
};

const ClientProfilePage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  // Include inactive clients so we can view resigned clients' profiles
  const { clients } = useClients({ includeInactive: true });
  const { teamMember } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiConversation, setAiConversation] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const { questionnaire, personas, contentDetails, loading: questionnaireLoading } = useClientQuestionnaire(clientId);
  const { preferences, loading: preferencesLoading } = useClientPreferences(clientId);
  const { notes, replies, loading: notesLoading, createNote, createReply, togglePin, deleteNote, deleteReply } = useClientNotes(clientId);
  const { addCustomRequest } = useCustomRequests();
  const { 
    notes: fanNotes, 
    replies: fanReplies, 
    fanNames, 
    loading: fanNotesLoading, 
    createFanNote, 
    createReply: createFanReply, 
    deleteFanNote, 
    deleteReply: deleteFanReply,
    getNotesGroupedByFan 
  } = useFanNotes(clientId);
  
  // Idiolect analysis hook
  const { analysis: idiolectAnalysis, loading: idiolectLoading } = useIdiolectAnalysis(clientId);
  
  // Lead/Pipeline hooks
  const { activities, loading: activitiesLoading, scheduleCall, markCallCompleted, sendContract, signContract, addNote: addLeadNote, getActivityLabel, getActivityIcon, getActivityColor } = useLeadActivities(clientId);
  const { updateLeadStatus } = useLeads();
  
  // Modal state
  const [isAddCustomModalOpen, setIsAddCustomModalOpen] = useState(false);
  const [isAddFanNoteModalOpen, setIsAddFanNoteModalOpen] = useState(false);
  
  // Notes tab state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteImage, setNewNoteImage] = useState<File | null>(null);
  const [newNoteImagePreview, setNewNoteImagePreview] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<Record<string, string>>({});
  const [replyImages, setReplyImages] = useState<Record<string, File | null>>({});
  const [replyImagePreviews, setReplyImagePreviews] = useState<Record<string, string | null>>({});
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [showReplyInput, setShowReplyInput] = useState<string | null>(null);

  // Fan Notes tab state
  const [selectedFanFilter, setSelectedFanFilter] = useState<string | null>(null);
  const [fanListSearchQuery, setFanListSearchQuery] = useState('');
  const [fanReplyContent, setFanReplyContent] = useState<Record<string, string>>({});
  const [fanReplyImages, setFanReplyImages] = useState<Record<string, File | null>>({});
  const [fanReplyImagePreviews, setFanReplyImagePreviews] = useState<Record<string, string | null>>({});
  const [expandedFanNotes, setExpandedFanNotes] = useState<Set<string>>(new Set());
  const [showFanReplyInput, setShowFanReplyInput] = useState<string | null>(null);

  // Auto-select first fan when fan notes are loaded
  useEffect(() => {
    if (!fanNotesLoading && fanNames.length > 0 && !selectedFanFilter) {
      setSelectedFanFilter(fanNames[0]);
    }
  }, [fanNotesLoading, fanNames, selectedFanFilter]);

  // Find the client
  const client = clients.find(c => c.id === clientId);

  // Get client status (calculate before early return for use in hooks)
  const clientStatus = client ? (((client as any).status as ClientStatus) || 'active') : 'active';
  const statusConfig = STATUS_CONFIG[clientStatus];
  const isLeadOrProspect = ['lead', 'prospect', 'pending_contract'].includes(clientStatus);

  useEffect(() => {
    // If client not found, redirect back
    if (!client && clients.length > 0) {
      navigate('/clients');
    }
  }, [client, clients, navigate]);

  // Set initial tab based on client status
  useEffect(() => {
    if (client && isLeadOrProspect && activeTab === 'overview') {
      setActiveTab('pipeline');
    }
  }, [client, clientStatus, isLeadOrProspect, activeTab]);

  if (!client) {
    return (
      <Layout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const tabs = [
    ...(isLeadOrProspect ? [{ id: 'pipeline' as TabType, name: 'Pipeline', icon: Target }] : []),
    { id: 'overview' as TabType, name: 'Overview', icon: User },
    { id: 'questionnaire' as TabType, name: 'Questionnaire', icon: FileText },
    { id: 'pricing' as TabType, name: 'Pricing Preferences', icon: DollarSign },
    { id: 'voice' as TabType, name: 'Voice Profile', icon: MessageSquare },
    { id: 'askAi' as TabType, name: 'Ask AI', icon: Sparkles },
    { id: 'notes' as TabType, name: 'Notes', icon: MessageSquare },
    { id: 'fanNotes' as TabType, name: 'Fan Notes', icon: User },
  ];

  // Handler for adding custom request
  const handleAddCustom = async (customData: {
    clientUsername: string;
    fanName: string;
    description: string;
    fanLifetimeSpend?: number;
    proposedAmount: number;
    amountPaid?: number;
    length: string;
    chatLink?: string;
    notes?: string;
    images?: File[];
  }) => {
    const { error } = await addCustomRequest(customData);
    if (!error) {
      setIsAddCustomModalOpen(false);
    }
    return { error };
  };

  // Helper functions for notes
  const handleNoteImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewNoteImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewNoteImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveNoteImage = () => {
    setNewNoteImage(null);
    setNewNoteImagePreview(null);
  };

  const handleReplyImageChange = (noteId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReplyImages(prev => ({ ...prev, [noteId]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setReplyImagePreviews(prev => ({ ...prev, [noteId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReplyImage = (noteId: string) => {
    setReplyImages(prev => ({ ...prev, [noteId]: null }));
    setReplyImagePreviews(prev => ({ ...prev, [noteId]: null }));
  };

  const handleCreateNote = async () => {
    if (!newNoteContent.trim() && !newNoteImage) return;
    
    const result = await createNote(newNoteContent, newNoteImage || undefined);
    if (!result.error) {
      setNewNoteContent('');
      setNewNoteImage(null);
      setNewNoteImagePreview(null);
    }
  };

  const handleCreateReply = async (noteId: string) => {
    const content = replyContent[noteId];
    const image = replyImages[noteId];
    
    if (!content?.trim() && !image) return;
    
    const result = await createReply(noteId, content || '', image || undefined);
    if (!result.error) {
      setReplyContent(prev => ({ ...prev, [noteId]: '' }));
      setReplyImages(prev => ({ ...prev, [noteId]: null }));
      setReplyImagePreviews(prev => ({ ...prev, [noteId]: null }));
      setShowReplyInput(null);
    }
  };

  const handleTogglePin = async (noteId: string) => {
    await togglePin(noteId);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
      await deleteNote(noteId);
    }
  };

  const handleDeleteReply = async (replyId: string) => {
    if (confirm('Are you sure you want to delete this reply? This action cannot be undone.')) {
      await deleteReply(replyId);
    }
  };

  const toggleNoteExpanded = (noteId: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  // Fan Notes helper functions
  const handleFanReplyImageChange = (noteId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFanReplyImages(prev => ({ ...prev, [noteId]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setFanReplyImagePreviews(prev => ({ ...prev, [noteId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFanReplyImage = (noteId: string) => {
    setFanReplyImages(prev => ({ ...prev, [noteId]: null }));
    setFanReplyImagePreviews(prev => ({ ...prev, [noteId]: null }));
  };

  const handleCreateFanNote = async (fanName: string, content: string, image?: File) => {
    const result = await createFanNote(fanName, content, image);
    if (!result.error) {
      // Auto-select the fan after creating note
      setSelectedFanFilter(fanName);
    }
    return result;
  };

  const handleCreateFanReply = async (noteId: string) => {
    const content = fanReplyContent[noteId];
    const image = fanReplyImages[noteId];
    
    if (!content?.trim() && !image) return;
    
    const result = await createFanReply(noteId, content || '', image || undefined);
    if (!result.error) {
      setFanReplyContent(prev => ({ ...prev, [noteId]: '' }));
      setFanReplyImages(prev => ({ ...prev, [noteId]: null }));
      setFanReplyImagePreviews(prev => ({ ...prev, [noteId]: null }));
      setShowFanReplyInput(null);
    }
  };

  const handleDeleteFanNote = async (noteId: string) => {
    if (confirm('Are you sure you want to delete this fan note? This action cannot be undone.')) {
      await deleteFanNote(noteId);
    }
  };

  const handleDeleteFanReply = async (replyId: string) => {
    if (confirm('Are you sure you want to delete this reply? This action cannot be undone.')) {
      await deleteFanReply(replyId);
    }
  };

  const toggleFanNoteExpanded = (noteId: string) => {
    setExpandedFanNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const handleAskAI = async () => {
    if (!aiQuestion.trim() || !questionnaire) return;
    
    setAiLoading(true);
    const userMessage = aiQuestion.trim();
    setAiQuestion('');
    
    // Add user message to conversation
    setAiConversation(prev => [...prev, { role: 'user', content: userMessage }]);
    
    try {
      // Prepare context with client data
      const contextData = {
        client: {
          username: client?.username,
        },
        questionnaire: {
          publicName: questionnaire.public_name,
          publicNicknames: questionnaire.public_nicknames,
          birthday: questionnaire.public_birthday,
          gender: questionnaire.gender,
          nativeLanguage: questionnaire.native_language,
          otherLanguages: questionnaire.other_languages,
          sexualOrientation: questionnaire.sexual_orientation,
          ethnicity: questionnaire.ethnicity,
          height: questionnaire.height,
          weight: questionnaire.weight,
          shoeSize: questionnaire.shoe_size,
          braSize: questionnaire.bra_size,
          zodiacSign: questionnaire.zodiac_sign,
          favoriteColors: questionnaire.favorite_colors,
          birthPlace: questionnaire.birth_place,
          currentLocation: questionnaire.current_location,
          hobbies: questionnaire.hobbies,
          college: questionnaire.college,
          currentCar: questionnaire.current_car,
          dreamCar: questionnaire.dream_car,
          pets: questionnaire.pets,
          favoritePlaceTraveled: questionnaire.favorite_place_traveled,
          dreamDestination: questionnaire.dream_destination,
          relationshipStatus: questionnaire.relationship_status,
          dreamDate: questionnaire.dream_date,
          hasChildren: questionnaire.has_children,
          otherCareer: questionnaire.other_career,
          knownFrom: questionnaire.known_from,
          additionalInfo: questionnaire.additional_info,
          hardNos: questionnaire.hard_nos,
          weekdayRoutine: questionnaire.weekday_routine,
          weekendRoutine: questionnaire.weekend_routine,
          personas: personas,
        },
        preferences: preferences ? {
          minimumPricing: preferences.minimum_pricing,
          videoCall: preferences.video_call,
          audioCall: preferences.audio_call,
          dickRates: preferences.dick_rates,
          fanSigns: preferences.fan_signs,
          usingFansName: preferences.using_fans_name,
          sayingSpecificThings: preferences.saying_specific_things,
          roleplaying: preferences.roleplaying,
          usingToysProps: preferences.using_toys_props,
          specificOutfits: preferences.specific_outfits,
          fullNudityCensored: preferences.full_nudity_censored,
          fullNudityUncensored: preferences.full_nudity_uncensored,
          masturbation: preferences.masturbation,
          analContent: preferences.anal_content,
          feetContent: preferences.feet_content,
        } : null,
      };
      
      // Build context summary for AI
      const contextSummary = `
CLIENT PROFILE: @${contextData.client.username}

PERSONAL INFORMATION:
${questionnaire.public_name ? `- Name: ${questionnaire.public_name}` : ''}
${questionnaire.public_nicknames ? `- Nicknames: ${questionnaire.public_nicknames}` : ''}
${questionnaire.public_birthday ? `- Birthday: ${questionnaire.public_birthday}` : ''}
${questionnaire.gender ? `- Gender: ${questionnaire.gender}` : ''}
${questionnaire.sexual_orientation ? `- Sexual Orientation: ${questionnaire.sexual_orientation}` : ''}
${questionnaire.ethnicity ? `- Ethnicity: ${questionnaire.ethnicity}` : ''}
${questionnaire.zodiac_sign ? `- Zodiac Sign: ${questionnaire.zodiac_sign}` : ''}
${questionnaire.relationship_status ? `- Relationship Status: ${questionnaire.relationship_status}` : ''}
${questionnaire.has_children ? `- Has Children: ${questionnaire.has_children}` : ''}

PHYSICAL ATTRIBUTES:
${questionnaire.height ? `- Height: ${questionnaire.height}` : ''}
${questionnaire.weight ? `- Weight: ${questionnaire.weight}` : ''}
${questionnaire.shoe_size ? `- Shoe Size: ${questionnaire.shoe_size}` : ''}
${questionnaire.bra_size ? `- Bra Size: ${questionnaire.bra_size}` : ''}

LANGUAGES & LOCATION:
${questionnaire.native_language ? `- Native Language: ${questionnaire.native_language}` : ''}
${questionnaire.other_languages ? `- Other Languages: ${questionnaire.other_languages}` : ''}
${questionnaire.birth_place ? `- Birth Place: ${questionnaire.birth_place}` : ''}
${questionnaire.current_location ? `- Current Location: ${questionnaire.current_location}` : ''}

INTERESTS & LIFESTYLE:
${questionnaire.hobbies ? `- Hobbies: ${questionnaire.hobbies}` : ''}
${questionnaire.favorite_colors ? `- Favorite Colors: ${questionnaire.favorite_colors}` : ''}
${questionnaire.pets ? `- Pets: ${questionnaire.pets}` : ''}
${questionnaire.current_car ? `- Current Car: ${questionnaire.current_car}` : ''}
${questionnaire.dream_car ? `- Dream Car: ${questionnaire.dream_car}` : ''}
${questionnaire.dream_date ? `- Dream Date: ${questionnaire.dream_date}` : ''}

DAILY ROUTINES:
${questionnaire.weekday_routine ? `- Weekday Routine: ${questionnaire.weekday_routine}` : ''}
${questionnaire.weekend_routine ? `- Weekend Routine: ${questionnaire.weekend_routine}` : ''}

TRAVEL:
${questionnaire.favorite_place_traveled ? `- Favorite Place Traveled: ${questionnaire.favorite_place_traveled}` : ''}
${questionnaire.dream_destination ? `- Dream Destination: ${questionnaire.dream_destination}` : ''}

EDUCATION & CAREER:
${questionnaire.college ? `- College: ${questionnaire.college}` : ''}
${questionnaire.other_career ? `- Other Career: ${questionnaire.other_career}` : ''}

PERSONAS:
${personas.length > 0 ? personas.map(p => `- ${p}`).join('\n') : '- None specified'}

⚠️ HARD NOS / BOUNDARIES:
${questionnaire.hard_nos || 'Not specified'}

CONTENT PREFERENCES:
${preferences ? `
- Minimum Pricing: $${preferences.minimum_pricing}
- Video Call: ${preferences.video_call ? 'Yes' : 'No'}
- Audio Call: ${preferences.audio_call ? 'Yes' : 'No'}
- Dick Rates: ${preferences.dick_rates ? 'Yes' : 'No'}
- Fan Signs: ${preferences.fan_signs ? 'Yes' : 'No'}
- Using Fan's Name: ${preferences.using_fans_name ? 'Yes' : 'No'}
- Saying Specific Things: ${preferences.saying_specific_things ? 'Yes' : 'No'}
- Roleplaying: ${preferences.roleplaying ? 'Yes' : 'No'}
- Using Toys/Props: ${preferences.using_toys_props ? 'Yes' : 'No'}
- Specific Outfits: ${preferences.specific_outfits ? 'Yes' : 'No'}
- Full Nudity (Censored): ${preferences.full_nudity_censored ? 'Yes' : 'No'}
- Full Nudity (Uncensored): ${preferences.full_nudity_uncensored ? 'Yes' : 'No'}
- Masturbation: ${preferences.masturbation ? 'Yes' : 'No'}
- Anal Content: ${preferences.anal_content ? 'Yes' : 'No'}
- Feet Content: ${preferences.feet_content ? 'Yes' : 'No'}
` : 'No preferences set'}

ADDITIONAL INFO:
${questionnaire.known_from ? `- Known From: ${questionnaire.known_from}` : ''}
${questionnaire.additional_info ? `- Additional Info: ${questionnaire.additional_info}` : ''}
      `.trim();

      // Get the Supabase URL for edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Call Grok API via Supabase edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/grok-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          model: 'grok-3-mini',
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant helping chatters understand and work with OnlyFans clients. You have access to comprehensive client profile data including their questionnaire responses and content preferences.

Your role is to:
1. Answer questions about the client's preferences, boundaries, and interests
2. Help chatters understand what content the client is comfortable creating
3. Provide insights to help personalize communication with the client
4. Highlight important boundaries (especially Hard Nos)
5. Suggest content ideas that align with their preferences

Always be respectful, professional, and prioritize the client's boundaries and comfort.

Here is the client's profile data:

${contextSummary}`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Grok API Error:', errorText);
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      
      setAiConversation(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('AI Error:', error);
      setAiConversation(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your question. Please try again.' 
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Layout title={`@${client.username}`}>
      <div className="space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        {/* Client Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start space-x-4">
            {client.avatar_url ? (
              <img
                src={client.avatar_url}
                alt={client.username}
                className="w-20 h-20 rounded-full border-2 border-blue-500"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                @{client.username}
              </h1>
              <div className="flex items-center mt-2 space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  client.is_active 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {client.is_active ? (
                    <>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </>
                  ) : (
                    'Inactive'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto justify-between" aria-label="Tabs">
              <div className="flex">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                        isActive
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </div>
              
              {/* Add Custom Button */}
              <button
                onClick={() => setIsAddCustomModalOpen(true)}
                className="flex items-center whitespace-nowrap py-4 px-6 border-b-2 border-transparent font-medium text-sm text-green-600 hover:text-green-700 hover:border-green-300 dark:text-green-400 dark:hover:text-green-300 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Custom
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'pipeline' && (
              <div className="space-y-6">
                {/* Status & Quick Actions */}
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Current Status */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Status</h3>
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                      {statusConfig.icon}
                      <span className="font-medium">{statusConfig.label}</span>
                    </div>
                    
                    {/* Status Change Buttons */}
                    <div className="mt-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Move to:</p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(STATUS_CONFIG) as ClientStatus[])
                          .filter(s => s !== clientStatus)
                          .map((status) => {
                            const config = STATUS_CONFIG[status];
                            return (
                              <button
                                key={status}
                                onClick={() => updateLeadStatus(client.id, status)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors hover:opacity-80 ${config.bgColor} ${config.color} border-current`}
                              >
                                {config.icon}
                                {config.label}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                    <div className="space-y-3">
                      {(client as any).first_name || (client as any).last_name ? (
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                          <User className="w-5 h-5 text-gray-400" />
                          <span>{(client as any).first_name} {(client as any).last_name}</span>
                        </div>
                      ) : null}
                      {(client as any).email && (
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                          <Mail className="w-5 h-5 text-gray-400" />
                          <a href={`mailto:${(client as any).email}`} className="hover:text-blue-600">{(client as any).email}</a>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                          <Phone className="w-5 h-5 text-gray-400" />
                          <a href={`tel:${client.phone}`} className="hover:text-blue-600">{client.phone}</a>
                        </div>
                      )}
                      {(client as any).lead_source && (
                        <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                          <Target className="w-5 h-5 text-gray-400" />
                          <span>Source: {(client as any).lead_source}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => {
                        const date = prompt('Enter call date/time (e.g., 2026-01-15 14:00):');
                        if (date) scheduleCall(date, 'Scheduled via quick action');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      Schedule Call
                    </button>
                    <button
                      onClick={() => markCallCompleted('Call completed via quick action')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      Mark Call Complete
                    </button>
                    <button
                      onClick={() => sendContract('Contract sent via quick action')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      Send Contract
                    </button>
                    <button
                      onClick={() => signContract('Contract signed via quick action')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Contract Signed
                    </button>
                  </div>
                </div>

                {/* Activity Timeline */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Timeline</h3>
                    <button
                      onClick={() => {
                        const note = prompt('Add a note:');
                        if (note) addLeadNote(note);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Note
                    </button>
                  </div>

                  {activitiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No activities recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map((activity, index) => (
                        <div key={activity.id} className="flex gap-4">
                          {/* Timeline line */}
                          <div className="flex flex-col items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getActivityColor(activity.activity_type)}`}>
                              {getActivityIcon(activity.activity_type)}
                            </div>
                            {index < activities.length - 1 && (
                              <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 mt-2" />
                            )}
                          </div>

                          {/* Activity content */}
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {getActivityLabel(activity.activity_type)}
                                </p>
                                {activity.notes && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {activity.notes}
                                  </p>
                                )}
                                {activity.scheduled_at && (
                                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                    Scheduled: {new Date(activity.scheduled_at).toLocaleString()}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {new Date(activity.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            {(activity as any).created_by_member && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                by {(activity as any).created_by_member.full_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Client Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Client ID</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">{client.id}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Username</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">@{client.username}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                      {client.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    This is a placeholder for client overview information. More details will be added here.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'questionnaire' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Client Questionnaire</h2>
                  
                  {/* Search Bar */}
                  {questionnaire && (
                    <div className="relative w-full max-w-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search questionnaire..."
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                
                {questionnaireLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : !questionnaire ? (
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No questionnaire data available for this client yet.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Helper function to check if content matches search */}
                    {(() => {
                      const search = searchQuery.toLowerCase().trim();
                      const matchesSearch = (text: string | null | undefined) => 
                        !search || (text && text.toLowerCase().includes(search));
                      
                      const hardNosVisible = !search || matchesSearch('hard') || matchesSearch('nos') || matchesSearch('boundaries') || matchesSearch('boundary') || matchesSearch(questionnaire.hard_nos);
                      const basicInfoVisible = !search || matchesSearch('basic') || matchesSearch('information') || matchesSearch('info') || matchesSearch('name') || 
                        matchesSearch('nickname') || matchesSearch('birthday') || matchesSearch('birth') || matchesSearch('gender') || 
                        matchesSearch('orientation') || matchesSearch('sexual') || matchesSearch('ethnicity') || matchesSearch('zodiac') || 
                        matchesSearch('relationship') || matchesSearch('children') || matchesSearch('status') ||
                        matchesSearch(questionnaire.public_name) || matchesSearch(questionnaire.public_nicknames) || 
                        matchesSearch(questionnaire.gender) || matchesSearch(questionnaire.sexual_orientation) || 
                        matchesSearch(questionnaire.ethnicity) || matchesSearch(questionnaire.zodiac_sign) || 
                        matchesSearch(questionnaire.relationship_status) || matchesSearch(questionnaire.has_children);
                      const physicalVisible = !search || matchesSearch('physical') || matchesSearch('attributes') || matchesSearch('height') || 
                        matchesSearch('weight') || matchesSearch('shoe') || matchesSearch('bra') || matchesSearch('size') ||
                        matchesSearch(questionnaire.height) || matchesSearch(questionnaire.weight) || 
                        matchesSearch(questionnaire.shoe_size) || matchesSearch(questionnaire.bra_size);
                      const languageVisible = !search || matchesSearch('language') || matchesSearch('languages') || matchesSearch('location') || 
                        matchesSearch('native') || matchesSearch('birth place') || matchesSearch('current location') ||
                        matchesSearch(questionnaire.native_language) || matchesSearch(questionnaire.other_languages) || 
                        matchesSearch(questionnaire.birth_place) || matchesSearch(questionnaire.current_location);
                      const interestsVisible = !search || matchesSearch('interests') || matchesSearch('lifestyle') || matchesSearch('hobbies') || 
                        matchesSearch('hobby') || matchesSearch('colors') || matchesSearch('color') || matchesSearch('pets') || 
                        matchesSearch('pet') || matchesSearch('car') || matchesSearch('date') || matchesSearch('dream') ||
                        matchesSearch(questionnaire.hobbies) || matchesSearch(questionnaire.favorite_colors) || 
                        matchesSearch(questionnaire.pets) || matchesSearch(questionnaire.current_car) || 
                        matchesSearch(questionnaire.dream_car) || matchesSearch(questionnaire.dream_date);
                      const routineVisible = !search || matchesSearch('routine') || matchesSearch('daily') || matchesSearch('weekday') || 
                        matchesSearch('weekend') || matchesSearch('schedule') ||
                        matchesSearch(questionnaire.weekday_routine) || matchesSearch(questionnaire.weekend_routine);
                      const travelVisible = !search || matchesSearch('travel') || matchesSearch('destination') || matchesSearch('trip') || 
                        matchesSearch('vacation') || matchesSearch('favorite place') ||
                        matchesSearch(questionnaire.favorite_place_traveled) || matchesSearch(questionnaire.dream_destination);
                      const careerVisible = !search || matchesSearch('education') || matchesSearch('career') || matchesSearch('college') || 
                        matchesSearch('school') || matchesSearch('job') || matchesSearch('work') ||
                        matchesSearch(questionnaire.college) || matchesSearch(questionnaire.other_career);
                      const personasVisible = !search || matchesSearch('persona') || matchesSearch('personas') || personas.some(p => matchesSearch(p));
                      const additionalVisible = !search || matchesSearch('additional') || matchesSearch('known') || matchesSearch('from') || 
                        matchesSearch('info') || matchesSearch('notes') ||
                        matchesSearch(questionnaire.known_from) || matchesSearch(questionnaire.additional_info);

                      return (
                        <>
                          {/* Hard Nos / Boundaries - Most Important */}
                          {hardNosVisible && (
                            <div className={`border-2 rounded-lg p-5 ${
                      questionnaire.hard_nos 
                        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
                        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <AlertCircle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                          questionnaire.hard_nos 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`} />
                        <div className="flex-1">
                          <h3 className={`text-base font-semibold mb-2 ${
                            questionnaire.hard_nos 
                              ? 'text-red-900 dark:text-red-200' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            ⚠️ Hard Nos / Boundaries
                          </h3>
                          <p className={`text-sm whitespace-pre-wrap ${
                            questionnaire.hard_nos 
                              ? 'text-red-800 dark:text-red-300' 
                              : 'text-gray-500 dark:text-gray-400 italic'
                          }`}>
                            {questionnaire.hard_nos || 'Not provided'}
                          </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Basic Information */}
                      {basicInfoVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Public Name</p>
                          <p className={`text-sm ${questionnaire.public_name ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.public_name || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Nicknames</p>
                          <p className={`text-sm ${questionnaire.public_nicknames ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.public_nicknames || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Birthday</p>
                          <p className={`text-sm ${questionnaire.public_birthday ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.public_birthday 
                              ? new Date(questionnaire.public_birthday).toLocaleDateString('en-US', { 
                                  month: 'long', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })
                              : 'Not provided'
                            }
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Gender</p>
                          <p className={`text-sm ${questionnaire.gender ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.gender || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Sexual Orientation</p>
                          <p className={`text-sm ${questionnaire.sexual_orientation ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.sexual_orientation || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Ethnicity</p>
                          <p className={`text-sm ${questionnaire.ethnicity ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.ethnicity || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Zodiac Sign</p>
                          <p className={`text-sm ${questionnaire.zodiac_sign ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.zodiac_sign || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Relationship Status</p>
                          <p className={`text-sm ${questionnaire.relationship_status ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.relationship_status || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Has Children</p>
                          <p className={`text-sm ${questionnaire.has_children ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.has_children || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* Physical Attributes */}
                      {physicalVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Physical Attributes</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Height</p>
                          <p className={`text-sm ${questionnaire.height ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.height || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Weight</p>
                          <p className={`text-sm ${questionnaire.weight ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.weight || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Shoe Size</p>
                          <p className={`text-sm ${questionnaire.shoe_size ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.shoe_size || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Bra Size</p>
                          <p className={`text-sm ${questionnaire.bra_size ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.bra_size || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* Languages & Location */}
                      {languageVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Languages & Location</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Native Language</p>
                          <p className={`text-sm ${questionnaire.native_language ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.native_language || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Other Languages</p>
                          <p className={`text-sm ${questionnaire.other_languages ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.other_languages || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Birth Place</p>
                          <p className={`text-sm ${questionnaire.birth_place ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.birth_place || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Current Location</p>
                          <p className={`text-sm ${questionnaire.current_location ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.current_location || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* Interests & Lifestyle */}
                      {interestsVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Interests & Lifestyle</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Hobbies</p>
                          <p className={`text-sm ${questionnaire.hobbies ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.hobbies || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Favorite Colors</p>
                          <p className={`text-sm ${questionnaire.favorite_colors ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.favorite_colors || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Pets</p>
                          <p className={`text-sm ${questionnaire.pets ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.pets || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Current Car</p>
                          <p className={`text-sm ${questionnaire.current_car ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.current_car || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Dream Car</p>
                          <p className={`text-sm ${questionnaire.dream_car ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.dream_car || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Dream Date</p>
                          <p className={`text-sm ${questionnaire.dream_date ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.dream_date || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* Daily Routines */}
                      {routineVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Daily Routines</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Weekday Routine</p>
                          <p className={`text-sm whitespace-pre-wrap ${questionnaire.weekday_routine ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.weekday_routine || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Weekend Routine</p>
                          <p className={`text-sm whitespace-pre-wrap ${questionnaire.weekend_routine ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.weekend_routine || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* Travel */}
                      {travelVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <MapPin className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Travel</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Favorite Place Traveled</p>
                          <p className={`text-sm ${questionnaire.favorite_place_traveled ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.favorite_place_traveled || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Dream Destination</p>
                          <p className={`text-sm ${questionnaire.dream_destination ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.dream_destination || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* Education & Career */}
                      {careerVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <Briefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Education & Career</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">College</p>
                          <p className={`text-sm ${questionnaire.college ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.college || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Other Career</p>
                          <p className={`text-sm ${questionnaire.other_career ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.other_career || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* Personas */}
                      {personasVisible && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Personas</h3>
                      </div>
                      {personas && personas.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {personas.map((persona, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1.5 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded-full text-sm font-medium"
                            >
                              {persona}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 italic">Not provided</p>
                      )}
                    </div>
                  )}

                    {/* Known From & Additional Info */}
                    {additionalVisible && (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="flex items-center space-x-2 mb-4">
                        <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Additional Information</h3>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Known From</p>
                          <p className={`text-sm ${questionnaire.known_from ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.known_from || 'Not provided'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Additional Info</p>
                          <p className={`text-sm whitespace-pre-wrap ${questionnaire.additional_info ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500 italic'}`}>
                            {questionnaire.additional_info || 'Not provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                      {/* No Results Message */}
                      {searchQuery && !hardNosVisible && !basicInfoVisible && !physicalVisible && 
                       !languageVisible && !interestsVisible && !routineVisible && !travelVisible && 
                       !careerVisible && !personasVisible && !additionalVisible && (
                        <div className="text-center py-12">
                          <Search className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-500 dark:text-gray-400">
                            No results found for "{searchQuery}"
                          </p>
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Clear search
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

            {activeTab === 'pricing' && (
              <div className="space-y-6">
                {/* Content Type Availability */}
                <div className="space-y-4">
                  {(() => {
                    // Map content types to display labels
                    const contentTypeLabels: Record<string, string> = {
                      'buttContent': 'Bare Butt',
                      'breastContent': 'Breast Content',
                      'visibleNipples': 'Visible Nipples',
                      'girlGirlContent': 'Girl/Girl Content',
                      'boyGirlContent': 'Boy/Girl Content',
                      'twerkVideos': 'Twerk Videos',
                      'fullNudityCensored': 'Full Nudity (Censored)',
                      'fullNudityUncensored': 'Full Nudity (Uncensored)',
                      'masturbation': 'Masturbation',
                      'fetishKink': 'Fetish Content',
                      'feet': 'Feet Content',
                      'dickRates': 'Dick Rates',
                      'customRequests': 'Custom Requests',
                    };

                    // Create a map of content details by type
                    const contentDetailsMap: Record<string, any> = {};
                    if (contentDetails) {
                      contentDetails.forEach((detail: any) => {
                        contentDetailsMap[detail.content_type] = detail;
                      });
                    }

                    // Separate available and unavailable content
                    const availableContent: Array<{key: string, label: string, priceMin: number, priceMax: number}> = [];
                    const unavailableContent: Array<{key: string, label: string}> = [];

                    Object.entries(contentTypeLabels).forEach(([key, label]) => {
                      const detail = contentDetailsMap[key];
                      if (detail && detail.enabled) {
                        availableContent.push({
                          key,
                          label,
                          priceMin: detail.price_min || 0,
                          priceMax: detail.price_max || 0
                        });
                      } else {
                        unavailableContent.push({ key, label });
                      }
                    });

                    return (
                      <>
                        {/* Available Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Available</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {availableContent.length > 0 ? (
                              availableContent.map((item) => (
                                <div
                                  key={item.key}
                                  className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center justify-between"
                                >
                                  <div className="flex items-center space-x-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                                      {item.label}
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                    {item.priceMin === item.priceMax 
                                      ? `$${item.priceMin}` 
                                      : item.priceMax > 0
                                      ? `$${item.priceMin}-$${item.priceMax}`
                                      : `$${item.priceMin}`
                                    }
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No available content types</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Unavailable Section */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Unavailable</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {unavailableContent.length > 0 ? (
                              unavailableContent.map((item) => (
                                <div
                                  key={item.key}
                                  className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-3"
                                >
                                  <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                                  <span className="text-sm font-medium text-red-900 dark:text-red-100">
                                    {item.label}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">All content types are available</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Custom Content Preferences */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Custom Content Preferences</h3>
                  
                  {preferencesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : preferences ? (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                      <div className="space-y-4">
                        {/* Minimum Pricing */}
                        <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Pricing</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">${preferences.minimum_pricing || 0}</span>
                          </div>
                        </div>

                        {/* Custom Preferences Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            { key: 'video_call', label: 'Video Call' },
                            { key: 'audio_call', label: 'Audio Call' },
                            { key: 'dick_rates', label: 'Dick Rates' },
                            { key: 'fan_signs', label: 'Fan Signs' },
                            { key: 'using_fans_name', label: "Using Fan's Name" },
                            { key: 'saying_specific_things', label: 'Saying Specific Things' },
                            { key: 'roleplaying', label: 'Roleplaying' },
                            { key: 'using_toys_props', label: 'Using Toys/Props' },
                            { key: 'specific_outfits', label: 'Specific Outfits' },
                            { key: 'full_nudity_censored', label: 'Full Nudity (Censored)' },
                            { key: 'full_nudity_uncensored', label: 'Full Nudity (Uncensored)' },
                            { key: 'masturbation', label: 'Masturbation' },
                            { key: 'anal_content', label: 'Anal Content' },
                            { key: 'feet_content', label: 'Feet Content' },
                          ].map((item) => {
                            const isEnabled = preferences[item.key as keyof typeof preferences];
                            return (
                              <div
                                key={item.key}
                                className={`rounded-lg p-3 flex items-center space-x-3 ${
                                  isEnabled
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                {isEnabled ? (
                                  <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                ) : (
                                  <X className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                                )}
                                <span className={`text-sm font-medium ${
                                  isEnabled
                                    ? 'text-blue-900 dark:text-blue-100'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {item.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="text-center">
                        <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 dark:text-gray-400">
                          No custom content preferences set
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'askAi' && (
              <div className="space-y-4 h-[600px] flex flex-col">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                    Ask AI about {client.username}
                  </h2>
                  {aiConversation.length > 0 && (
                    <button
                      onClick={() => setAiConversation([])}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    >
                      Clear conversation
                    </button>
                  )}
                </div>

                {/* AI Conversation */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
                  {aiConversation.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <Sparkles className="w-16 h-16 text-purple-300 dark:text-purple-700 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Ask me anything about this client
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-4">
                        I have access to their questionnaire data and content preferences. Ask questions like:
                      </p>
                      <div className="space-y-2 text-sm text-left max-w-md">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                          <p className="text-purple-900 dark:text-purple-200">"What are their content boundaries?"</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                          <p className="text-purple-900 dark:text-purple-200">"What kind of customs do they like?"</p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                          <p className="text-purple-900 dark:text-purple-200">"Tell me about their hobbies and interests"</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {aiConversation.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-4 ${
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))}
                      {aiLoading && (
                        <div className="flex justify-start">
                          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !aiLoading && handleAskAI()}
                    placeholder="Ask a question about this client..."
                    disabled={aiLoading || questionnaireLoading}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    onClick={handleAskAI}
                    disabled={!aiQuestion.trim() || aiLoading || questionnaireLoading}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Ask</span>
                  </button>
                </div>

                {/* Info Note */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>✨ Powered by Grok AI:</strong> This assistant has full access to the client's questionnaire, content preferences, boundaries, and persona information. 
                    Ask anything to help you better understand and work with this client!
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'fanNotes' && (
              <div className="flex gap-6 h-[calc(100vh-20rem)] min-h-[600px]">
                {/* Left Sidebar - Fan List */}
                <div className="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Fans with Notes</h3>
                      <button
                        onClick={() => setIsAddFanNoteModalOpen(true)}
                        className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="Add Fan Note"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={fanListSearchQuery}
                        onChange={(e) => setFanListSearchQuery(e.target.value)}
                        placeholder="Search fans..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                  </div>

                  {/* Fan List */}
                  <div className="flex-1 overflow-y-auto">
                    {fanNotesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (() => {
                      const groupedNotes = getNotesGroupedByFan();
                      const filteredFans = groupedNotes.filter(group => 
                        group.fanName.toLowerCase().includes(fanListSearchQuery.toLowerCase())
                      );

                      if (filteredFans.length === 0) {
                        return (
                          <div className="p-8 text-center">
                            <User className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {fanListSearchQuery ? 'No fans found' : 'No fan notes yet'}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {/* Individual Fans */}
                          {filteredFans.map((group) => (
                            <button
                              key={group.fanName}
                              onClick={() => setSelectedFanFilter(group.fanName)}
                              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                selectedFanFilter === group.fanName
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                                  <User className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold truncate ${
                                    selectedFanFilter === group.fanName
                                      ? 'text-blue-900 dark:text-blue-200'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {group.fanName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {group.totalNotes} {group.totalNotes === 1 ? 'note' : 'notes'}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Right Content Area - Notes Display */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Notes Display Area */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    {fanNotesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : fanNotes.length === 0 ? (
                      <div className="p-12 text-center">
                        <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">No fan notes yet</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                          Create your first fan note using the form above
                        </p>
                      </div>
                    ) : (
                      <>
                        {selectedFanFilter ? (
                          <>
                            {/* Display Header */}
                            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Notes for {selectedFanFilter}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {(() => {
                                  const groupedNotes = getNotesGroupedByFan();
                                  const filteredGroups = groupedNotes.filter(group => group.fanName === selectedFanFilter);
                                  const totalNotes = filteredGroups.reduce((acc, group) => acc + group.totalNotes, 0);
                                  return `${totalNotes} ${totalNotes === 1 ? 'note' : 'notes'}`;
                                })()}
                              </p>
                            </div>
                            
                            {/* Scrollable Notes Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {(() => {
                      const groupedNotes = getNotesGroupedByFan();
                      const filteredGroups = selectedFanFilter
                        ? groupedNotes.filter(group => group.fanName === selectedFanFilter)
                        : groupedNotes;

                      if (filteredGroups.length === 0) {
                        return (
                          <div className="p-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="text-center">
                              <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                              <p className="text-gray-600 dark:text-gray-400">No notes found for this fan</p>
                            </div>
                          </div>
                        );
                      }

                      return filteredGroups.map((group) => (
                        <div key={group.fanName} className="space-y-4">
                            {group.notes.map((note) => {
                              const noteReplies = fanReplies[note.id] || [];
                              const isExpanded = expandedFanNotes.has(note.id);
                              const canDelete = teamMember?.id === note.author_id;

                              return (
                                <div
                                  key={note.id}
                                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                  {/* Note Content */}
                                  <div className="p-3">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-start space-x-3 flex-1">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-2 mb-1">
                                            <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                              {note.author_name}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                              {formatTimestamp(note.created_at)}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                            {note.content}
                                          </p>
                                          {note.image_url && (
                                            <img 
                                              src={note.image_url} 
                                              alt="Note attachment" 
                                              className="mt-2 max-h-48 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90"
                                              onClick={() => window.open(note.image_url!, '_blank')}
                                            />
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Actions */}
                                      {canDelete && (
                                        <button
                                          onClick={() => handleDeleteFanNote(note.id)}
                                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-2"
                                          title="Delete note"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                      <button
                                        onClick={() => setShowFanReplyInput(showFanReplyInput === note.id ? null : note.id)}
                                        className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
                                      >
                                        <Reply className="w-3.5 h-3.5" />
                                        <span>Reply</span>
                                      </button>
                                      {noteReplies.length > 0 && (
                                        <button
                                          onClick={() => toggleFanNoteExpanded(note.id)}
                                          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
                                        >
                                          <MessageSquare className="w-3.5 h-3.5" />
                                          <span>{noteReplies.length} {noteReplies.length === 1 ? 'reply' : 'replies'}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reply Input */}
                                  {showFanReplyInput === note.id && (
                                    <div className="px-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
                                      <div className="flex space-x-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                          <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                          <textarea
                                            value={fanReplyContent[note.id] || ''}
                                            onChange={(e) => setFanReplyContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                                            placeholder="Write a reply..."
                                            rows={2}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                          />
                                          
                                          {/* Image Preview */}
                                          {fanReplyImagePreviews[note.id] && (
                                            <div className="relative inline-block">
                                              <img 
                                                src={fanReplyImagePreviews[note.id]!} 
                                                alt="Preview" 
                                                className="max-h-32 rounded border border-gray-300 dark:border-gray-600"
                                              />
                                              <button
                                                onClick={() => handleRemoveFanReplyImage(note.id)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                              >
                                                <X className="w-4 h-4" />
                                              </button>
                                            </div>
                                          )}

                                          <div className="flex justify-between items-center">
                                            <div>
                                              <input
                                                type="file"
                                                id={`fan-reply-image-upload-${note.id}`}
                                                accept="image/*"
                                                onChange={(e) => handleFanReplyImageChange(note.id, e)}
                                                className="hidden"
                                              />
                                              <label
                                                htmlFor={`fan-reply-image-upload-${note.id}`}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                              >
                                                <ImageIcon className="w-4 h-4 mr-2" />
                                                Add Image
                                              </label>
                                            </div>
                                            <div className="flex space-x-2">
                                              <button
                                                onClick={() => setShowFanReplyInput(null)}
                                                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() => handleCreateFanReply(note.id)}
                                                disabled={!fanReplyContent[note.id]?.trim() && !fanReplyImages[note.id]}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                                              >
                                                Reply
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Replies */}
                                  {isExpanded && noteReplies.length > 0 && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                      <div className="p-3 space-y-3">
                                        {noteReplies.map((reply) => {
                                          const canDeleteReply = teamMember?.id === reply.author_id;
                                          
                                          return (
                                            <div key={reply.id} className="flex space-x-3">
                                              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-1">
                                                      <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                                        {reply.author_name}
                                                      </span>
                                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {formatTimestamp(reply.created_at)}
                                                      </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                                      {reply.content}
                                                    </p>
                                                    {reply.image_url && (
                                                      <img 
                                                        src={reply.image_url} 
                                                        alt="Reply attachment" 
                                                        className="mt-2 max-h-32 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90"
                                                        onClick={() => window.open(reply.image_url!, '_blank')}
                                                      />
                                                    )}
                                                  </div>
                                                  {canDeleteReply && (
                                                    <button
                                                      onClick={() => handleDeleteFanReply(reply.id)}
                                                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-2"
                                                      title="Delete reply"
                                                    >
                                                      <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ));
                    })()}
                            </div>
                          </>
                        ) : (
                          <div className="flex-1 flex items-center justify-center p-12">
                            <div className="text-center">
                              <User className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                              <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">Select a fan to view notes</p>
                              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                                Choose a fan from the sidebar to see their notes
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Add Fan Note Modal */}
                <AddFanNoteModal
                  isOpen={isAddFanNoteModalOpen}
                  onClose={() => setIsAddFanNoteModalOpen(false)}
                  fanNames={fanNames}
                  onSubmit={handleCreateFanNote}
                />
              </div>
            )}

            {activeTab === 'voice' && (
              <IdiolectAnalysisView
                analysis={idiolectAnalysis}
                loading={idiolectLoading}
                clientUsername={client?.username || ''}
              />
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                {/* Create New Note */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Add a Note</h3>
                  <div className="space-y-3">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Write a note about this client..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                    />
                    
                    {/* Image Preview */}
                    {newNoteImagePreview && (
                      <div className="relative inline-block">
                        <img 
                          src={newNoteImagePreview} 
                          alt="Preview" 
                          className="max-h-40 rounded border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          onClick={handleRemoveNoteImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div>
                        <input
                          type="file"
                          id="note-image-upload"
                          accept="image/*"
                          onChange={handleNoteImageChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="note-image-upload"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Add Image
                        </label>
                      </div>
                      <button
                        onClick={handleCreateNote}
                        disabled={!newNoteContent.trim() && !newNoteImage}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium text-sm transition-colors"
                      >
                        Post Note
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes Layout */}
                {notesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="p-12 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400">No notes yet</p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Add the first note about this client above
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pinned Notes Column */}
                    <div className="lg:col-span-1">
                      <div className="sticky top-4">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <Pin className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-400" />
                          Pinned Notes
                        </h3>
                        <div className="space-y-3">
                          {(() => {
                            const pinnedNotes = notes.filter(note => note.is_pinned);
                            
                            if (pinnedNotes.length === 0) {
                              return (
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                                  <Pin className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                  <p className="text-xs text-gray-500 dark:text-gray-400">No pinned notes</p>
                                </div>
                              );
                            }
                            
                            return pinnedNotes.map((note) => {
                              const noteReplies = replies[note.id] || [];
                              const isExpanded = expandedNotes.has(note.id);
                              const canDelete = teamMember?.id === note.author_id;
                              
                              return (
                                <div
                                  key={note.id}
                                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 dark:border-yellow-600 rounded-lg transition-all"
                                >
                                  {/* Note Content */}
                                  <div className="p-3">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex items-start space-x-2 flex-1 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center flex-shrink-0">
                                          <User className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-1 mb-1">
                                            <span className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                                              {note.author_name}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                              {formatTimestamp(note.created_at)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words line-clamp-3">
                                            {note.content}
                                          </p>
                                          {note.image_url && (
                                            <img 
                                              src={note.image_url} 
                                              alt="Note attachment" 
                                              className="mt-2 max-h-32 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90"
                                              onClick={() => window.open(note.image_url!, '_blank')}
                                            />
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Actions */}
                                      <div className="flex items-center space-x-1 ml-2">
                                        <button
                                          onClick={() => handleTogglePin(note.id)}
                                          className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors text-yellow-600 dark:text-yellow-400"
                                          title="Unpin note"
                                        >
                                          <Pin className="w-3.5 h-3.5" />
                                        </button>
                                        {canDelete && (
                                          <button
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                            title="Delete note"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* Actions Footer */}
                                    <div className="flex items-center space-x-3 mt-2 pt-2 border-t border-yellow-200 dark:border-yellow-800">
                                      <button
                                        onClick={() => setShowReplyInput(showReplyInput === note.id ? null : note.id)}
                                        className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center space-x-1"
                                      >
                                        <Reply className="w-3 h-3" />
                                        <span>Reply</span>
                                      </button>
                                      {noteReplies.length > 0 && (
                                        <button
                                          onClick={() => toggleNoteExpanded(note.id)}
                                          className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 flex items-center space-x-1"
                                        >
                                          <MessageSquare className="w-3 h-3" />
                                          <span>{noteReplies.length}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Reply Input */}
                                  {showReplyInput === note.id && (
                                    <div className="px-3 pb-3 border-t border-yellow-200 dark:border-yellow-800 pt-3">
                                      <div className="space-y-2">
                                        <textarea
                                          value={replyContent[note.id] || ''}
                                          onChange={(e) => setReplyContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                                          placeholder="Write a reply..."
                                          rows={2}
                                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-yellow-500 focus:border-yellow-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                        />
                                        
                                        {/* Image Preview */}
                                        {replyImagePreviews[note.id] && (
                                          <div className="relative inline-block">
                                            <img 
                                              src={replyImagePreviews[note.id]!} 
                                              alt="Preview" 
                                              className="max-h-24 rounded border border-gray-300 dark:border-gray-600"
                                            />
                                            <button
                                              onClick={() => handleRemoveReplyImage(note.id)}
                                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </div>
                                        )}

                                        <div className="flex justify-between items-center">
                                          <div>
                                            <input
                                              type="file"
                                              id={`reply-image-upload-pinned-${note.id}`}
                                              accept="image/*"
                                              onChange={(e) => handleReplyImageChange(note.id, e)}
                                              className="hidden"
                                            />
                                            <label
                                              htmlFor={`reply-image-upload-pinned-${note.id}`}
                                              className="inline-flex items-center px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                            >
                                              <ImageIcon className="w-3 h-3 mr-1" />
                                              Image
                                            </label>
                                          </div>
                                          <div className="flex space-x-2">
                                            <button
                                              onClick={() => setShowReplyInput(null)}
                                              className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              onClick={() => handleCreateReply(note.id)}
                                              disabled={!replyContent[note.id]?.trim() && !replyImages[note.id]}
                                              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-xs font-medium transition-colors"
                                            >
                                              Reply
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Replies */}
                                  {isExpanded && noteReplies.length > 0 && (
                                    <div className="border-t border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
                                      <div className="p-3 space-y-2">
                                        {noteReplies.map((reply) => {
                                          const canDeleteReply = teamMember?.id === reply.author_id;
                                          
                                          return (
                                            <div key={reply.id} className="flex space-x-2">
                                              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                                <User className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                  <div className="flex-1">
                                                    <div className="flex items-center space-x-1 mb-0.5">
                                                      <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                                        {reply.author_name}
                                                      </span>
                                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {formatTimestamp(reply.created_at)}
                                                      </span>
                                                    </div>
                                                    <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                                      {reply.content}
                                                    </p>
                                                    {reply.image_url && (
                                                      <img 
                                                        src={reply.image_url} 
                                                        alt="Reply attachment" 
                                                        className="mt-1 max-h-24 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90"
                                                        onClick={() => window.open(reply.image_url!, '_blank')}
                                                      />
                                                    )}
                                                  </div>
                                                  {canDeleteReply && (
                                                    <button
                                                      onClick={() => handleDeleteReply(reply.id)}
                                                      className="p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-2"
                                                      title="Delete reply"
                                                    >
                                                      <Trash2 className="w-3 h-3" />
                                                    </button>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* All Notes Column */}
                    <div className="lg:col-span-2">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">All Notes</h3>
                      <div className="space-y-4">
                    {notes.map((note) => {
                      const noteReplies = replies[note.id] || [];
                      const isExpanded = expandedNotes.has(note.id);
                      const canDelete = teamMember?.id === note.author_id;

                      return (
                        <div
                          key={note.id}
                          className={`bg-white dark:bg-gray-800 border rounded-lg transition-all ${
                            note.is_pinned
                              ? 'border-yellow-400 dark:border-yellow-600 shadow-md'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          {/* Note Header */}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-semibold text-sm text-gray-900 dark:text-white">
                                      {note.author_name}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatTimestamp(note.created_at)}
                                    </span>
                                    {note.is_pinned && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                        <Pin className="w-3 h-3 mr-1" />
                                        Pinned
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                    {note.content}
                                  </p>
                                  {note.image_url && (
                                    <img 
                                      src={note.image_url} 
                                      alt="Note attachment" 
                                      className="mt-2 max-h-48 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90"
                                      onClick={() => window.open(note.image_url!, '_blank')}
                                    />
                                  )}
                                </div>
                              </div>
                              
                              {/* Actions */}
                              <div className="flex items-center space-x-1 ml-3">
                                <button
                                  onClick={() => handleTogglePin(note.id)}
                                  className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                                    note.is_pinned ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'
                                  }`}
                                  title={note.is_pinned ? 'Unpin note' : 'Pin note'}
                                >
                                  <Pin className="w-4 h-4" />
                                </button>
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteNote(note.id)}
                                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    title="Delete note"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center space-x-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <button
                                onClick={() => setShowReplyInput(showReplyInput === note.id ? null : note.id)}
                                className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
                              >
                                <Reply className="w-3.5 h-3.5" />
                                <span>Reply</span>
                              </button>
                              {noteReplies.length > 0 && (
                                <button
                                  onClick={() => toggleNoteExpanded(note.id)}
                                  className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center space-x-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>{noteReplies.length} {noteReplies.length === 1 ? 'reply' : 'replies'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Reply Input */}
                          {showReplyInput === note.id && (
                            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                              <div className="flex space-x-2">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </div>
                                <div className="flex-1 space-y-2">
                                  <textarea
                                    value={replyContent[note.id] || ''}
                                    onChange={(e) => setReplyContent(prev => ({ ...prev, [note.id]: e.target.value }))}
                                    placeholder="Write a reply..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
                                  />
                                  
                                  {/* Image Preview */}
                                  {replyImagePreviews[note.id] && (
                                    <div className="relative inline-block">
                                      <img 
                                        src={replyImagePreviews[note.id]!} 
                                        alt="Preview" 
                                        className="max-h-32 rounded border border-gray-300 dark:border-gray-600"
                                      />
                                      <button
                                        onClick={() => handleRemoveReplyImage(note.id)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center">
                                    <div>
                                      <input
                                        type="file"
                                        id={`reply-image-upload-${note.id}`}
                                        accept="image/*"
                                        onChange={(e) => handleReplyImageChange(note.id, e)}
                                        className="hidden"
                                      />
                                      <label
                                        htmlFor={`reply-image-upload-${note.id}`}
                                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                      >
                                        <ImageIcon className="w-4 h-4 mr-2" />
                                        Add Image
                                      </label>
                                    </div>
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => setShowReplyInput(null)}
                                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() => handleCreateReply(note.id)}
                                        disabled={!replyContent[note.id]?.trim() && !replyImages[note.id]}
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors"
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Replies */}
                          {isExpanded && noteReplies.length > 0 && (
                            <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                              <div className="p-4 space-y-3">
                                {noteReplies.map((reply) => {
                                  const canDeleteReply = teamMember?.id === reply.author_id;
                                  
                                  return (
                                    <div key={reply.id} className="flex space-x-3">
                                      <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                        <User className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                              <span className="font-semibold text-xs text-gray-900 dark:text-white">
                                                {reply.author_name}
                                              </span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {formatTimestamp(reply.created_at)}
                                              </span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                              {reply.content}
                                            </p>
                                            {reply.image_url && (
                                              <img 
                                                src={reply.image_url} 
                                                alt="Reply attachment" 
                                                className="mt-2 max-h-32 rounded border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90"
                                                onClick={() => window.open(reply.image_url!, '_blank')}
                                              />
                                            )}
                                          </div>
                                          {canDeleteReply && (
                                            <button
                                              onClick={() => handleDeleteReply(reply.id)}
                                              className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-2"
                                              title="Delete reply"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Add Custom Modal */}
      <AddCustomModal
        isOpen={isAddCustomModalOpen}
        onClose={() => setIsAddCustomModalOpen(false)}
        clientUsername={client.username}
        onSubmit={handleAddCustom}
      />
    </Layout>
  );
};

export default ClientProfilePage;

