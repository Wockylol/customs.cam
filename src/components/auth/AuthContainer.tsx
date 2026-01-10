import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoginForm from './LoginForm';
import AgencySignUpForm from './AgencySignUpForm';
import InviteSignUpForm from './InviteSignUpForm';
import { useTenant } from '../../contexts/TenantContext';
import { AlertCircle, Building2 } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'agency-signup' | 'invite-signup' | 'invalid-invite';

const AuthContainer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { tenant, isMainSite, loading: tenantLoading } = useTenant();
  const [view, setView] = useState<AuthView>('login');
  
  // Check for invite token in URL
  const inviteToken = searchParams.get('invite');

  // Determine initial view based on context
  useEffect(() => {
    if (inviteToken) {
      setView('invite-signup');
    }
  }, [inviteToken]);

  // Show loading while determining context
  if (tenantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle invite signup
  if (view === 'invite-signup' && inviteToken) {
    return (
      <InviteSignUpForm
        inviteToken={inviteToken}
        onSwitchToLogin={() => setView('login')}
        onInvalidInvite={() => setView('invalid-invite')}
      />
    );
  }

  // Invalid invite page
  if (view === 'invalid-invite') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Invalid or Expired Invite
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            This invite link is no longer valid. Please request a new invite from your team administrator.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 space-y-4">
            <button
              onClick={() => setView('login')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </button>
            {isMainSite && (
              <button
                onClick={() => setView('agency-signup')}
                className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Create Your Own Agency
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Agency signup (only on main site)
  if (view === 'agency-signup') {
    return (
      <AgencySignUpForm
        onSwitchToLogin={() => setView('login')}
        onSwitchToJoin={() => setView('signup')}
      />
    );
  }

  // Team member signup (on tenant subdomain)
  if (view === 'signup') {
    // If on a tenant subdomain, use regular signup with tenant context
    if (tenant) {
      return (
        <TenantSignUpForm
          tenant={tenant}
          onSwitchToLogin={() => setView('login')}
        />
      );
    }
    // If on main site, redirect to agency signup
    return (
      <AgencySignUpForm
        onSwitchToLogin={() => setView('login')}
        onSwitchToJoin={() => setView('signup')}
      />
    );
  }

  // Login view
  return (
    <LoginForm 
      onSwitchToSignUp={() => {
        if (isMainSite) {
          setView('agency-signup');
        } else {
          setView('signup');
        }
      }} 
    />
  );
};

// Tenant-specific signup form (requires admin approval)
interface TenantSignUpFormProps {
  tenant: { id: string; name: string; slug: string };
  onSwitchToLogin: () => void;
}

const TenantSignUpForm: React.FC<TenantSignUpFormProps> = ({ tenant, onSwitchToLogin }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-slate-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Join {tenant.name}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Request access to join the team
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-amber-800">
                  <strong>Invite Required</strong><br />
                  To join this agency, you need an invite link from a team administrator.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={onSwitchToLogin}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </button>
            <p className="text-center text-sm text-gray-500">
              Contact your team administrator to receive an invite link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;
