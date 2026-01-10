import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import { TenantRole } from '../lib/tenant';

type TeamMemberRow = Database['public']['Tables']['team_members']['Row'];

// Extended team member type with tenant_id
interface TeamMember extends Omit<TeamMemberRow, 'role'> {
  tenant_id: string | null;
  role: TenantRole;
}

interface AuthContextType {
  user: User | null;
  teamMember: TeamMember | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  isPlatformAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Session error:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        // Do not block initial render on team member fetch
        setLoading(false);
        
        if (session?.user) {
          // Fire-and-forget team member fetch
          fetchTeamMember(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        setTeamMember(null);
        setLoading(false);
      } else if (session?.user) {
        // Ensure UI is not blocked on team member fetch
        setLoading(false);
        fetchTeamMember(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchTeamMember = async (userId: string) => {
    try {
      // Fetch team member with tenant_id
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Team member query error:', error);
        // If no row found (PGRST116), treat as not a team member; otherwise, just surface the error and continue signed in
        if (error.code && error.code !== 'PGRST116') {
          console.warn('Non-fatal team member fetch error, proceeding without team member.');
        }
        setTeamMember(null);
      } else if (data) {
        setTeamMember(data as unknown as TeamMember);
      } else {
        setTeamMember(null);
      }

      // Check if user is a platform admin
      // Wrap in try/catch as this may fail if RLS policies aren't properly configured
      try {
        const { data: platformAdminData, error: paError } = await supabase
          .from('platform_admins')
          .select('id, role')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (paError) {
          console.warn('Platform admin check failed (RLS issue?):', paError.message);
          setIsPlatformAdmin(false);
        } else {
          setIsPlatformAdmin(!!platformAdminData);
        }
      } catch (paErr) {
        console.warn('Platform admin check error:', paErr);
        setIsPlatformAdmin(false);
      }

    } catch (error) {
      console.error('Unexpected error in fetchTeamMember:', error);
      setTeamMember(null);
      setIsPlatformAdmin(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    teamMember,
    session,
    loading,
    signIn,
    signOut,
    isPlatformAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};