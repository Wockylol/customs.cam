import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Loader2 } from 'lucide-react';

/**
 * Component that automatically redirects authenticated users to their tenant agency page.
 * If the user doesn't have a tenant, redirects to dashboard.
 */
const TenantRedirect: React.FC = () => {
  const { user, teamMember, loading: authLoading } = useAuth();
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [checkingTenant, setCheckingTenant] = useState(true);

  useEffect(() => {
    const fetchTenantSlug = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      // If no user or no team member, stop checking
      if (!user || !teamMember) {
        setCheckingTenant(false);
        return;
      }

      // If team member doesn't have a tenant_id, redirect to dashboard
      if (!teamMember.tenant_id) {
        setTenantSlug(null);
        setCheckingTenant(false);
        return;
      }

      try {
        // Fetch tenant slug from database
        const { data: tenantData, error } = await supabase
          .from('tenant_agencies')
          .select('slug')
          .eq('id', teamMember.tenant_id)
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching tenant slug:', error);
          setTenantSlug(null);
        } else if (tenantData) {
          setTenantSlug(tenantData.slug);
        } else {
          setTenantSlug(null);
        }
      } catch (err) {
        console.error('Unexpected error fetching tenant:', err);
        setTenantSlug(null);
      } finally {
        setCheckingTenant(false);
      }
    };

    fetchTenantSlug();
  }, [user, teamMember, authLoading]);

  // Show loading while checking
  if (authLoading || checkingTenant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to dashboard (ProtectedRoute will handle showing login)
  if (!user) {
    return <Navigate to="/dashboard" replace />;
  }

  // If user has a tenant slug, redirect to their agency page
  if (tenantSlug) {
    return <Navigate to={`/agency/${tenantSlug}`} replace />;
  }

  // Default: redirect to dashboard
  return <Navigate to="/dashboard" replace />;
};

export default TenantRedirect;

