import React, { useState, useEffect } from 'react';
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle, Building2, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CodeSignUpFormProps {
  initialCode?: string;
  onSwitchToLogin: () => void;
  onInvalidCode: () => void;
  onBack: () => void;
}

type TenantInfo = {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
};

type SignUpFormData = {
  code: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
};

const CodeSignUpForm: React.FC<CodeSignUpFormProps> = ({ 
  initialCode = '',
  onSwitchToLogin,
  onInvalidCode,
  onBack
}) => {
  const [formData, setFormData] = useState<SignUpFormData>({
    code: initialCode,
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [codeValidated, setCodeValidated] = useState(false);

  // Validate code when provided initially
  useEffect(() => {
    if (initialCode) {
      validateCode(initialCode);
    }
  }, [initialCode]);

  const validateCode = async (code: string) => {
    if (!code || code.length < 6) return;
    
    setValidating(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('validate_registration_code', {
        p_code: code.toUpperCase()
      });

      if (error || !data || data.length === 0) {
        setTenantInfo(null);
        setCodeValidated(false);
        if (initialCode) {
          onInvalidCode();
        }
        return;
      }

      const tenant = data[0];
      setTenantInfo(tenant);
      setCodeValidated(true);
    } catch (err) {
      console.error('Error validating code:', err);
      setTenantInfo(null);
      setCodeValidated(false);
    }
    setValidating(false);
  };

  const handleCodeChange = (value: string) => {
    const upperValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, code: upperValue }));
    setTenantInfo(null);
    setCodeValidated(false);
    setError(null);
  };

  const handleCodeBlur = () => {
    if (formData.code.length >= 6) {
      validateCode(formData.code);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validation
    if (!codeValidated || !tenantInfo) {
      setError('Please enter a valid registration code');
      setSubmitting(false);
      return;
    }

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
        // Accept the registration code and create team member
        const { error: acceptError } = await supabase.rpc('accept_registration_code', {
          p_user_id: authData.user.id,
          p_code: formData.code,
          p_user_email: formData.email,
          p_user_full_name: formData.fullName
        });

        if (acceptError) {
          console.error('Accept code failed:', acceptError);
          setError('Failed to join agency: ' + acceptError.message);
          setSubmitting(false);
          return;
        }

        setSuccess(true);
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

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Welcome to {tenantInfo?.tenant_name}!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please check your email to verify your account.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-sm text-amber-800 font-medium mb-1">
                Account Pending Approval
              </p>
              <p className="text-xs text-amber-700">
                An administrator will review and approve your account. You'll be able to sign in once approved.
              </p>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Join with Code
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your team's registration code to sign up
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
          {/* Tenant Info Banner (shows when code is validated) */}
          {codeValidated && tenantInfo && (
            <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <div className="flex items-center">
                <Building2 className="w-5 h-5 text-indigo-600 mr-2" />
                <span className="font-medium text-gray-900">{tenantInfo.tenant_name}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-7">
                Your account will be pending approval after signup
              </p>
            </div>
          )}

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

            {/* Registration Code */}
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Registration Code
              </label>
              <div className="mt-1 relative">
                <input
                  id="code"
                  name="code"
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onBlur={handleCodeBlur}
                  className={`appearance-none block w-full px-3 py-2.5 border rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow font-mono text-lg tracking-widest uppercase ${
                    codeValidated 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="ABCD1234"
                />
                {validating && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                {codeValidated && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Get this code from your team administrator
              </p>
            </div>

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
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
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
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  placeholder="you@example.com"
                />
              </div>
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
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
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
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
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
                disabled={submitting || !codeValidated}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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

            <div className="text-center pt-2 space-y-2">
              <button
                type="button"
                onClick={onBack}
                className="text-sm text-indigo-600 hover:text-indigo-500"
              >
                ← Back to options
              </button>
              <div>
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-sm text-gray-600 hover:text-gray-500"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CodeSignUpForm;

