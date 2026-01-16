import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  FileText, 
  Settings, 
  Shield,
  Lock,
  Unlock,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Percent,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Edit2,
  X,
  Share2,
  Key,
  DollarSign,
  Heart,
  Target,
  UserPlus
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useClients } from '../hooks/useClients';
import { useClientDetails } from '../hooks/useClientDetails';
import { useClientQuestionnaire } from '../hooks/useClientQuestionnaire';
import { useClientPreferences } from '../hooks/useClientPreferences';
import { useClientContract } from '../hooks/useClientContract';
import { useClientPin } from '../hooks/useClientPin';
import { StaggerContainer } from '../components/ui/StaggerContainer';
import { Database } from '../lib/database.types';

type ClientStatus = Database['public']['Enums']['client_status'];
type TabType = 'main' | 'contract' | 'details' | 'preferences' | 'status';

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  lead: { label: 'Lead', color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: <Target className="w-4 h-4" /> },
  prospect: { label: 'Prospect', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: <UserPlus className="w-4 h-4" /> },
  pending_contract: { label: 'Pending Contract', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/30', icon: <FileText className="w-4 h-4" /> },
  active: { label: 'Active', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: <CheckCircle className="w-4 h-4" /> },
  inactive: { label: 'Inactive', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/30', icon: <Clock className="w-4 h-4" /> },
  churned: { label: 'Churned', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: <AlertCircle className="w-4 h-4" /> },
};

const ClientManagementPage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('main');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Editing state
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [contractForm, setContractForm] = useState({
    contract_percentage: '',
    contract_term: '',
    contract_start_date: '',
    contract_resign_date: ''
  });

  // Hooks
  const { clients } = useClients();
  const { 
    personalInfo, 
    platformCredentials, 
    socialMediaAccounts,
    loading: detailsLoading 
  } = useClientDetails(clientId);
  const { 
    questionnaire, 
    personas, 
    contentDetails,
    loading: questionnaireLoading 
  } = useClientQuestionnaire(clientId);
  const { preferences, loading: preferencesLoading } = useClientPreferences(clientId);
  const { contract, loading: contractLoading, updateContract } = useClientContract(clientId);
  const { hasPin, loading: pinLoading } = useClientPin(clientId);

  // Find the client
  const client = clients.find(c => c.id === clientId);
  const clientStatus = client ? (((client as any).status as ClientStatus) || 'active') : 'active';
  const statusConfig = STATUS_CONFIG[clientStatus];

  // Initialize contract form when data loads
  useEffect(() => {
    if (contract) {
      setContractForm({
        contract_percentage: contract.contract_percentage?.toString() || '',
        contract_term: contract.contract_term || '',
        contract_start_date: contract.contract_start_date || '',
        contract_resign_date: contract.contract_resign_date || ''
      });
    }
  }, [contract]);

  useEffect(() => {
    if (!client && clients.length > 0) {
      navigate('/client-management');
    }
  }, [client, clients, navigate]);

  const handleSaveContract = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    try {
      const { error } = await updateContract({
        contract_percentage: contractForm.contract_percentage ? parseFloat(contractForm.contract_percentage) : null,
        contract_term: contractForm.contract_term || null,
        contract_start_date: contractForm.contract_start_date || null,
        contract_resign_date: contractForm.contract_resign_date || null
      });

      if (error) throw new Error(error);
      
      setSaveMessage({ type: 'success', text: 'Contract saved successfully!' });
      setIsEditingContract(false);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save contract' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'main' as TabType, name: 'Main', icon: User },
    { id: 'contract' as TabType, name: 'Contract', icon: FileText },
    { id: 'details' as TabType, name: 'Details', icon: Settings },
    { id: 'preferences' as TabType, name: 'Preferences', icon: Heart },
    { id: 'status' as TabType, name: 'Status', icon: Shield },
  ];

  if (!client) {
    return (
      <Layout title="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const loading = detailsLoading || questionnaireLoading || preferencesLoading || contractLoading || pinLoading;

  // Helper to render info row
  const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
    <div className="flex items-start py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-gray-900 dark:text-white mt-0.5">{value || <span className="text-gray-400">Not provided</span>}</div>
      </div>
    </div>
  );

  return (
    <Layout title="Client Management">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-2xl">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/client-management')}
              className="mr-4 p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center flex-1">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/20 flex items-center justify-center mr-4">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {(client as any).first_name || (client as any).last_name 
                    ? `${(client as any).first_name || ''} ${(client as any).last_name || ''}`.trim()
                    : `@${client.username}`
                  }
                </h1>
                <p className="text-indigo-100">@{client.username}</p>
              </div>
            </div>
            <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : (
              <>
                {/* Main Tab */}
                {activeTab === 'main' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <User className="w-5 h-5 mr-2 text-indigo-500" />
                        Personal Information
                      </h3>
                      <InfoRow 
                        icon={<User className="w-4 h-4 text-gray-500" />}
                        label="Legal Name"
                        value={personalInfo?.legal_name}
                      />
                      <InfoRow 
                        icon={<Mail className="w-4 h-4 text-gray-500" />}
                        label="Email"
                        value={personalInfo?.email}
                      />
                      <InfoRow 
                        icon={<Phone className="w-4 h-4 text-gray-500" />}
                        label="Phone"
                        value={personalInfo?.phone || client.phone}
                      />
                      <InfoRow 
                        icon={<Calendar className="w-4 h-4 text-gray-500" />}
                        label="Date of Birth"
                        value={personalInfo?.date_of_birth ? new Date(personalInfo.date_of_birth).toLocaleDateString() : null}
                      />
                      <InfoRow 
                        icon={<MapPin className="w-4 h-4 text-gray-500" />}
                        label="Address"
                        value={personalInfo?.address}
                      />
                    </div>

                    {/* Social Media Accounts */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Share2 className="w-5 h-5 mr-2 text-blue-500" />
                        Social Media
                      </h3>
                      {socialMediaAccounts.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No social media accounts added</p>
                      ) : (
                        <div className="space-y-3">
                          {socialMediaAccounts.map((account) => (
                            <div key={account.id} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{account.platform}</span>
                              <span className="text-sm text-gray-900 dark:text-white">@{account.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Platform Credentials */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 lg:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Key className="w-5 h-5 mr-2 text-pink-500" />
                        Platform Credentials
                      </h3>
                      {platformCredentials.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No platform credentials added</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {platformCredentials.map((cred) => (
                            <div key={cred.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{cred.platform}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</div>
                              <div className="text-sm text-gray-900 dark:text-white mb-2">{cred.email || 'Not set'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Password</div>
                              <div className="text-sm text-gray-900 dark:text-white font-mono">
                                {cred.password ? '••••••••' : 'Not set'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Contract Tab */}
                {activeTab === 'contract' && (
                  <div className="max-w-2xl">
                    {saveMessage && (
                      <div className={`mb-4 p-3 rounded-lg ${
                        saveMessage.type === 'success' 
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      }`}>
                        <div className="flex items-center">
                          {saveMessage.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                          )}
                          <span className={saveMessage.type === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}>
                            {saveMessage.text}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                          Contract Information
                        </h3>
                        {!isEditingContract ? (
                          <button
                            onClick={() => setIsEditingContract(true)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setIsEditingContract(false);
                              if (contract) {
                                setContractForm({
                                  contract_percentage: contract.contract_percentage?.toString() || '',
                                  contract_term: contract.contract_term || '',
                                  contract_start_date: contract.contract_start_date || '',
                                  contract_resign_date: contract.contract_resign_date || ''
                                });
                              }
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-700 dark:text-gray-400"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Contract Percentage (%)
                          </label>
                          {isEditingContract ? (
                            <div className="relative">
                              <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                value={contractForm.contract_percentage}
                                onChange={(e) => setContractForm({ ...contractForm, contract_percentage: e.target.value })}
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g., 20"
                                min="0"
                                max="100"
                                step="0.01"
                              />
                            </div>
                          ) : (
                            <div className="py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              {contract?.contract_percentage != null ? `${contract.contract_percentage}%` : <span className="text-gray-400">Not set</span>}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Contract Term
                          </label>
                          {isEditingContract ? (
                            <input
                              type="text"
                              value={contractForm.contract_term}
                              onChange={(e) => setContractForm({ ...contractForm, contract_term: e.target.value })}
                              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                              placeholder="e.g., 12 months, Annual, etc."
                            />
                          ) : (
                            <div className="py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              {contract?.contract_term || <span className="text-gray-400">Not set</span>}
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Start Date
                            </label>
                            {isEditingContract ? (
                              <input
                                type="date"
                                value={contractForm.contract_start_date}
                                onChange={(e) => setContractForm({ ...contractForm, contract_start_date: e.target.value })}
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <div className="py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                {contract?.contract_start_date ? new Date(contract.contract_start_date).toLocaleDateString() : <span className="text-gray-400">Not set</span>}
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Resign Date
                            </label>
                            {isEditingContract ? (
                              <input
                                type="date"
                                value={contractForm.contract_resign_date}
                                onChange={(e) => setContractForm({ ...contractForm, contract_resign_date: e.target.value })}
                                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                              />
                            ) : (
                              <div className="py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                {contract?.contract_resign_date ? new Date(contract.contract_resign_date).toLocaleDateString() : <span className="text-gray-400">Not set</span>}
                              </div>
                            )}
                          </div>
                        </div>

                        {isEditingContract && (
                          <button
                            onClick={handleSaveContract}
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Contract
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                  <div className="space-y-6">
                    {/* Identity & Public Info */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Identity & Public Info</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { label: 'Public Name', value: questionnaire?.public_name },
                          { label: 'Nicknames', value: questionnaire?.public_nicknames },
                          { label: 'Public Birthday', value: questionnaire?.public_birthday },
                          { label: 'Gender', value: questionnaire?.gender },
                          { label: 'Sexual Orientation', value: questionnaire?.sexual_orientation },
                          { label: 'Relationship Status', value: questionnaire?.relationship_status },
                        ].map((item, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</div>
                            <div className="text-sm text-gray-900 dark:text-white mt-1">{item.value || <span className="text-gray-400">Not provided</span>}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Physical Attributes */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Physical Attributes</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {[
                          { label: 'Ethnicity', value: questionnaire?.ethnicity },
                          { label: 'Height', value: questionnaire?.height },
                          { label: 'Weight', value: questionnaire?.weight },
                          { label: 'Shoe Size', value: questionnaire?.shoe_size },
                          { label: 'Bra Size', value: questionnaire?.bra_size },
                          { label: 'Zodiac Sign', value: questionnaire?.zodiac_sign },
                          { label: 'Favorite Colors', value: questionnaire?.favorite_colors },
                        ].map((item, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</div>
                            <div className="text-sm text-gray-900 dark:text-white mt-1">{item.value || <span className="text-gray-400">Not provided</span>}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Lifestyle & Interests */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Lifestyle & Interests</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                          { label: 'Native Language', value: questionnaire?.native_language },
                          { label: 'Other Languages', value: questionnaire?.other_languages },
                          { label: 'Birth Place', value: questionnaire?.birth_place },
                          { label: 'Current Location', value: questionnaire?.current_location },
                          { label: 'Hobbies', value: questionnaire?.hobbies },
                          { label: 'College', value: questionnaire?.college },
                          { label: 'Current Car', value: questionnaire?.current_car },
                          { label: 'Dream Car', value: questionnaire?.dream_car },
                          { label: 'Pets', value: questionnaire?.pets },
                          { label: 'Favorite Place Traveled', value: questionnaire?.favorite_place_traveled },
                          { label: 'Dream Destination', value: questionnaire?.dream_destination },
                          { label: 'Dream Date', value: questionnaire?.dream_date },
                          { label: 'Has Children', value: questionnaire?.has_children },
                          { label: 'Other Career', value: questionnaire?.other_career },
                        ].map((item, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</div>
                            <div className="text-sm text-gray-900 dark:text-white mt-1">{item.value || <span className="text-gray-400">Not provided</span>}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Boundaries & Notes */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Boundaries & Notes</h3>
                      <div className="space-y-4">
                        {[
                          { label: "Hard No's", value: questionnaire?.hard_nos },
                          { label: 'Known From', value: questionnaire?.known_from },
                          { label: 'Additional Info', value: questionnaire?.additional_info },
                        ].map((item, i) => (
                          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{item.label}</div>
                            <div className="text-sm text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{item.value || <span className="text-gray-400">Not provided</span>}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Personas */}
                    {personas && personas.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Personas</h3>
                        <div className="flex flex-wrap gap-2">
                          {personas.map((persona, i) => (
                            <span key={i} className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                              {persona}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    {/* Custom Preferences */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                        Minimum Pricing
                      </h3>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${preferences?.minimum_pricing || 0}
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Preferences</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                        ].map((pref) => {
                          const isEnabled = preferences?.[pref.key as keyof typeof preferences];
                          return (
                            <div 
                              key={pref.key}
                              className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                                isEnabled 
                                  ? 'bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
                                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <span className={`text-sm font-medium ${isEnabled ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                {pref.label}
                              </span>
                              {isEnabled ? (
                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <X className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Content Details with Pricing */}
                    {contentDetails && contentDetails.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Pricing</h3>
                        <div className="space-y-2">
                          {contentDetails.filter(cd => cd.enabled).map((detail, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{detail.content_type}</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                ${detail.price_min} - ${detail.price_max}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Status Tab */}
                {activeTab === 'status' && (
                  <div className="space-y-6">
                    {/* PIN Status */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        {hasPin ? (
                          <Lock className="w-5 h-5 mr-2 text-green-500" />
                        ) : (
                          <Unlock className="w-5 h-5 mr-2 text-gray-400" />
                        )}
                        PIN Security
                      </h3>
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                        hasPin 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {hasPin ? (
                          <>
                            <Lock className="w-4 h-4" />
                            PIN is set and active
                          </>
                        ) : (
                          <>
                            <Unlock className="w-4 h-4" />
                            No PIN configured
                          </>
                        )}
                      </div>
                    </div>

                    {/* Account Status */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Status</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</div>
                          <span className={`inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active</div>
                          <span className={`inline-flex items-center gap-1 mt-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                            client.is_active 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {client.is_active ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Created</div>
                          <div className="text-sm text-gray-900 dark:text-white mt-2">
                            {new Date(client.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Last Updated</div>
                          <div className="text-sm text-gray-900 dark:text-white mt-2">
                            {new Date(client.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Completion Metrics */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Completion</h3>
                      <div className="space-y-4">
                        {(() => {
                          // Personal info fields (excluding system fields)
                          const personalInfoFields = ['legal_name', 'email', 'phone', 'date_of_birth', 'address'];
                          const personalInfoFilled = personalInfo 
                            ? personalInfoFields.filter(f => (personalInfo as any)[f]).length 
                            : 0;

                          // Questionnaire fields (excluding system fields)
                          const questionnaireFields = [
                            'public_name', 'public_nicknames', 'public_birthday', 'gender',
                            'native_language', 'other_languages', 'sexual_orientation', 'ethnicity',
                            'height', 'weight', 'shoe_size', 'bra_size', 'zodiac_sign', 'favorite_colors',
                            'birth_place', 'current_location', 'hobbies', 'college', 'current_car', 'dream_car',
                            'pets', 'favorite_place_traveled', 'dream_destination', 'relationship_status',
                            'dream_date', 'has_children', 'other_career', 'known_from', 'additional_info', 'hard_nos'
                          ];
                          const questionnaireFilled = questionnaire 
                            ? questionnaireFields.filter(f => (questionnaire as any)[f]).length 
                            : 0;

                          return [
                            { label: 'Personal Info', filled: personalInfoFilled, total: personalInfoFields.length },
                            { label: 'Questionnaire', filled: questionnaireFilled, total: questionnaireFields.length },
                            { label: 'Preferences', filled: preferences ? 1 : 0, total: 1 },
                            { label: 'Personas', filled: personas?.length ? 1 : 0, total: 1 },
                            { label: 'Social Media', filled: socialMediaAccounts.length ? 1 : 0, total: 1 },
                            { label: 'Platform Credentials', filled: platformCredentials.length ? 1 : 0, total: 1 },
                          ];
                        })().map((metric, i) => {
                          const percentage = Math.min(100, Math.round((metric.filled / metric.total) * 100));
                          return (
                            <div key={i}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{metric.label}</span>
                                <span className="text-gray-500 dark:text-gray-400">{percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    percentage >= 80 ? 'bg-green-500' :
                                    percentage >= 50 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </StaggerContainer>
    </Layout>
  );
};

export default ClientManagementPage;

