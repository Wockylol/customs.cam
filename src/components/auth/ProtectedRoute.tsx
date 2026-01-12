import React from 'react';
import { Clock, Lock, ShieldX } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabase';
import { TenantCapability, CAPABILITY_LABELS } from '../../lib/tenant';
import { PermissionCode } from '../../hooks/usePermissions';
import AuthContainer from './AuthContainer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  // Legacy role-based access (kept for backward compatibility)
  requiredRole?: 'owner' | 'admin' | 'manager' | 'chatter';
  // New permission-based access
  requiredPermission?: PermissionCode;
  requiredPermissions?: PermissionCode[];
  requireAny?: boolean; // If true, requires ANY of the permissions; if false, requires ALL
  // Capability requirement
  requiredCapability?: TenantCapability;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  requiredPermission,
  requiredPermissions,
  requireAny = true,
  requiredCapability 
}) => {
  const { 
    user, 
    teamMember, 
    loading, 
    permissionsLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isManagerOrAbove,
    isAdminOrAbove,
    isOwner,
  } = useAuth();
  const { tenant, hasCapability, loading: tenantLoading, error: tenantError } = useTenant();

  // Show loading while auth or permissions are loading
  if (loading || permissionsLoading || tenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Check for tenant errors (e.g., user accessing wrong tenant)
  if (tenantError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{tenantError}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Not logged in - show auth container
  if (!user) {
    return <AuthContainer />;
  }

  // Check capability requirement
  if (requiredCapability && !hasCapability(requiredCapability)) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Feature Not Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {CAPABILITY_LABELS[requiredCapability] || requiredCapability} is not enabled for your agency.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Contact your administrator to enable this feature.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has pending role and show pending approval screen
  if (teamMember?.role === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Pending Approval</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your account has been created successfully! An administrator needs to approve your account before you can access the system.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            You'll receive an email notification once your account is approved.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Check Status
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check permission-based access (new system)
  if (requiredPermission) {
    if (!hasPermission(requiredPermission)) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      );
    }
  }

  // Check multiple permissions
  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAccess = requireAny 
      ? hasAnyPermission(requiredPermissions)
      : hasAllPermissions(requiredPermissions);
    
    if (!hasAccess) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Contact your administrator if you believe this is an error.
            </p>
          </div>
        </div>
      );
    }
  }

  // Legacy role-based check (backward compatibility)
  if (requiredRole) {
    let hasRoleAccess = false;
    
    switch (requiredRole) {
      case 'owner':
        hasRoleAccess = isOwner;
        break;
      case 'admin':
        hasRoleAccess = isAdminOrAbove;
        break;
      case 'manager':
        hasRoleAccess = isManagerOrAbove;
        break;
      case 'chatter':
        hasRoleAccess = true; // Any authenticated user can access chatter-level pages
        break;
      default:
        hasRoleAccess = false;
    }

    // Wait for team member to load for role-protected routes
    if (!teamMember) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your account...</p>
          </div>
        </div>
      );
    }

    if (!hasRoleAccess) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldX className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
