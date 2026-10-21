import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../useAuth';

const state = {
  user: { id: 'u-teste-fallback', email: 'usuario@empresa.com' },
  role: 'admin_empresa' as string | null,
  roles: ['admin_empresa', 'colaborador'] as string[],
  profile: { company_id: 'comp-1', must_change_password: false, is_active: true },
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            user: state.user,
            access_token: 'fake-jwt',
          },
        },
        error: null,
      })),
      getUser: vi.fn(async () => ({
        data: { user: state.user },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithPassword: vi.fn(),
      updateUser: vi.fn(),
      refreshSession: vi.fn(),
    },
    rpc: vi.fn(async (fnName: string) => {
      if (fnName === 'get_my_role') {
        return { data: state.role, error: null };
      }
      if (fnName === 'set_active_role') {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }),
    from: vi.fn((table: string) => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(async () => {
          if (table === 'profiles') return { data: state.profile, error: null };
          return { data: null, error: null };
        }),
        single: vi.fn(async () => {
          if (table === 'profiles') return { data: state.profile, error: null };
          return { data: null, error: null };
        }),
      };
      builder.then = (resolve: any) => {
        if (table === 'user_roles') {
          resolve({ data: state.roles.map((r) => ({ role: r })), error: null });
        } else {
          resolve({ data: [], error: null });
        }
      };
      return builder;
    }),
  },
}));

describe('useAuth — Casos de Borda do activeRole (Etapa 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.role = 'admin_empresa';
    state.roles = ['admin_empresa', 'colaborador'];
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('Caso de Borda 2: Papel removido enquanto ativo → UI reage com fallback seguro sem quebrar', async () => {
    // Inicialmente o usuário tem admin_empresa e colaborador
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.profileLoaded).toBe(true);
    });

    expect(result.current.activeRole).toBe('admin_empresa');
    expect(result.current.availableRoles).toEqual(['admin_empresa', 'colaborador']);
    expect(result.current.isAdminEmpresa).toBe(true);

    // O admin remove o papel 'admin_empresa' do usuário enquanto ele estava ativo
    // get_my_role() server-side detecta que active_role não existe mais em user_roles e faz fallback para 'colaborador'
    state.roles = ['colaborador'];
    state.role = 'colaborador';

    // Dispara refresh
    await act(async () => {
      await result.current.refreshUserData();
    });

    // A UI atualiza suavemente com o papel de fallback, sem crash
    expect(result.current.activeRole).toBe('colaborador');
    expect(result.current.role).toBe('colaborador');
    expect(result.current.isAdminEmpresa).toBe(false);
    expect(result.current.availableRoles).toEqual(['colaborador']);
  });

  it('Caso de Borda 1: Sessão aberta em 2 abas → storage event atualiza o activeRole na outra aba', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.profileLoaded).toBe(true);
    });

    expect(result.current.activeRole).toBe('admin_empresa');

    // Simula a outra aba alternando o papel para colaborador
    state.role = 'colaborador';

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'nr1_active_role_sync',
          newValue: 'colaborador_123456789',
        })
      );
    });

    await waitFor(() => {
      expect(result.current.activeRole).toBe('colaborador');
    });

    expect(result.current.isAdminEmpresa).toBe(false);
  });

  it('Caso de Borda 3: Super Admin → seletor habilitado com visão corporativa e visão pessoal', async () => {
    state.role = 'admin_master';
    state.roles = ['super_admin'];

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.profileLoaded).toBe(true);
    });

    expect(result.current.isSuperAdmin).toBe(true);
    // Super admin recebe opções para poder alternar no seletor Flash
    expect(result.current.availableRoles).toContain('admin_master');
    expect(result.current.availableRoles).toContain('colaborador');
    expect(result.current.availableRoles.length).toBeGreaterThanOrEqual(2);
  });
});
