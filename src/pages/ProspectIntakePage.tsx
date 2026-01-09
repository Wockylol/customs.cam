import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  User, 
  Mail, 
  Phone, 
  AtSign,
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Platform {
  id: string;
  name: string;
  icon: string | null;
  color: string;
}

const ProspectIntakePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refToken = searchParams.get('ref');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    username: '',
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [platformsLoading, setPlatformsLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [createdUsername, setCreatedUsername] = useState<string | null>(null);

  // Fetch available platforms
  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const { data, error } = await supabase
          .from('platforms')
          .select('id, name, icon, color')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setPlatforms(data || []);
      } catch (err) {
        console.error('Error fetching platforms:', err);
      } finally {
        setPlatformsLoading(false);
      }
    };

    fetchPlatforms();
  }, []);

  // Check username availability with debounce
  useEffect(() => {
    if (!formData.username || formData.username.length < 3) {
      setUsernameError(null);
      return;
    }

    const checkUsername = async () => {
      setCheckingUsername(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('id')
          .eq('username', formData.username.toLowerCase())
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setUsernameError('This username is already taken');
        } else {
          setUsernameError(null);
        }
      } catch (err) {
        console.error('Error checking username:', err);
      } finally {
        setCheckingUsername(false);
      }
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [formData.username]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (usernameError) {
      return;
    }

    if (selectedPlatforms.length === 0) {
      setError('Please select at least one platform you\'re interested in');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('complete_intake_form', {
        p_token: refToken,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_email: formData.email,
        p_phone: formData.phone,
        p_username: formData.username.toLowerCase(),
        p_platform_ids: selectedPlatforms,
      });

      if (rpcError) throw rpcError;

      const result = data?.[0];
      
      if (!result?.out_success) {
        throw new Error(result?.out_message || 'Failed to submit form');
      }

      setCreatedUsername(result.out_username);
      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError(err.message || 'An error occurred while submitting the form');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-3">
                You're All Set! 🎉
              </h1>
              
              <p className="text-purple-200 mb-6">
                Your portal has been created. We'll be in touch soon to discuss the next steps.
              </p>

              <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
                <p className="text-purple-300 text-sm mb-2">Your portal URL:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-lg font-mono text-white bg-white/10 px-4 py-2 rounded-lg">
                    /app/{createdUsername}
                  </code>
                </div>
              </div>

              <button
                onClick={() => navigate(`/app/${createdUsername}`)}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold rounded-xl hover:from-fuchsia-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/30"
              >
                <span>Go to Your Portal</span>
                <ExternalLink className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-purple-900 to-fuchsia-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-purple-600 rounded-2xl mb-6 shadow-lg shadow-purple-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            Let's Get Started
          </h1>
          <p className="text-purple-200 text-lg max-w-md mx-auto">
            Fill out the form below to create your personalized portal and begin your journey with us.
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-300 flex-shrink-0" />
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your first name"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-purple-200 text-sm font-medium mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your last name"
                    className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="your@email.com"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Phone Number *
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="(555) 123-4567"
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Preferred Username *
              </label>
              <p className="text-purple-300/70 text-xs mb-2">
                This will be your unique identifier. We recommend using your main social media handle.
              </p>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  minLength={3}
                  placeholder="yourhandle"
                  className={`w-full pl-12 pr-12 py-3 bg-white/5 border rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:border-transparent transition-all ${
                    usernameError 
                      ? 'border-red-400/50 focus:ring-red-500' 
                      : formData.username.length >= 3 && !checkingUsername
                        ? 'border-green-400/50 focus:ring-green-500'
                        : 'border-white/10 focus:ring-fuchsia-500'
                  }`}
                />
                {checkingUsername && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
                )}
                {!checkingUsername && formData.username.length >= 3 && !usernameError && (
                  <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                )}
              </div>
              {usernameError && (
                <p className="mt-2 text-red-300 text-sm">{usernameError}</p>
              )}
            </div>

            {/* Platform Selection */}
            <div>
              <label className="block text-purple-200 text-sm font-medium mb-2">
                Platforms You're Interested In *
              </label>
              <p className="text-purple-300/70 text-xs mb-4">
                Select all the platforms you'd like us to manage for you.
              </p>
              
              {platformsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {platforms.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        selectedPlatforms.includes(platform.id)
                          ? 'border-fuchsia-500 bg-fuchsia-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      {platform.icon && (
                        <span className="text-2xl">{platform.icon}</span>
                      )}
                      <span className="text-white font-medium text-sm">
                        {platform.name}
                      </span>
                      {selectedPlatforms.includes(platform.id) && (
                        <CheckCircle className="w-4 h-4 text-fuchsia-400 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !!usernameError || checkingUsername}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-semibold rounded-xl hover:from-fuchsia-600 hover:to-purple-700 transition-all shadow-lg shadow-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating Your Portal...</span>
                </>
              ) : (
                <>
                  <span>Create My Portal</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-purple-300/50 text-sm mt-8">
          By submitting this form, you agree to be contacted about our services.
        </p>
      </div>
    </div>
  );
};

export default ProspectIntakePage;

