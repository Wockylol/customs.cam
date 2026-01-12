import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoginForm from './LoginForm';
import AgencySignUpForm from './AgencySignUpForm';
import InviteSignUpForm from './InviteSignUpForm';
import CodeSignUpForm from './CodeSignUpForm';
import { useTenant } from '../../contexts/TenantContext';
import { AlertCircle, Building2, KeyRound, Link2 } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'agency-signup' | 'invite-signup' | 'code-signup' | 'invalid-invite' | 'invalid-code';

const AuthContainer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { tenant, isMainSite, loading: tenantLoading } = useTenant();
  const [view, setView] = useState<AuthView>('login');
  
  // Check for invite token or code in URL
  const inviteToken = searchParams.get('invite');
  const registrationCode = searchParams.get('code');

  // Determine initial view based on context
  useEffect(() => {
    if (inviteToken) {
      setView('invite-signup');
    } else if (registrationCode) {
      setView('code-signup');
    }
  }, [inviteToken, registrationCode]);

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

  // Handle code signup
  if (view === 'code-signup') {
    return (
      <CodeSignUpForm
        initialCode={registrationCode || ''}
        onSwitchToLogin={() => setView('login')}
        onInvalidCode={() => setView('invalid-code')}
        onBack={() => setView('signup')}
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
            <button
              onClick={() => setView('code-signup')}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Have a Registration Code?
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

  // Invalid code page
  if (view === 'invalid-code') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Invalid Registration Code
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            This registration code is invalid or has been disabled. Please contact your team administrator for a valid code.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 space-y-4">
            <button
              onClick={() => setView('code-signup')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Try Different Code
            </button>
            <button
              onClick={() => setView('login')}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Go to Sign In
            </button>
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
          onSwitchToCodeSignup={() => setView('code-signup')}
        />
      );
    }
    // If on main site, show signup options
    return (
      <SignUpOptions
        onSwitchToLogin={() => setView('login')}
        onSwitchToAgencySignup={() => setView('agency-signup')}
        onSwitchToCodeSignup={() => setView('code-signup')}
      />
    );
  }

  // Login view
  return (
    <LoginForm 
      onSwitchToSignUp={() => {
        if (isMainSite) {
          setView('signup');
        } else {
          setView('signup');
        }
      }} 
    />
  );
};

// Sign up options screen (for main site)
interface SignUpOptionsProps {
  onSwitchToLogin: () => void;
  onSwitchToAgencySignup: () => void;
  onSwitchToCodeSignup: () => void;
}

const SignUpOptions: React.FC<SignUpOptionsProps> = ({ 
  onSwitchToLogin, 
  onSwitchToAgencySignup,
  onSwitchToCodeSignup
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Get Started
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose how you'd like to sign up
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 space-y-4">
          {/* Join with Code */}
          <button
            onClick={onSwitchToCodeSignup}
            className="w-full flex items-center justify-center gap-3 py-4 px-4 border-2 border-indigo-200 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 transition-all group"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <KeyRound className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Join with Code</div>
              <div className="text-xs text-indigo-500">I have a registration code from my team</div>
            </div>
          </button>

          {/* Create Agency */}
          <button
            onClick={onSwitchToAgencySignup}
            className="w-full flex items-center justify-center gap-3 py-4 px-4 border-2 border-green-200 rounded-xl text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all group"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Create Agency</div>
              <div className="text-xs text-green-500">Start a new agency account</div>
            </div>
          </button>

          {/* Have invite link? */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Link2 className="w-4 h-4" />
              <span>Have an invite link? Just click it to sign up!</span>
            </div>
          </div>

          {/* Login */}
          <div className="text-center pt-2">
            <button
              onClick={onSwitchToLogin}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Already have an account? <span className="font-medium text-blue-600 hover:text-blue-500">Sign in</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tenant-specific signup form (requires invite or code)
interface TenantSignUpFormProps {
  tenant: { id: string; name: string; slug: string };
  onSwitchToLogin: () => void;
  onSwitchToCodeSignup: () => void;
}

const TenantSignUpForm: React.FC<TenantSignUpFormProps> = ({ tenant, onSwitchToLogin, onSwitchToCodeSignup }) => {
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
                  <strong>Invite or Code Required</strong><br />
                  To join this agency, you need an invite link or registration code from a team administrator.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Join with Code */}
            <button
              onClick={onSwitchToCodeSignup}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              I Have a Registration Code
            </button>

            <button
              onClick={onSwitchToLogin}
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Go to Sign In
            </button>
            
            <p className="text-center text-sm text-gray-500">
              Contact your team administrator to receive an invite link or registration code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;
