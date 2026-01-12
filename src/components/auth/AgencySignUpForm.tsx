import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, AlertCircle, CheckCircle, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AgencySignUpFormProps {
  onSwitchToLogin: () => void;
  onSwitchToJoin?: () => void;
}

type SignUpFormData = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  agencyName: string;
  agencySlug: string;
};

const AgencySignUpForm: React.FC<AgencySignUpFormProps> = ({ onSwitchToLogin, onSwitchToJoin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    agencyName: '',
    agencySlug: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Auto-generate slug from agency name
  useEffect(() => {
    if (formData.agencyName) {
      const slug = formData.agencyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30);
      setFormData(prev => ({ ...prev, agencySlug: slug }));
    }
  }, [formData.agencyName]);

  // Check slug availability
  useEffect(() => {
    if (!formData.agencySlug || formData.agencySlug.length < 2) {
      setSlugAvailable(null);
      return;
    }

    const checkSlug = async () => {
      setCheckingSlug(true);
      try {
        const { data, error } = await supabase.rpc('check_slug_available', {
          p_slug: formData.agencySlug
        });
        if (!error) {
          setSlugAvailable(data);
        }
      } catch (err) {
        console.error('Error checking slug:', err);
      }
      setCheckingSlug(false);
    };

    const debounce = setTimeout(checkSlug, 500);
    return () => clearTimeout(debounce);
  }, [formData.agencySlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    if (!slugAvailable) {
      setError('Please choose an available agency name');
      setLoading(false);
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
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Create the tenant with owner
        const { data: tenantId, error: tenantError } = await supabase.rpc('create_tenant_with_owner', {
          p_user_id: authData.user.id,
          p_tenant_name: formData.agencyName,
          p_tenant_slug: formData.agencySlug,
          p_user_email: formData.email,
          p_user_full_name: formData.fullName
        });

        if (tenantError) {
          // Try to clean up the auth user if tenant creation fails
          console.error('Tenant creation failed:', tenantError);
          setError('Failed to create agency: ' + tenantError.message);
          setLoading(false);
          return;
        }

        // Redirect to dashboard - user is now logged in as agency owner
        navigate('/dashboard');
        return;
      }
    } catch (error: any) {
      setError('An unexpected error occurred: ' + error.message);
    }

    setLoading(false);
  };

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
    setFormData((prev: SignUpFormData) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Agency Created Successfully!
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please check your email to verify your account, then sign in.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Your agency URL:</strong><br />
                <span className="font-mono">{formData.agencySlug}.yourdomain.com</span>
              </p>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Create Your Agency
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Start managing your team and clients today
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
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

            {/* Agency Name */}
            <div>
              <label htmlFor="agencyName" className="block text-sm font-medium text-gray-700">
                Agency Name
              </label>
              <div className="mt-1">
                <input
                  id="agencyName"
                  name="agencyName"
                  type="text"
                  required
                  value={formData.agencyName}
                  onChange={(e) => handleInputChange('agencyName', e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="My Awesome Agency"
                />
              </div>
            </div>

            {/* Agency Slug */}
            <div>
              <label htmlFor="agencySlug" className="block text-sm font-medium text-gray-700">
                Agency URL
              </label>
              <div className="mt-1 flex rounded-lg shadow-sm">
                <input
                  id="agencySlug"
                  name="agencySlug"
                  type="text"
                  required
                  value={formData.agencySlug}
                  onChange={(e) => handleInputChange('agencySlug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="appearance-none block w-full px-3 py-2.5 border border-r-0 border-gray-300 rounded-l-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="my-agency"
                />
                <span className="inline-flex items-center px-3 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm rounded-r-lg">
                  .platform.com
                </span>
              </div>
              {formData.agencySlug && (
                <div className="mt-1 flex items-center text-sm">
                  {checkingSlug ? (
                    <span className="text-gray-500">Checking availability...</span>
                  ) : slugAvailable === true ? (
                    <span className="text-green-600 flex items-center">
                      <Check className="w-4 h-4 mr-1" /> Available
                    </span>
                  ) : slugAvailable === false ? (
                    <span className="text-red-600 flex items-center">
                      <X className="w-4 h-4 mr-1" /> Not available
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <hr className="my-4" />

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Your Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="John Doe"
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
                  className="appearance-none block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                  className="appearance-none block w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                disabled={loading || slugAvailable === false}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Agency...
                  </div>
                ) : (
                  'Create Agency'
                )}
              </button>
            </div>

            <div className="text-center space-y-2 pt-2">
              {onSwitchToJoin && (
                <button
                  type="button"
                  onClick={onSwitchToJoin}
                  className="text-sm text-blue-600 hover:text-blue-500 block w-full"
                >
                  Have an invite? Join an existing agency
                </button>
              )}
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

export default AgencySignUpForm;

