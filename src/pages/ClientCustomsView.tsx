import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, FileText, Settings, DollarSign, CheckCircle, X, User, MessageSquare, Layers } from 'lucide-react';
import Layout from '../components/layout/Layout';
import CustomTableRow from '../components/ui/CustomTableRow';
import PlatformBadge from '../components/ui/PlatformBadge';
import AddCustomModal from '../components/modals/AddCustomModal';
import ManageClientPlatformsModal from '../components/modals/ManageClientPlatformsModal';
import ThreadNotesSection from '../components/ui/ThreadNotesSection';
import { useCustomRequests } from '../hooks/useCustomRequests';
import { useClients } from '../hooks/useClients';
import { useClientPreferences } from '../hooks/useClientPreferences';
import { useClientPlatforms } from '../hooks/useClientPlatforms';
import { useThreadNotes } from '../hooks/useThreadNotes';

const ClientCustomsView: React.FC = () => {
  const { clientUsername } = useParams<{ clientUsername: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showThreadNotes, setShowThreadNotes] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [platformsModalOpen, setPlatformsModalOpen] = useState(false);
  const { customRequests, loading, error, addCustomRequest } = useCustomRequests();
  const { clients } = useClients();
  
  const client = clients.find(c => c.username === clientUsername);
  const { preferences, loading: preferencesLoading } = useClientPreferences(client?.id);
  const { clientPlatforms, loading: platformsLoading } = useClientPlatforms(client?.id);
  const { threadNotes, loading: notesLoading, error: notesError } = useThreadNotes(client?.id);
  
  const clientCustoms = customRequests.filter(c => c.clients?.username === clientUsername);

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
    return { error };
  };

  const contentTypes = [
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
  ];

  if (loading) {
    return (
      <Layout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading custom requests...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Error">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading data: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!client) {
    return (
      <Layout title="Client Not Found">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900">Client not found</h2>
          <p className="mt-2 text-gray-600">The requested client could not be found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Customs for @${client.username}`}>
      <div className="space-y-6">
        {/* Client Header with Preferences */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">@{client.username}</h1>
                <p className="text-blue-100">Client Dashboard & Preferences</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowThreadNotes(!showThreadNotes)}
                className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center text-white hover:bg-opacity-30 transition-colors"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {showThreadNotes ? 'Hide' : 'Show'} Chat Notes
              </button>
              <button
                onClick={() => setShowPlatforms(!showPlatforms)}
                className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center text-white hover:bg-opacity-30 transition-colors"
              >
                <Layers className="w-4 h-4 mr-2" />
                {showPlatforms ? 'Hide' : 'Show'} Platforms
              </button>
              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center text-white hover:bg-opacity-30 transition-colors"
              >
                <Settings className="w-4 h-4 mr-2" />
                {showPreferences ? 'Hide' : 'Show'} Preferences
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{clientCustoms.length}</div>
              <div className="text-blue-100 text-sm">Total Customs</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                ${preferences?.minimum_pricing?.toFixed(0) || '0'}
              </div>
              <div className="text-blue-100 text-sm">Minimum Price</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{threadNotes.length}</div>
              <div className="text-blue-100 text-sm">Chat Notes</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{clientPlatforms.length}</div>
              <div className="text-blue-100 text-sm">Platforms</div>
            </div>
          </div>
        </div>

        {/* Thread Notes Section */}
        {showThreadNotes && (
          <ThreadNotesSection
            threadNotes={threadNotes}
            loading={notesLoading}
            error={notesError}
            clientUsername={clientUsername || ''}
          />
        )}

        {/* Client Platforms Section */}
        {showPlatforms && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Layers className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Managed Platforms</h2>
                    <p className="text-gray-600 text-sm">Platforms where @{client.username} is managed</p>
                  </div>
                </div>
                <button
                  onClick={() => setPlatformsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {platformsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading platforms...</p>
                </div>
              ) : clientPlatforms.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No platforms assigned</h3>
                  <p className="text-gray-600">Add platforms to track where this client is managed.</p>
                  <button
                    onClick={() => setPlatformsModalOpen(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Platform
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientPlatforms.map((clientPlatform) => (
                    <div key={clientPlatform.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between mb-3">
                        <PlatformBadge 
                          platform={clientPlatform.platform!} 
                          size="md" 
                        />
                        {clientPlatform.account_name && (
                          <span className="text-xs bg-white text-gray-700 px-2 py-1 rounded-full border border-gray-200">
                            {clientPlatform.account_name}
                          </span>
                        )}
                      </div>
                      
                      {clientPlatform.username_on_platform && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            @{clientPlatform.username_on_platform}
                          </span>
                        </div>
                      )}
                      
                      {clientPlatform.profile_url && (
                        <div className="mb-2">
                          <a
                            href={clientPlatform.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View Profile
                          </a>
                        </div>
                      )}
                      
                      {clientPlatform.notes && (
                        <p className="text-sm text-gray-600 bg-white rounded p-2 border border-gray-200">
                          {clientPlatform.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Client Preferences Section */}
        {showPreferences && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Content Preferences</h2>
                  <p className="text-gray-600 text-sm">What @{client.username} is comfortable with</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {preferencesLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading preferences...</p>
                </div>
              ) : preferences ? (
                <>
                  {/* Minimum Pricing */}
                  <div className="bg-green-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center">
                      <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                      <div>
                        <div className="font-semibold text-green-900">Minimum Pricing</div>
                        <div className="text-2xl font-bold text-green-600">${preferences.minimum_pricing.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Content Types Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {contentTypes.map((contentType) => {
                      const isAccepted = preferences[contentType.key as keyof typeof preferences] as boolean;
                      
                      return (
                        <div
                          key={contentType.key}
                          className={`p-3 rounded-lg border-2 transition-colors ${
                            isAccepted
                              ? 'bg-green-50 border-green-200 text-green-800'
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{contentType.label}</span>
                            {isAccepted ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <X className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No preferences set</h3>
                  <p className="text-gray-600">This client hasn't configured their content preferences yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-lg text-gray-600">{clientCustoms.length} customs</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Custom
          </button>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fan Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lifetime Spend
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proposed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Length
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chat
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientCustoms.map((custom) => (
                <CustomTableRow key={custom.id} custom={custom} />
              ))}
            </tbody>
          </table>
          
          {clientCustoms.length === 0 && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No customs yet</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new custom request.</p>
              <div className="mt-6">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Custom
                </button>
              </div>
            </div>
          )}
        </div>

        <AddCustomModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          clientUsername={clientUsername || ''}
          onSubmit={handleAddCustom}
        />

        <ManageClientPlatformsModal
          isOpen={platformsModalOpen}
          onClose={() => setPlatformsModalOpen(false)}
          client={client}
        />
      </div>
    </Layout>
  );
};

export default ClientCustomsView;