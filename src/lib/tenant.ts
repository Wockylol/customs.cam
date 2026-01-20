/**
 * Multi-Tenant Utilities
 * 
 * This module provides utilities for tenant detection, validation, and context management.
 */

// ============================================================================
// TYPES
// ============================================================================

export type TenantCapability =
  | 'sms_outbound'
  | 'sms_two_way'
  | 'client_chats'
  | 'payroll'
  | 'attendance'
  | 'scene_library'
  | 'voice_profiles'
  | 'advanced_sales'
  | 'b2b_partners'
  | 'leads_tracker'
  | 'automation_rules'
  | 'api_access';

export interface TenantAgency {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  is_active: boolean;
  settings: Record<string, unknown>;
  master_phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantCapabilityRow {
  id: string;
  tenant_id: string;
  capability: TenantCapability;
  enabled: boolean;
  granted_at: string;
  granted_by: string | null;
}

export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  token: string;
  role: 'admin' | 'manager' | 'chatter';
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  created_at: string;
}

export type PlatformAdminRole = 'platform_owner' | 'platform_admin' | 'platform_support';

export interface PlatformAdmin {
  id: string;
  user_id: string;
  role: PlatformAdminRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// Extended team member role to include 'owner'
export type TenantRole = 'owner' | 'admin' | 'manager' | 'chatter' | 'pending';

// Permission code type (re-exported from usePermissions for convenience)
export type { PermissionCode } from '../hooks/usePermissions';

// ============================================================================
// SUBDOMAIN DETECTION
// ============================================================================

// Reserved subdomains that should not be treated as tenant slugs
const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'app', 'platform', 'support', 'help', 'billing', 'login', 'signup', 'register'];

/**
 * Extracts the tenant slug from the current URL subdomain.
 * 
 * Examples:
 * - agency.platform.com -> 'agency'
 * - platform.com -> null (main site)
 * - admin.platform.com -> null (reserved)
 * - localhost:5173 -> null (development, uses ?tenant= or localStorage)
 * - *.cursor.sh, *.webcontainer.io, etc -> null (dev preview, uses ?tenant= or localStorage)
 * 
 * @returns The tenant slug or null if on main site
 */
export function getTenantSlugFromSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // Development/preview environment detection
  // These environments don't support real subdomains, so we use query params or localStorage
  const isDevEnvironment = 
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.includes('localhost') ||
    // Cursor preview URLs (contain long random strings with -- separators)
    hostname.includes('--') ||
    // Common dev/preview services
    hostname.endsWith('.cursor.sh') ||
    hostname.endsWith('.webcontainer.io') ||
    hostname.endsWith('.stackblitz.io') ||
    hostname.endsWith('.codesandbox.io') ||
    hostname.endsWith('.gitpod.io') ||
    hostname.endsWith('.vercel.app') ||
    hostname.endsWith('.netlify.app') ||
    hostname.endsWith('.pages.dev') ||
    // Check for UUID-like patterns in hostname (common in preview URLs)
    /^[a-z0-9]{20,}/.test(hostname.split('.')[0] || '');

  if (isDevEnvironment) {
    // In development/preview, check for a query param or use localStorage override
    const urlParams = new URLSearchParams(window.location.search);
    const devTenant = urlParams.get('tenant') || localStorage.getItem('dev_tenant_slug');
    return devTenant || null;
  }
  
  // Split hostname into parts
  const parts = hostname.split('.');
  
  // Need at least 3 parts for a subdomain (subdomain.domain.tld)
  if (parts.length < 3) {
    return null;
  }
  
  const subdomain = parts[0].toLowerCase();
  
  // Check if it's a reserved subdomain
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }
  
  return subdomain;
}

/**
 * Checks if the current URL is the main platform site (no tenant context).
 */
export function isMainPlatformSite(): boolean {
  return getTenantSlugFromSubdomain() === null;
}

/**
 * Checks if the current URL is the platform admin console.
 */
export function isPlatformAdminSite(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  if (parts.length >= 3 && parts[0].toLowerCase() === 'admin') {
    return true;
  }
  
  // Also check for /platform-admin route on main domain
  return window.location.pathname.startsWith('/platform-admin') || 
         window.location.pathname.startsWith('/platform/');
}

/**
 * Generates a URL for a specific tenant's subdomain.
 * 
 * @param tenantSlug - The tenant's slug
 * @param path - Optional path to append
 * @returns Full URL with tenant subdomain
 */
export function getTenantUrl(tenantSlug: string, path: string = '/'): string {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // Handle localhost development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const portStr = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portStr}${path}?tenant=${tenantSlug}`;
  }
  
  // Production: construct subdomain URL
  const parts = hostname.split('.');
  
  // Remove existing subdomain if present
  if (parts.length >= 3 && !RESERVED_SUBDOMAINS.includes(parts[0])) {
    parts.shift();
  }
  
  const baseDomain = parts.join('.');
  return `${protocol}//${tenantSlug}.${baseDomain}${path}`;
}

/**
 * Gets the main platform URL (without tenant subdomain).
 */
export function getMainPlatformUrl(path: string = '/'): string {
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  const port = window.location.port;
  
  // Handle localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const portStr = port ? `:${port}` : '';
    return `${protocol}//${hostname}${portStr}${path}`;
  }
  
  // Production: strip subdomain
  const parts = hostname.split('.');
  if (parts.length >= 3 && !RESERVED_SUBDOMAINS.includes(parts[0])) {
    parts.shift();
  }
  
  return `${protocol}//${parts.join('.')}${path}`;
}

// ============================================================================
// CAPABILITY HELPERS
// ============================================================================

/**
 * Default capabilities granted to new tenants.
 */
export const DEFAULT_TENANT_CAPABILITIES: TenantCapability[] = [
  'sms_outbound',
  // Add more defaults as needed
];

/**
 * All capabilities enabled for the first-party tenant.
 */
export const FIRST_PARTY_CAPABILITIES: TenantCapability[] = [
  'sms_outbound',
  'sms_two_way',
  'client_chats',
  'payroll',
  'attendance',
  'scene_library',
  'voice_profiles',
  'advanced_sales',
  'b2b_partners',
  'leads_tracker',
];

/**
 * Human-readable labels for capabilities.
 */
export const CAPABILITY_LABELS: Record<TenantCapability, string> = {
  sms_outbound: 'Outbound SMS',
  sms_two_way: 'Two-Way SMS',
  client_chats: 'Client Chat Threads',
  payroll: 'Payroll Management',
  attendance: 'Attendance Tracking',
  scene_library: 'Scene Library',
  voice_profiles: 'Voice Profiles',
  advanced_sales: 'Advanced Sales Analytics',
  b2b_partners: 'B2B Partner Management',
  leads_tracker: 'Leads Tracker',
  automation_rules: 'Automation Rules',
  api_access: 'API Access',
};

// ============================================================================
// ROLE HELPERS
// ============================================================================

/**
 * Role hierarchy levels (higher = more permissions).
 */
export const ROLE_LEVELS: Record<TenantRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  chatter: 2,
  pending: 1,
};

/**
 * Checks if a role has at least the required permission level.
 */
export function hasRolePermission(userRole: TenantRole, requiredRole: TenantRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[requiredRole];
}

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/**
 * Sets a development tenant slug (for local testing).
 */
export function setDevTenantSlug(slug: string | null): void {
  if (slug) {
    localStorage.setItem('dev_tenant_slug', slug);
  } else {
    localStorage.removeItem('dev_tenant_slug');
  }
}

/**
 * Gets the current development tenant slug.
 */
export function getDevTenantSlug(): string | null {
  return localStorage.getItem('dev_tenant_slug');
}

