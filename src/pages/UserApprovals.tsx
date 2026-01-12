import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, User, Mail, Calendar, AlertCircle, Loader2, Search, Edit, Trash2, MoreVertical, UserPlus, ChevronDown, Check } from 'lucide-react';
import Layout from '../components/layout/Layout';
import EditUserModal from '../components/modals/EditUserModal';
import DeleteUserModal from '../components/modals/DeleteUserModal';
import InviteTeamMemberModal from '../components/modals/InviteTeamMemberModal';
import { useTeamMembers } from '../hooks/useTeamMembers';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { StaggerContainer } from '../components/ui/StaggerContainer';
import { supabase } from '../lib/supabase';

interface TenantRole {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  hierarchy_level: number;
  is_system_default: boolean;
}

const UserApprovals: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [tenantRoles, setTenantRoles] = useState<TenantRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);
  const { teamMembers, loading: membersLoading, error: membersError, updateTeamMember, deleteTeamMember } = useTeamMembers();
  const { teamMember } = useAuth();
  const { tenant } = useTenant();

  // Fetch tenant roles
  useEffect(() => {
    if (!tenant?.id) return;

    const fetchRoles = async () => {
      try {
        const { data, error } = await supabase
          .from('tenant_roles')
          .select('*')
          .eq('tenant_id', tenant.id)
          .neq('slug', 'pending')
          .neq('slug', 'owner')
          .neq('slug', 'denied')
          .order('hierarchy_level', { ascending: false });

        if (error) throw error;
        setTenantRoles(data || []);
      } catch (err) {
        console.error('Error fetching roles:', err);
      }
    };

    fetchRoles();
  }, [tenant?.id]);

  // Filter for pending users
  const pendingUsers = teamMembers.filter(member => 
    member.role === 'pending'
  );
  const approvedUsers = teamMembers.filter(member => 
    member.role !== 'pending' &&
    (searchTerm === '' || 
     member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     member.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleApproveUser = async (userId: string, role: TenantRole) => {
    setLoading(true);
    setError(null);

    // Map the role slug to the legacy role field
    const legacyRole = (['admin', 'manager', 'chatter'].includes(role.slug) 
      ? role.slug 
      : 'chatter') as 'admin' | 'manager' | 'chatter';

    const { error } = await updateTeamMember(userId, {
      role: legacyRole,
      roleId: role.id
    });

    if (error) {
      setError(error);
    } else {
      // Clear the selected role for this user
      setSelectedRoles(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }

    setLoading(false);
  };

  const handleDenyUser = async (userId: string) => {
    setLoading(true);
    setError(null);

    // Delete the user's pending request
    const { error } = await deleteTeamMember(userId);

    if (error) {
      setError(error);
    }

    setLoading(false);
  };

  const getSelectedRole = (userId: string): TenantRole | null => {
    const roleId = selectedRoles[userId];
    if (!roleId) return null;
    return tenantRoles.find(r => r.id === roleId) || null;
  };

  const handleSelectRole = (userId: string, roleId: string) => {
    setSelectedRoles(prev => ({ ...prev, [userId]: roleId }));
    setRoleDropdownOpen(null);
  };

  const handleEditUser = async (userId: string, userData: {
    fullName: string;
    email: string;
    role: 'admin' | 'manager' | 'chatter' | 'pending';
    shift?: string;
  }) => {
    const { error } = await updateTeamMember(userId, {
      fullName: userData.fullName,
      email: userData.email,
      role: userData.role,
      shift: userData.shift
    });
    if (!error) {
      setEditModalOpen(false);
      setSelectedUser(null);
    }
    return { error };
  };

  const handleDeleteUser = async (userId: string) => {
    const { error } = await deleteTeamMember(userId);
    if (!error) {
      setDeleteModalOpen(false);
      setSelectedUser(null);
    }
    return { error };
  };

  const openEditModal = (user: any) => {
    setSelectedUser(user);
    setEditModalOpen(true);
    setDropdownOpen(null);
  };

  const openDeleteModal = (user: any) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
    setDropdownOpen(null);
  };

  const toggleDropdown = (userId: string) => {
    setDropdownOpen(dropdownOpen === userId ? null : userId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(null);
      setRoleDropdownOpen(null);
    };

    if (dropdownOpen || roleDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen, roleDropdownOpen]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (membersLoading) {
    return (
      <Layout title="User Approvals">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading user approvals...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (membersError) {
    return (
      <Layout title="User Approvals">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">Error loading team members: {membersError}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="User Approvals">
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">User Approvals</h1>
                <p className="text-blue-100 text-sm lg:text-base">Manage pending account approvals</p>
              </div>
            </div>
            {(teamMember?.role === 'admin' || teamMember?.role === 'owner') && (
              <button
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg backdrop-blur-sm transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span className="hidden sm:inline">Invite Team Member</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{pendingUsers.length}</div>
              <div className="text-blue-100 text-sm">Pending Approval</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{approvedUsers.length}</div>
              <div className="text-blue-100 text-sm">Approved Users</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{teamMembers.length}</div>
              <div className="text-blue-100 text-sm">Total Users</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Approvals */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} waiting for account approval
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">All caught up!</h3>
                <p className="text-gray-600 dark:text-gray-400">No users pending approval.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((member) => {
                  const selectedRole = getSelectedRole(member.id);
                  const availableRoles = teamMember?.role === 'manager' 
                    ? tenantRoles.filter(r => r.slug === 'chatter' || (!r.is_system_default && r.hierarchy_level < 50))
                    : tenantRoles;

                  return (
                    <div key={member.id} className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                            <User className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{member.full_name}</h3>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="w-4 h-4 mr-1" />
                              {member.email}
                            </div>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <Calendar className="w-3 h-3 mr-1" />
                              Registered {formatDate(member.created_at)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Role Selection Dropdown */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRoleDropdownOpen(roleDropdownOpen === member.id ? null : member.id);
                              }}
                              className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors min-w-[180px]"
                            >
                              {selectedRole ? (
                                <>
                                  <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: selectedRole.color }}
                                  />
                                  <span className="text-gray-900 dark:text-white font-medium">
                                    {selectedRole.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-gray-500 dark:text-gray-400">
                                  Select role...
                                </span>
                              )}
                              <ChevronDown className="w-4 h-4 ml-auto text-gray-400" />
                            </button>

                            {roleDropdownOpen === member.id && (
                              <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50 py-1 max-h-64 overflow-y-auto">
                                {availableRoles.length === 0 ? (
                                  <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                    No roles available
                                  </div>
                                ) : (
                                  availableRoles.map((role) => (
                                    <button
                                      key={role.id}
                                      onClick={() => handleSelectRole(member.id, role.id)}
                                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
                                    >
                                      <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: role.color }}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {role.name}
                                        </div>
                                        {role.description && (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {role.description}
                                          </div>
                                        )}
                                      </div>
                                      {selectedRoles[member.id] === role.id && (
                                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                      )}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>

                          {/* Approve Button */}
                          <button
                            onClick={() => selectedRole && handleApproveUser(member.id, selectedRole)}
                            disabled={loading || !selectedRole}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </button>
                          
                          {/* Deny Button */}
                          <button
                            onClick={() => handleDenyUser(member.id)}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                            Deny
                          </button>
                        </div>
                      </div>

                      {teamMember?.role === 'manager' && (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                          <p>As a manager, you can approve users for lower-hierarchy roles. Contact an admin to assign higher-level roles.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Approved Users */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Approved Users</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {approvedUsers.length} active team member{approvedUsers.length !== 1 ? 's' : ''}
                  {searchTerm && ` (filtered by "${searchTerm}")`}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar within Approved Users Section */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search approved users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-6">
            {approvedUsers.length === 0 ? (
              searchTerm ? (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No matching users found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No approved users match "{searchTerm}". Try adjusting your search.
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No approved users yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">Approved team members will appear here.</p>
                </div>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Shift
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {approvedUsers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-4">
                              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{member.full_name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{member.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.role === 'owner' ? 'bg-amber-100 text-amber-800' :
                            member.role === 'admin' ? 'bg-green-100 text-green-800' :
                            member.role === 'manager' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {member.shift ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                              {member.shift === '10-6' ? '10am - 6pm' :
                               member.shift === '6-2' ? '6pm - 2am' :
                               member.shift === '2-10' ? '2am - 10am' :
                               member.shift}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">No shift</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDropdown(member.id);
                              }}
                              className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                            
                            {dropdownOpen === member.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-600">
                                <div className="py-1">
                                  <button
                                    onClick={() => openEditModal(member)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                                  >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit User
                                  </button>
                                  <button
                                    onClick={() => openDeleteModal(member)}
                                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete User
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </StaggerContainer>

      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSubmit={handleEditUser}
      />

      <DeleteUserModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onConfirm={handleDeleteUser}
      />

      <InviteTeamMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </Layout>
  );
};

export default UserApprovals;