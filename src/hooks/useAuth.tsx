import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import type { AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin_master' | 'admin_empresa' | 'analista_rh' | 'gestor_departamento' | 'colaborador';

export type AppRoleAny = AppRole | 'super_admin';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** true quando role/profile/companyId do usuário autenticado já foram resolvidos (ou a tentativa terminou) */
  profileLoaded: boolean;
  role: AppRole | null;
  activeRole: AppRole | null;
  roles: AppRoleAny[];
  availableRoles: AppRole[];
  switchActiveRole: (newRole: AppRole) => Promise<{ error: string | null }>;
  companyId: string | null;
  mustChangePassword: boolean;
  isBlocked: boolean;
  blockReason: string | null;
  isAdminMaster: boolean;
  isAdminEmpresa: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  refreshUserData: () => Promise<void>;
  clearMustChangePassword: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useProvideAuth(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRoleAny[]>([]);

  // Refs to prevent duplicate fetches and track state
  const isFetchingRef = useRef(false);
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    // Avoid duplicate calls for the same user
    if (isFetchingRef.current || lastFetchedUserIdRef.current === userId) {
      console.log('[useAuth] Skipping duplicate fetch for:', userId);
      return;
    }
    
    isFetchingRef.current = true;
    console.log('[useAuth] Fetching user data for:', userId);
    
    try {
      // Fetch role using secure RPC function (bypasses RLS)
      const { data: roleData, error: roleError } = await supabase.rpc('get_my_role');

      if (roleError) {
        console.error('[useAuth] Error fetching role via RPC:', roleError.message, roleError.code);
        setRole(null);
      } else if (roleData) {
        console.log('[useAuth] Role found:', roleData);
        setRole(roleData as AppRole);
      } else {
        console.warn('[useAuth] No role found for user:', userId);
        setRole(null);
      }

      // Fetch all roles (a user can have more than one, e.g. super_admin + admin_master)
      const { data: allRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      setRoles(((allRoles ?? []).map(r => r.role) as AppRoleAny[]));

      // Fetch company_id, must_change_password, and is_active from profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, must_change_password, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[useAuth] Error fetching profile:', profileError.message, profileError.code);
      }

      if (profileData) {
        console.log('[useAuth] Profile found - company_id:', profileData.company_id, 'must_change_password:', profileData.must_change_password);
        
        // Check if user is blocked (is_active = false)
        if (profileData.is_active === false) {
          setIsBlocked(true);
          setBlockReason('colaborador_desligado');
          // Sign out the blocked user
          await supabase.auth.signOut();
          return;
        }

        setMustChangePassword(!!profileData.must_change_password);
      } else {
        console.warn('[useAuth] No profile found for user:', userId);
      }
        
      let resolvedCompanyId = profileData?.company_id ?? null;

      // Se profileData não tiver company_id, busca via RPC get_my_company_id (que avalia claims e vínculo por e-mail)
      if (!resolvedCompanyId) {
        try {
          const { data: rpcCid } = await supabase.rpc('get_my_company_id' as never);
          if (rpcCid) {
            resolvedCompanyId = rpcCid as string;
            await supabase.from('profiles').update({ company_id: resolvedCompanyId }).eq('user_id', userId);
          }
        } catch (e) {
          console.warn('[useAuth] Falha ao resolver get_my_company_id fallback:', e);
        }
      }

      if (resolvedCompanyId) {
        setCompanyId(resolvedCompanyId);

        // Se o claim estiver ausente no JWT em uso, sincroniza e renova a sessão
        try {
          const { data: authUser } = await supabase.auth.getUser();
          const hasClaim = authUser.user?.app_metadata?.company_id || authUser.user?.user_metadata?.company_id;
          if (!hasClaim) {
            await supabase.auth.updateUser({ data: { company_id: resolvedCompanyId } });
            await supabase.rpc('sincronizar_claim_company_id' as never);
            await supabase.auth.refreshSession();
          }
        } catch (e) {
          console.warn('[useAuth] Aviso ao sincronizar claim de sessão:', e);
        }
      }
      
      lastFetchedUserIdRef.current = userId;
    } finally {
      isFetchingRef.current = false;
      setProfileLoaded(true);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] Auth event:', event);
        
        // For TOKEN_REFRESHED without session, ignore to prevent flicker
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('[useAuth] TOKEN_REFRESHED without session, ignoring...');
          return;
        }
        
        // For SIGNED_OUT, clear everything
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          setRoles([]);
          setCompanyId(null);
          setMustChangePassword(false);
          setIsBlocked(false);
          setBlockReason(null);
          setProfileLoaded(false);
          lastFetchedUserIdRef.current = null;
          return;
        }
        
        // For other events, only update if there's a session
        if (session) {
          // Skip re-setting state if it's the same user already loaded
          // (prevents flicker from repeated SIGNED_IN / INITIAL_SESSION events on tab focus)
          if (lastFetchedUserIdRef.current === session.user.id) {
            console.log('[useAuth] Same user already loaded, skipping state update');
            return;
          }

          setSession(session);
          setUser(session.user);
          setProfileLoaded(false);

          // Defer fetching with setTimeout to avoid deadlocks
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  // Sincronização de activeRole entre múltiplas abas abertas
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'nr1_active_role_sync' && e.newValue) {
        supabase.rpc('get_my_role').then(({ data }) => {
          if (data) {
            setRole(data as AppRole);
          }
        });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Method to manually refresh user data (e.g., after password change or role sync)
  const refreshUserData = useCallback(async () => {
    if (user?.id) {
      lastFetchedUserIdRef.current = null;
      await fetchUserData(user.id);
    }
  }, [user?.id, fetchUserData]);

  // Method to clear the mustChangePassword flag locally
  const clearMustChangePassword = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  // signUp removed - user creation is admin-only via edge functions

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    if (user?.id) {
      localStorage.removeItem(`nr1_branding_${user.id}`);
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const availableRoles = useMemo(() => {
    const filtered = roles.filter((r): r is AppRole => r !== 'super_admin');
    // Para super_admin, viabiliza alternância no seletor Flash entre visão corporativa e visão pessoal
    if (roles.includes('super_admin')) {
      if (!filtered.includes('admin_master')) filtered.unshift('admin_master');
      if (!filtered.includes('colaborador')) filtered.push('colaborador');
    }
    return filtered;
  }, [roles]);

  const switchActiveRole = useCallback(async (newRole: AppRole): Promise<{ error: string | null }> => {
    try {
      const { error: rpcError } = await supabase.rpc('set_active_role', {
        p_role: newRole,
      });

      if (rpcError) {
        console.error('[useAuth] Erro ao alternar papel via RPC:', rpcError.message);
        return { error: rpcError.message };
      }

      setRole(newRole);
      try {
        localStorage.setItem('nr1_active_role_sync', `${newRole}_${Date.now()}`);
      } catch {
        // safe ignore se localStorage indisponível
      }
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alternar papel';
      return { error: msg };
    }
  }, []);

  return {
    user,
    session,
    loading,
    profileLoaded,
    role,
    activeRole: role,
    roles,
    availableRoles,
    switchActiveRole,
    companyId,
    mustChangePassword,
    isBlocked,
    blockReason,
    isAdminMaster: role === 'admin_master',
    isAdminEmpresa: role === 'admin_empresa',
    isAdmin: role === 'admin_master' || role === 'admin_empresa',
    isSuperAdmin: roles.includes('super_admin'),
    isAuthenticated: !!session,
    signIn,
    signOut,
    refreshUserData,
    clearMustChangePassword,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useProvideAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Consumer hook used across the app (single shared auth state via provider)
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within <AuthProvider>.');
  }
  return ctx;
}
