import React from 'react';
import { Clock, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabase';
import { TenantCapability, TenantRole, hasRolePermission, CAPABILITY_LABELS } from '../../lib/tenant';
import AuthContainer from './AuthContainer';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: TenantRole;
  requiredCapability?: TenantCapability;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, requiredCapability }) => {
  const { user, teamMember, loading } = useAuth();
  const { tenant, hasCapability, loading: tenantLoading, error: tenantError } = useTenant();

  if (loading || tenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Check for tenant errors (e.g., user accessing wrong tenant)
  if (tenantError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{tenantError}</p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthContainer />;
  }

  // Check capability requirement
  if (requiredCapability && !hasCapability(requiredCapability)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Not Available</h2>
          <p className="text-gray-600 mb-6">
            {CAPABILITY_LABELS[requiredCapability] || requiredCapability} is not enabled for your agency.
          </p>
          <p className="text-sm text-gray-500">
            Contact your administrator to enable this feature.
          </p>
        </div>
      </div>
    );
  }

  // Check if user has pending role and show pending approval screen
  if (teamMember?.role === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully! An administrator needs to approve your account before you can access the system.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You'll receive an email notification once your account is approved.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-3"
          >
            Check Status
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Check if user has pending role and show pending approval screen
  if (teamMember?.role === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
          <p className="text-gray-600 mb-6">
            Your account has been created successfully! An administrator needs to approve your account before you can access the system.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You'll receive an email notification once your account is approved.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mr-3"
          >
            Check Status
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
  // If no role is required, don't block on teamMember fetch
  if (!requiredRole) {
    return <>{children}</>; 
  }

  // Role-protected route: require teamMember to be present
  if (!teamMember) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your account...</p>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole) {
    const userRole = teamMember.role as TenantRole;
    
    if (!hasRolePermission(userRole, requiredRole)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;