import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Link2, 
  Copy, 
  Check, 
  ExternalLink,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
  ArrowRight,
  Target,
  UserPlus,
  PhoneCall,
  ClipboardCheck,
  Sparkles
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useLeads, LeadWithDetails } from '../hooks/useLeads';
import { usePlatforms } from '../hooks/usePlatforms';
import { StaggerContainer } from '../components/ui/StaggerContainer';
import ClientAvatar from '../components/ui/ClientAvatar';
import { Database } from '../lib/database.types';

type ClientStatus = Database['public']['Enums']['client_status'];

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const STATUS_CONFIG: Record<ClientStatus, StatusConfig> = {
  lead: {
    label: 'Lead',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
    icon: <Target className="w-4 h-4" />,
  },
  prospect: {
    label: 'Prospect',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
    icon: <UserPlus className="w-4 h-4" />,
  },
  pending_contract: {
    label: 'Pending Contract',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
    icon: <FileText className="w-4 h-4" />,
  },
  active: {
    label: 'Active',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-700',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  inactive: {
    label: 'Inactive',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    borderColor: 'border-gray-300 dark:border-gray-700',
    icon: <Clock className="w-4 h-4" />,
  },
  churned: {
    label: 'Churned',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    borderColor: 'border-red-300 dark:border-red-700',
    icon: <AlertCircle className="w-4 h-4" />,
  },
};

const PIPELINE_STAGES: ClientStatus[] = ['lead', 'prospect', 'pending_contract', 'active'];

const LeadsTrackerPage: React.FC = () => {
  const navigate = useNavigate();
  const { leads, loading, error, createLead, updateLeadStatus, generateIntakeLink, getLeadCounts } = useLeads();
  const { platforms } = usePlatforms();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  
  // New lead form state
  const [newLeadData, setNewLeadData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    leadSource: '',
  });
  const [addingLead, setAddingLead] = useState(false);

  const counts = getLeadCounts();

  const filteredLeads = useMemo(() => {
    let filtered = leads;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.username?.toLowerCase().includes(term) ||
        lead.first_name?.toLowerCase().includes(term) ||
        lead.last_name?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term) ||
        lead.phone?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [leads, statusFilter, searchTerm]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLead(true);
    
    const { error } = await createLead(newLeadData);
    
    if (!error) {
      setShowAddModal(false);
      setNewLeadData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        leadSource: '',
      });
    }
    
    setAddingLead(false);
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    const { link, error } = await generateIntakeLink();
    
    if (!error && link) {
      setGeneratedLink(link);
    }
    
    setGeneratingLink(false);
  };

  const copyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: ClientStatus) => {
    await updateLeadStatus(leadId, newStatus);
    setDropdownOpen(null);
  };

  const getDisplayName = (lead: LeadWithDetails) => {
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    }
    return lead.username;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Layout title="Lead Tracker">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading leads...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Lead Tracker">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">Error loading leads: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lead Tracker">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lead Tracker</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your prospect pipeline
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowLinkModal(true);
                handleGenerateLink();
              }}
              className="inline-flex items-center px-4 py-2 border border-purple-300 dark:border-purple-600 text-sm font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Generate Intake Link
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Pipeline Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PIPELINE_STAGES.map((stage, index) => {
            const config = STATUS_CONFIG[stage];
            const count = counts[stage];
            
            return (
              <button
                key={stage}
                onClick={() => setStatusFilter(statusFilter === stage ? 'all' : stage)}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  statusFilter === stage
                    ? `${config.borderColor} ${config.bgColor}`
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`${config.color}`}>
                    {config.icon}
                  </span>
                  {index < PIPELINE_STAGES.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-400 absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-gray-100 dark:bg-gray-700 rounded-full" />
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Status Filter Pills */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                All ({counts.all})
              </button>
              {(['inactive', 'churned'] as ClientStatus[]).map((status) => {
                const config = STATUS_CONFIG[status];
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      statusFilter === status
                        ? `${config.bgColor} ${config.color}`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {config.label} ({counts[status]})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Interested Platforms
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeads.map((lead) => {
                  const statusConfig = STATUS_CONFIG[lead.status || 'lead'];
                  
                  return (
                    <tr 
                      key={lead.id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                      onClick={() => navigate(`/client-profile/${lead.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ClientAvatar client={lead} size="md" />
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {getDisplayName(lead)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              @{lead.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="w-3 h-3 mr-2" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Phone className="w-3 h-3 mr-2" />
                              {lead.phone}
                            </div>
                          )}
                          {!lead.email && !lead.phone && (
                            <span className="text-sm text-gray-400">No contact info</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {lead.platform_interests?.slice(0, 4).map((interest) => (
                            <span
                              key={interest.id}
                              className="inline-flex items-center text-lg"
                              title={interest.platform?.name}
                            >
                              {interest.platform?.icon || interest.platform?.name?.charAt(0)}
                            </span>
                          ))}
                          {(lead.platform_interests?.length || 0) > 4 && (
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                              +{lead.platform_interests!.length - 4}
                            </span>
                          )}
                          {!lead.platform_interests?.length && (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to={`/client-profile/${lead.id}`}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          
                          {/* Status change dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDropdownOpen(dropdownOpen === lead.id ? null : lead.id);
                              }}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            
                            {dropdownOpen === lead.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
                                <div className="py-1">
                                  <p className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 font-medium uppercase">
                                    Change Status
                                  </p>
                                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusChange(lead.id, status as ClientStatus)}
                                      className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                        lead.status === status ? 'bg-gray-50 dark:bg-gray-700' : ''
                                      }`}
                                    >
                                      <span className={`${config.color} mr-2`}>{config.icon}</span>
                                      <span className={config.color}>{config.label}</span>
                                      {lead.status === status && (
                                        <Check className="w-4 h-4 ml-auto text-green-500" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No leads found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding your first lead.'}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lead
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Add Lead Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowAddModal(false)} />
              
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Add New Lead
                </h3>
                
                <form onSubmit={handleAddLead} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={newLeadData.firstName}
                        onChange={(e) => setNewLeadData(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={newLeadData.lastName}
                        onChange={(e) => setNewLeadData(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newLeadData.email}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newLeadData.phone}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Lead Source
                    </label>
                    <input
                      type="text"
                      value={newLeadData.leadSource}
                      onChange={(e) => setNewLeadData(prev => ({ ...prev, leadSource: e.target.value }))}
                      placeholder="e.g., Instagram, Referral, Website"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingLead}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {addingLead ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Add Lead'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Generate Link Modal */}
        {showLinkModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowLinkModal(false)} />
              
              <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Link2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Intake Link Generated
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Share this link with prospects to have them fill out the intake form.
                  </p>
                  
                  {generatingLink ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                    </div>
                  ) : generatedLink ? (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedLink}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                        />
                        <button
                          onClick={copyLink}
                          className={`p-2 rounded-lg transition-colors ${
                            copiedLink
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                          }`}
                        >
                          {copiedLink ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-red-500 text-sm">Failed to generate link. Please try again.</p>
                  )}
                  
                  <button
                    onClick={() => setShowLinkModal(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </StaggerContainer>
    </Layout>
  );
};

export default LeadsTrackerPage;

