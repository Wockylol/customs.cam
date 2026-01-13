import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  TenantAgency, 
  TenantCapability, 
  getTenantSlugFromSubdomain,
  isMainPlatformSite,
  isPlatformAdminSite
} from '../lib/tenant';
import { useAuth } from './AuthContext';

// ============================================================================
// TYPES
// ============================================================================

interface TenantContextType {
  // Current tenant
  tenant: TenantAgency | null;
  tenantSlug: string | null;
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Capability checking
  capabilities: TenantCapability[];
  hasCapability: (capability: TenantCapability) => boolean;
  
  // Site type detection
  isMainSite: boolean;
  isPlatformAdmin: boolean;
  
  // Actions
  refreshTenant: () => Promise<void>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER
// ============================================================================

interface TenantProviderProps {
  children: React.ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const { user, teamMember } = useAuth();
  
  const [tenant, setTenant] = useState<TenantAgency | null>(null);
  const [capabilities, setCapabilities] = useState<TenantCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Detect tenant slug from subdomain
  const tenantSlug = getTenantSlugFromSubdomain();
  const isMainSite = isMainPlatformSite();
  const isPlatformAdmin = isPlatformAdminSite();

  // Fetch tenant data
  const fetchTenant = useCallback(async () => {
    // Skip tenant fetch on platform admin pages
    if (isPlatformAdmin) {
      setLoading(false);
      return;
    }

    // If we have a slug from subdomain, fetch by slug (handled below)
    // If no slug but user is logged in with a tenant_id, use that
    // If no slug and no user, it's the main site - skip
    if (!tenantSlug) {
      // If user is logged in but teamMember hasn't loaded yet, keep loading
      if (user && !teamMember) {
        // Don't set loading to false - wait for teamMember to load
        return;
      }
      
      // In dev or without subdomains, if user is logged in and has a tenant_id, use that
      if (user && teamMember?.tenant_id) {
        // Fetch tenant by user's tenant_id instead
        try {
          const { data: tenantData, error: tenantError } = await supabase
            .from('tenant_agencies')
            .select('*')
            .eq('id', teamMember.tenant_id)
            .eq('is_active', true)
            .single();

          if (!tenantError && tenantData) {
            const tenant = tenantData as unknown as TenantAgency;
            setTenant(tenant);
            // Store slug for future use
            localStorage.setItem('dev_tenant_slug', tenant.slug);
            
            // Fetch capabilities
            const { data: capsData } = await supabase
              .from('tenant_capabilities')
              .select('capability')
              .eq('tenant_id', tenant.id)
              .eq('enabled', true);
            
            if (capsData) {
              setCapabilities(capsData.map((c: { capability: TenantCapability }) => c.capability));
            }
          } else if (tenantError) {
            console.error('Error fetching tenant:', tenantError);
          }
        } catch (err) {
          console.error('Error auto-detecting tenant:', err);
        }
      }
      setLoading(false);
      return;
    }

    // Fetch tenant by slug (from subdomain or dev localStorage)
    try {
      setLoading(true);
      setError(null);

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenant_agencies')
        .select('*')
        .eq('slug', tenantSlug)
        .eq('is_active', true)
        .single();

      if (tenantError) {
        if (tenantError.code === 'PGRST116') {
          // Tenant not found - clear stale localStorage
          localStorage.removeItem('dev_tenant_slug');
          setError('Agency not found');
        } else {
          throw tenantError;
        }
        setTenant(null);
        setCapabilities([]);
        setLoading(false);
        return;
      }

      const tenant = tenantData as unknown as TenantAgency;
      setTenant(tenant);

      // If user is logged in, verify they belong to this tenant
      if (user && teamMember) {
        if (teamMember.tenant_id !== tenant.id) {
          setError('You do not have access to this agency');
          // Don't clear tenant - just show error
        }
      }

      // Fetch capabilities for this tenant
      const { data: capsData, error: capsError } = await supabase
        .from('tenant_capabilities')
        .select('capability')
        .eq('tenant_id', tenant.id)
        .eq('enabled', true);

      if (capsError) {
        console.error('Error fetching capabilities:', capsError);
      } else {
        setCapabilities((capsData || []).map((c: { capability: TenantCapability }) => c.capability));
      }

    } catch (err: any) {
      console.error('Error fetching tenant:', err);
      setError(err.message || 'Failed to load agency');
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, user, teamMember, isMainSite, isPlatformAdmin]);

  // Fetch tenant on mount and when dependencies change
  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Capability check function
  const hasCapability = useCallback((capability: TenantCapability): boolean => {
    return capabilities.includes(capability);
  }, [capabilities]);

  // Refresh function
  const refreshTenant = useCallback(async () => {
    await fetchTenant();
  }, [fetchTenant]);

  const value: TenantContextType = {
    tenant,
    tenantSlug,
    loading,
    error,
    capabilities,
    hasCapability,
    isMainSite,
    isPlatformAdmin,
    refreshTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

// ============================================================================
// HOOK: useCapability
// ============================================================================

/**
 * Hook to check if the current tenant has a specific capability.
 * 
 * @example
 * const canUseSms = useCapability('sms_two_way');
 * if (canUseSms) { ... }
 */
export const useCapability = (capability: TenantCapability): boolean => {
  const { hasCapability, loading } = useTenant();
  
  // Return false while loading to prevent flash of content
  if (loading) return false;
  
  return hasCapability(capability);
};

/**
 * Hook to check multiple capabilities at once.
 * 
 * @example
 * const caps = useCapabilities(['sms_two_way', 'payroll']);
 * if (caps.sms_two_way) { ... }
 */
export const useCapabilities = <T extends TenantCapability>(capabilities: T[]): Record<T, boolean> => {
  const { hasCapability, loading } = useTenant();
  
  const result = {} as Record<T, boolean>;
  for (const cap of capabilities) {
    result[cap] = loading ? false : hasCapability(cap);
  }
  
  return result;
};

export default TenantContext;

