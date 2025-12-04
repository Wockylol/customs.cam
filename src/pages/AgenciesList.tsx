import React, { useState } from 'react';
import { Plus, Building2, AlertCircle, Loader2, Edit, Trash2, MoreVertical, Search, Users, ExternalLink } from 'lucide-react';
import Layout from '../components/layout/Layout';
import AddAgencyModal from '../components/modals/AddAgencyModal';
import EditAgencyModal from '../components/modals/EditAgencyModal';
import DeleteAgencyModal from '../components/modals/DeleteAgencyModal';
import { useAgencies } from '../hooks/useAgencies';
import { useClients } from '../hooks/useClients';

const AgenciesList: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedAgency, setSelectedAgency] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { agencies, loading, error, addAgency, updateAgency, deleteAgency } = useAgencies();
  const { clients } = useClients();

  const handleAddAgency = async (agencyData: {
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) => {
    const { error } = await addAgency(agencyData);
    if (!error) {
      setIsModalOpen(false);
    }
    return { error };
  };

  const handleEditAgency = async (agencyId: string, agencyData: {
    name: string;
    slug: string;
    description?: string;
    contactEmail?: string;
    contactPhone?: string;
  }) => {
    const { error } = await updateAgency(agencyId, agencyData);
    if (!error) {
      setEditModalOpen(false);
      setSelectedAgency(null);
    }
    return { error };
  };

  const handleDeleteAgency = async (agencyId: string) => {
    const { error } = await deleteAgency(agencyId);
    if (!error) {
      setDeleteModalOpen(false);
      setSelectedAgency(null);
    }
    return { error };
  };

  const openEditModal = (agency: any) => {
    setSelectedAgency(agency);
    setEditModalOpen(true);
    setDropdownOpen(null);
  };

  const openDeleteModal = (agency: any) => {
    setSelectedAgency(agency);
    setDeleteModalOpen(true);
    setDropdownOpen(null);
  };

  const toggleDropdown = (agencyId: string) => {
    setDropdownOpen(dropdownOpen === agencyId ? null : agencyId);
  };

  // Get client count for each agency
  const getClientCount = (agencyId: string) => {
    return clients.filter(client => client.agency_id === agencyId).length;
  };

  // Filter agencies based on search term
  const filteredAgencies = agencies.filter(agency =>
    agency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (agency.description && agency.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  if (loading) {
    return (
      <Layout title="Agencies">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading agencies...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Agencies">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading agencies: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agencies">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-gray-400 mr-2" />
            <span className="text-lg text-gray-600">{filteredAgencies.length} of {agencies.length} agencies</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Agency
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search agencies by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Agency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clients
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAgencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {agency.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            /{agency.slug}
                          </div>
                          {agency.description && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                              {agency.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{getClientCount(agency.id)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {agency.contact_email && (
                          <div className="text-xs">{agency.contact_email}</div>
                        )}
                        {agency.contact_phone && (
                          <div className="text-xs">{agency.contact_phone}</div>
                        )}
                        {!agency.contact_email && !agency.contact_phone && (
                          <div className="text-xs text-gray-400">No contact info</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agency.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {agency.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <a
                          href={`/agency/${agency.slug}`}
                          className="text-green-600 hover:text-green-800 inline-flex items-center"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Public View
                        </a>
                        
                        {/* Dropdown Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(agency.id);
                            }}
                            className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {dropdownOpen === agency.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                              <div className="py-1">
                                <button
                                  onClick={() => openEditModal(agency)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Agency
                                </button>
                                <button
                                  onClick={() => openDeleteModal(agency)}
                                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Agency
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {agencies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No agencies yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding your first agency.</p>
            <div className="mt-6">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Agency
              </button>
            </div>
          </div>
        ) : filteredAgencies.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No agencies found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your search terms.</p>
            <div className="mt-6">
              <button
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Clear Search
              </button>
            </div>
          </div>
        ) : null}

        <AddAgencyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddAgency}
        />

        <EditAgencyModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedAgency(null);
          }}
          agency={selectedAgency}
          onSubmit={handleEditAgency}
        />

        <DeleteAgencyModal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setSelectedAgency(null);
          }}
          agency={selectedAgency}
          onConfirm={handleDeleteAgency}
        />
      </div>
    </Layout>
  );
};

export default AgenciesList;