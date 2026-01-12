import React, { useState, useEffect } from 'react';
import { X, UserPlus, Copy, Check, Mail, Link2, KeyRound, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';

interface InviteTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'invite' | 'code';

interface RegistrationCodeInfo {
  code: string | null;
  enabled: boolean;
  updated_at: string | null;
}

const InviteTeamMemberModal: React.FC<InviteTeamMemberModalProps> = ({ isOpen, onClose }) => {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<TabType>('invite');
  
  // Invite state
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'chatter' | 'manager' | 'admin'>('chatter');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Registration code state
  const [codeInfo, setCodeInfo] = useState<RegistrationCodeInfo | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [codeUrlCopied, setCodeUrlCopied] = useState(false);

  // Fetch registration code info on mount
  useEffect(() => {
    if (isOpen && activeTab === 'code') {
      fetchCodeInfo();
    }
  }, [isOpen, activeTab]);

  const fetchCodeInfo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_registration_code_info') as { 
        data: RegistrationCodeInfo[] | null, 
        error: any 
      };
      if (error) {
        console.error('Error fetching code info:', error);
        return;
      }
      if (data && data.length > 0) {
        setCodeInfo(data[0]);
      } else {
        setCodeInfo(null);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInviteLink(null);

    try {
      const { data: token, error: inviteError } = await (supabase.rpc as any)('create_tenant_invite', {
        p_email: email || '',
        p_role: role,
        p_expires_in_days: expiresInDays
      });

      if (inviteError) {
        setError(inviteError.message);
        setLoading(false);
        return;
      }

      // Construct the invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/?invite=${token}`;
      setInviteLink(link);
    } catch (err: any) {
      setError(err.message || 'Failed to create invite');
    }

    setLoading(false);
  };

  const handleGenerateCode = async () => {
    setCodeLoading(true);
    setCodeError(null);

    try {
      const { error } = await (supabase.rpc as any)('generate_registration_code');

      if (error) {
        setCodeError(error.message);
        setCodeLoading(false);
        return;
      }

      // Refresh code info
      await fetchCodeInfo();
    } catch (err: any) {
      setCodeError(err.message || 'Failed to generate code');
    }

    setCodeLoading(false);
  };

  const handleToggleCode = async () => {
    if (!codeInfo) return;
    
    setCodeLoading(true);
    setCodeError(null);

    try {
      const rpcName = codeInfo.enabled ? 'disable_registration_code' : 'enable_registration_code';
      const { error } = await supabase.rpc(rpcName);

      if (error) {
        setCodeError(error.message);
        setCodeLoading(false);
        return;
      }

      await fetchCodeInfo();
    } catch (err: any) {
      setCodeError(err.message || 'Failed to toggle code');
    }

    setCodeLoading(false);
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (codeInfo?.code) {
      await navigator.clipboard.writeText(codeInfo.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleCopyCodeUrl = async () => {
    if (codeInfo?.code) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/?code=${codeInfo.code}`;
      await navigator.clipboard.writeText(url);
      setCodeUrlCopied(true);
      setTimeout(() => setCodeUrlCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('chatter');
    setExpiresInDays(7);
    setError(null);
    setInviteLink(null);
    setCopied(false);
    setCodeError(null);
    onClose();
  };

  const handleCreateAnother = () => {
    setEmail('');
    setError(null);
    setInviteLink(null);
    setCopied(false);
  };

  const getRoleColor = (r: string, isActive: boolean) => {
    if (!isActive) return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600';
    
    switch (r) {
      case 'admin':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 ring-2 ring-green-500';
      case 'manager':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 ring-2 ring-purple-500';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-2 ring-blue-500';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />
        
        <div className="relative inline-block w-full max-w-lg p-6 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mr-3">
                <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Invite Team Members
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  to {tenant?.name}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('invite')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'invite'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Invite Link
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Registration Code
            </button>
          </div>

          {/* Invite Link Tab */}
          {activeTab === 'invite' && (
            <>
              {inviteLink ? (
                // Success state - show invite link
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center mb-2">
                      <Check className="w-5 h-5 text-green-600 mr-2" />
                      <span className="font-medium text-green-800 dark:text-green-300">Invite Created!</span>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Share this link with the person you want to invite. It will expire in {expiresInDays} days.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Invite Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={inviteLink}
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 truncate"
                      />
                      <button
                        onClick={handleCopyLink}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                          copied
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {email && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                        <Mail className="w-4 h-4 mr-2" />
                        Invite for: <strong className="ml-1">{email}</strong>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleCreateAnother}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Create Another
                    </button>
                    <button
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                // Form state
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <strong>Single use:</strong> This link can only be used once by one person.
                    </p>
                  </div>

                  {/* Email (optional) */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email Address <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      If provided, only this email can use the invite
                    </p>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['chatter', 'manager', 'admin'] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${getRoleColor(r, role === r)}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expiration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Expires In
                    </label>
                    <select
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          Create Invite Link
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {/* Registration Code Tab */}
          {activeTab === 'code' && (
            <div className="space-y-4">
              {codeError && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-300">{codeError}</p>
                </div>
              )}

              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <p className="text-sm text-indigo-800 dark:text-indigo-300">
                  <strong>Unlimited use:</strong> This code can be used by multiple people to sign up. Users will be set to <strong>pending</strong> status until approved.
                </p>
              </div>

              {/* Current Code Display */}
              {codeInfo?.code ? (
                <div className="space-y-4">
                  {/* Code Display */}
                  <div className={`p-4 rounded-lg border-2 ${
                    codeInfo.enabled 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-medium ${
                        codeInfo.enabled 
                          ? 'text-green-700 dark:text-green-300' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {codeInfo.enabled ? '● Active' : '○ Disabled'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        Users join as pending
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 font-mono text-2xl tracking-widest text-center text-gray-900 dark:text-white">
                        {codeInfo.code}
                      </div>
                      <button
                        onClick={handleCopyCode}
                        className={`p-3 rounded-lg transition-colors ${
                          codeCopied
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                        title="Copy code"
                      >
                        {codeCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Copy URL Button */}
                    <button
                      onClick={handleCopyCodeUrl}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        codeUrlCopied
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {codeUrlCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          URL Copied!
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4" />
                          Copy Signup URL with Code
                        </>
                      )}
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleToggleCode}
                      disabled={codeLoading}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        codeInfo.enabled
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                      }`}
                    >
                      {codeInfo.enabled ? (
                        <>
                          <ToggleRight className="w-5 h-5" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5" />
                          Enable
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleGenerateCode}
                      disabled={codeLoading}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {codeLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* No code exists - show generation form */
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                    <KeyRound className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No registration code exists yet. Generate one to allow team members to sign up.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-300 text-center">
                      Users who sign up with this code will be <strong>pending</strong> until you approve them and assign a role.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateCode}
                    disabled={codeLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {codeLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        Generate Registration Code
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Close button */}
              <div className="pt-4">
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteTeamMemberModal;
