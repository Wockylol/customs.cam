import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Save, Phone, Globe, Clock, 
  AlertTriangle, Check, Mail, DollarSign,
  Settings, Image, Palette
} from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { supabase } from '../lib/supabase';

// Types for agency settings
interface AgencySettings {
  master_phone_number?: string;
  timezone?: string;
  default_currency?: string;
  support_email?: string;
  business_hours?: {
    start: string;
    end: string;
  };
  branding?: {
    primary_color?: string;
    logo_url?: string;
  };
}

interface FormData {
  name: string;
  master_phone_number: string;
  timezone: string;
  default_currency: string;
  support_email: string;
  business_hours_start: string;
  business_hours_end: string;
  primary_color: string;
}

// Common timezones
const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

// Currency options
const CURRENCIES = [
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
];

const AgencySettingsPage: React.FC = () => {
  const { teamMember, isOwner, hasPermission } = useAuth();
  const { tenant, refreshTenant } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    master_phone_number: '',
    timezone: 'America/New_York',
    default_currency: 'USD',
    support_email: '',
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    primary_color: '#3B82F6',
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  // Check permissions - only owners and admins can edit settings
  const canEditSettings = isOwner || hasPermission('settings.agency') || teamMember?.role === 'admin' || teamMember?.role === 'owner';

  // Load current tenant data
  useEffect(() => {
    if (tenant) {
      const settings = (tenant.settings || {}) as AgencySettings;
      const newFormData: FormData = {
        name: tenant.name || '',
        master_phone_number: settings.master_phone_number || '',
        timezone: settings.timezone || 'America/New_York',
        default_currency: settings.default_currency || 'USD',
        support_email: settings.support_email || '',
        business_hours_start: settings.business_hours?.start || '09:00',
        business_hours_end: settings.business_hours?.end || '17:00',
        primary_color: settings.branding?.primary_color || '#3B82F6',
      };
      setFormData(newFormData);
      setOriginalData(newFormData);
      setLoading(false);
    }
  }, [tenant]);

  // Track changes
  useEffect(() => {
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  // Handle form field changes
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSuccess(false);
    setError(null);
  };

  // Format phone number as user types
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      // International format: +X (XXX) XXX-XXXX
      return `+${digits.slice(0, digits.length - 10)} (${digits.slice(-10, -7)}) ${digits.slice(-7, -4)}-${digits.slice(-4)}`;
    }
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleChange('master_phone_number', formatted);
  };

  // Save settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant || !canEditSettings) return;
    
    setError(null);
    setSaving(true);

    try {
      // Validate required fields
      if (!formData.name.trim()) {
        throw new Error('Agency name is required');
      }

      // Build settings object
      const settings: AgencySettings = {
        master_phone_number: formData.master_phone_number || undefined,
        timezone: formData.timezone,
        default_currency: formData.default_currency,
        support_email: formData.support_email || undefined,
        business_hours: {
          start: formData.business_hours_start,
          end: formData.business_hours_end,
        },
        branding: {
          primary_color: formData.primary_color,
        },
      };

      // Update tenant_agencies table
      const { error: updateError } = await supabase
        .from('tenant_agencies')
        .update({
          name: formData.name.trim(),
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tenant.id);

      if (updateError) {
        throw updateError;
      }

      // Refresh tenant context
      await refreshTenant();
      
      setOriginalData(formData);
      setHasChanges(false);
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    if (originalData) {
      setFormData(originalData);
      setHasChanges(false);
      setError(null);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout title="Agency Settings">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // No tenant found
  if (!tenant) {
    return (
      <Layout title="Agency Settings">
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Agency Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You need to be part of an agency to access settings.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agency Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-4 backdrop-blur-sm">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold">Agency Settings</h1>
                <p className="text-emerald-100 text-sm lg:text-base">
                  Configure your agency's profile and preferences
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-lg font-bold truncate">{tenant.name}</div>
              <div className="text-emerald-100 text-sm">Agency Name</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center">
              <div className="text-lg font-bold">{tenant.slug}</div>
              <div className="text-emerald-100 text-sm">Subdomain</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center hidden lg:block">
              <div className="text-lg font-bold">{formData.timezone.split('/')[1] || 'Not Set'}</div>
              <div className="text-emerald-100 text-sm">Timezone</div>
            </div>
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 text-center hidden lg:block">
              <div className="text-lg font-bold">{formData.default_currency}</div>
              <div className="text-emerald-100 text-sm">Currency</div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
            >
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-400">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Message */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
            >
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                <p className="text-green-800 dark:text-green-400">Settings saved successfully!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings Form */}
        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center">
                <Settings className="w-5 h-5 text-gray-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Basic Information
                </h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Agency Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agency Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    disabled={!canEditSettings}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="Your Agency Name"
                  />
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  This is how your agency will appear throughout the platform
                </p>
              </div>

              {/* Master Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Master Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.master_phone_number}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    disabled={!canEditSettings}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Primary contact number for your agency (used for SMS and notifications)
                </p>
              </div>

              {/* Support Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Support Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={formData.support_email}
                    onChange={(e) => handleChange('support_email', e.target.value)}
                    disabled={!canEditSettings}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="support@youragency.com"
                  />
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Email address for support inquiries
                </p>
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center">
                <Globe className="w-5 h-5 text-gray-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Regional Settings
                </h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={formData.timezone}
                    onChange={(e) => handleChange('timezone', e.target.value)}
                    disabled={!canEditSettings}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Used for scheduling, reports, and time-based features
                </p>
              </div>

              {/* Default Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Currency
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none z-10" />
                  <select
                    value={formData.default_currency}
                    onChange={(e) => handleChange('default_currency', e.target.value)}
                    disabled={!canEditSettings}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Default currency for sales, payroll, and financial reports
                </p>
              </div>

              {/* Business Hours */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Business Hours
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formData.business_hours_start}
                      onChange={(e) => handleChange('business_hours_start', e.target.value)}
                      disabled={!canEditSettings}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.business_hours_end}
                      onChange={(e) => handleChange('business_hours_end', e.target.value)}
                      disabled={!canEditSettings}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Standard operating hours for your agency
                </p>
              </div>
            </div>
          </div>

          {/* Branding */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center">
                <Palette className="w-5 h-5 text-gray-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Branding
                </h2>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Brand Color
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => handleChange('primary_color', e.target.value)}
                      disabled={!canEditSettings}
                      className="w-16 h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    disabled={!canEditSettings}
                    className="w-32 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="#3B82F6"
                  />
                  <div 
                    className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-600"
                    style={{ backgroundColor: formData.primary_color }}
                  />
                </div>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
                  Used for buttons, links, and accent colors throughout the platform
                </p>
              </div>
            </div>
          </div>

          {/* Read-only Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex items-center">
                <Image className="w-5 h-5 text-gray-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Agency Information
                </h2>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Read-only)</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Agency ID
                  </label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                    {tenant.id}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Subdomain/Slug
                  </label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                    {tenant.slug}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Created
                  </label>
                  <p className="text-gray-900 dark:text-white text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                    {new Date(tenant.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Status
                  </label>
                  <p className="text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {tenant.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Bar */}
          {canEditSettings && (
            <AnimatePresence>
              {hasChanges && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
                >
                  <div className="bg-gray-900 dark:bg-gray-700 text-white rounded-xl shadow-2xl px-6 py-4 flex items-center gap-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm">You have unsaved changes</span>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={handleDiscard}
                        className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 rounded-lg transition-colors"
                        disabled={saving}
                      >
                        Discard
                      </button>
                      <button
                        type="submit"
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* Static Save Button (when no changes) */}
          {canEditSettings && !hasChanges && (
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50"
                disabled={saving || !hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
};

export default AgencySettingsPage;

