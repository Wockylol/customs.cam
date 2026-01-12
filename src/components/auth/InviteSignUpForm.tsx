import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface InviteSignUpFormProps {
  inviteToken: string;
  onSwitchToLogin: () => void;
  onInvalidInvite: () => void;
}

type InviteInfo = {
  tenant_name: string;
  tenant_slug: string;
  role: string;
  email: string | null;
  expires_at: string;
};

type SignUpFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
};

const InviteSignUpForm: React.FC<InviteSignUpFormProps> = ({ 
  inviteToken, 
  onSwitchToLogin,
  onInvalidInvite 
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate invite on mount
  useEffect(() => {
    const validateInvite = async () => {
      try {
        const { data, error } = await supabase.rpc('validate_invite_token', {
          p_token: inviteToken
        });

        if (error || !data || data.length === 0) {
          onInvalidInvite();
          return;
        }

        const invite = data[0];
        setInviteInfo(invite);
        
        // Pre-fill email if invite was for specific email
        if (invite.email) {
          setFormData(prev => ({ ...prev, email: invite.email }));
        }
      } catch (err) {
        console.error('Error validating invite:', err);
        onInvalidInvite();
      }
      setLoading(false);
    };

    validateInvite();
  }, [inviteToken, onInvalidInvite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setSubmitting(false);
      return;
    }

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }

      if (authData.user) {
        // Accept the invite and create team member
        const { error: acceptError } = await supabase.rpc('accept_tenant_invite', {
          p_user_id: authData.user.id,
          p_invite_token: inviteToken,
          p_user_email: formData.email,
          p_user_full_name: formData.fullName
        });

        if (acceptError) {
          console.error('Accept invite failed:', acceptError);
          setError('Failed to join agency: ' + acceptError.message);
          setSubmitting(false);
          return;
        }

        // Redirect to dashboard - ProtectedRoute will show pending approval screen
        navigate('/dashboard');
        return;
      }
    } catch (error: any) {
      setError('An unexpected error occurred: ' + error.message);
    }

    setSubmitting(false);
  };

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
    setFormData((prev: SignUpFormData) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      manager: 'Manager',
      chatter: 'Chatter'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-green-100 text-green-800',
      manager: 'bg-purple-100 text-purple-800',
      chatter: 'bg-blue-100 text-blue-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invite...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Welcome to {inviteInfo?.tenant_name}!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please check your email to verify your account, then sign in.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
            <div className="mb-6 p-4 bg-green-50 rounded-lg text-center">
              <p className="text-sm text-green-800">
                You've joined as a <strong>{getRoleLabel(inviteInfo?.role || '')}</strong>
              </p>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Join {inviteInfo?.tenant_name}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You've been invited to join the team
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
          {/* Invite Info Banner */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-green-600 mr-2" />
                <span className="font-medium text-gray-900">{inviteInfo?.tenant_name}</span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(inviteInfo?.role || '')}`}>
                {getRoleLabel(inviteInfo?.role || '')}
              </span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={!!inviteInfo?.email}
                  className={`appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow ${
                    inviteInfo?.email ? 'bg-gray-50 text-gray-500' : ''
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {inviteInfo?.email && (
                <p className="mt-1 text-xs text-gray-500">
                  This invite was sent to this email address
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  'Join Team'
                )}
              </button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm text-gray-600 hover:text-gray-500"
              >
                Already have an account? Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteSignUpForm;

