import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Shield, 
  Settings, 
  Search, 
  MoreVertical,
  Check,
  X,
  ExternalLink,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { TenantCapability, CAPABILITY_LABELS, FIRST_PARTY_CAPABILITIES } from '../lib/tenant';
import Layout from '../components/layout/Layout';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    email: string;
    full_name: string;
  };
  team_member_count?: number;
  client_count?: number;
}

interface TenantCapabilityRow {
  tenant_id: string;
  capability: TenantCapability;
  enabled: boolean;
}

const PlatformAdminPage: React.FC = () => {
  const { isPlatformAdmin } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantCapabilities, setTenantCapabilities] = useState<TenantCapabilityRow[]>([]);
  const [expandedCapabilities, setExpandedCapabilities] = useState<string | null>(null);
  const [savingCapability, setSavingCapability] = useState(false);

  useEffect(() => {
    if (isPlatformAdmin) {
      fetchTenants();
    }
  }, [isPlatformAdmin]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenant_agencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (tenantsError) throw tenantsError;

      // Fetch capabilities for all tenants
      const { data: capsData, error: capsError } = await supabase
        .from('tenant_capabilities')
        .select('*');

      if (capsError) throw capsError;

      setTenants(tenantsData || []);
      setTenantCapabilities(capsData || []);
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const toggleTenantCapability = async (tenantId: string, capability: TenantCapability, enabled: boolean) => {
    setSavingCapability(true);
    try {
      if (enabled) {
        // Insert or update
        const { error } = await supabase
          .from('tenant_capabilities')
          .upsert({
            tenant_id: tenantId,
            capability,
            enabled: true
          }, {
            onConflict: 'tenant_id,capability'
          });
        
        if (error) throw error;
      } else {
        // Update to disabled
        const { error } = await supabase
          .from('tenant_capabilities')
          .update({ enabled: false })
          .eq('tenant_id', tenantId)
          .eq('capability', capability);
        
        if (error) throw error;
      }

      // Update local state
      setTenantCapabilities(prev => {
        const existing = prev.find(c => c.tenant_id === tenantId && c.capability === capability);
        if (existing) {
          return prev.map(c => 
            c.tenant_id === tenantId && c.capability === capability 
              ? { ...c, enabled } 
              : c
          );
        }
        return [...prev, { tenant_id: tenantId, capability, enabled }];
      });
    } catch (err: any) {
      console.error('Error toggling capability:', err);
      setError(err.message);
    } finally {
      setSavingCapability(false);
    }
  };

  const toggleTenantActive = async (tenantId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('tenant_agencies')
        .update({ is_active: isActive })
        .eq('id', tenantId);

      if (error) throw error;

      setTenants(prev => prev.map(t => 
        t.id === tenantId ? { ...t, is_active: isActive } : t
      ));
    } catch (err: any) {
      console.error('Error toggling tenant:', err);
      setError(err.message);
    }
  };

  const getTenantCapabilities = (tenantId: string): TenantCapability[] => {
    return tenantCapabilities
      .filter(c => c.tenant_id === tenantId && c.enabled)
      .map(c => c.capability);
  };

  const isFirstPartyTenant = (tenant: Tenant): boolean => {
    return (tenant.settings as any)?.is_first_party === true;
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isPlatformAdmin) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">You don't have permission to access the Platform Admin Console.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center mr-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Admin Console</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Manage all tenant agencies</p>
              </div>
            </div>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Agencies</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{tenants.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tenants.filter(t => t.is_active).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">First Party</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tenants.filter(t => isFirstPartyTenant(t)).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tenants.filter(t => {
                    const created = new Date(t.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search agencies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Tenants List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Agencies</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading agencies...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No agencies found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredTenants.map((tenant) => {
                const capabilities = getTenantCapabilities(tenant.id);
                const isExpanded = expandedCapabilities === tenant.id;
                const isFirstParty = isFirstPartyTenant(tenant);

                return (
                  <div key={tenant.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                          isFirstParty 
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                            : 'bg-gradient-to-br from-blue-400 to-indigo-500'
                        }`}>
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {tenant.name}
                            </h3>
                            {isFirstParty && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium rounded-full">
                                First Party
                              </span>
                            )}
                            {!tenant.is_active && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-medium rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                            {tenant.slug}.platform.com
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Created {new Date(tenant.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleTenantActive(tenant.id, !tenant.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            tenant.is_active
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                          }`}
                        >
                          {tenant.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>

                    {/* Capabilities */}
                    <div className="mt-4">
                      <button
                        onClick={() => setExpandedCapabilities(isExpanded ? null : tenant.id)}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <Settings className="w-4 h-4" />
                        <span>{capabilities.length} capabilities enabled</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {(Object.keys(CAPABILITY_LABELS) as TenantCapability[]).map((cap) => {
                            const isEnabled = capabilities.includes(cap);
                            return (
                              <button
                                key={cap}
                                onClick={() => toggleTenantCapability(tenant.id, cap, !isEnabled)}
                                disabled={savingCapability}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                                  isEnabled
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                } hover:opacity-80 disabled:opacity-50`}
                              >
                                {isEnabled ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                                <span>{CAPABILITY_LABELS[cap]}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PlatformAdminPage;

