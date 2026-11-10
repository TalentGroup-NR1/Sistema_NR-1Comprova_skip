import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUserCompanies } from '../useUserCompanies';
import { supabase } from '@/integrations/supabase/client';
import * as AuthContext from '../useAuth';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('useUserCompanies hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('1. lista os vínculos de empresa do usuário autenticado', async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'user-multi-1' },
      isAuthenticated: true,
      isSuperAdmin: false,
      refreshUserData: vi.fn(),
    } as any);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            company_id: 'c1',
            role: 'admin_empresa',
            is_default: true,
            companies: { id: 'c1', name: 'Empresa A', cnpj: '11.111.111/0001-11', status: 'active' },
          },
          {
            company_id: 'c2',
            role: 'gestor_departamento',
            is_default: false,
            companies: { id: 'c2', name: 'Empresa B', cnpj: '22.222.222/0001-22', status: 'active' },
          },
        ],
        error: null,
      }),
    });

    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    const { result } = renderHook(() => useUserCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.userCompanies).toHaveLength(2);
    expect(result.current.hasMultipleCompanies).toBe(true);
    expect(result.current.userCompanies[0].name).toBe('Empresa A');
    expect(result.current.userCompanies[1].name).toBe('Empresa B');
  });

  it('2. switchCompany executa set_active_company RPC, invalida caches e dispara refreshUserData', async () => {
    const refreshUserDataMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'user-multi-1' },
      isAuthenticated: true,
      isSuperAdmin: false,
      refreshUserData: refreshUserDataMock,
    } as any);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            company_id: 'c1',
            role: 'admin_empresa',
            is_default: true,
            companies: { id: 'c1', name: 'Empresa A', status: 'active' },
          },
          {
            company_id: 'c2',
            role: 'admin_empresa',
            is_default: false,
            companies: { id: 'c2', name: 'Empresa B', status: 'active' },
          },
        ],
        error: null,
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const removeSpy = vi.spyOn(queryClient, 'removeQueries');

    const { result } = renderHook(() => useUserCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let switchSuccess = false;
    await act(async () => {
      switchSuccess = await result.current.switchCompany('c2');
    });

    expect(switchSuccess).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('set_active_company', {
      p_company_id: 'c2',
    });
    expect(invalidateSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ['module_visibility'] });
    expect(refreshUserDataMock).toHaveBeenCalled();
  });

  it('3. switchCompany falha de forma fail-closed se a RPC retornar erro (ex.: sem vínculo)', async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'user-multi-1' },
      isAuthenticated: true,
      isSuperAdmin: false,
      refreshUserData: vi.fn(),
    } as any);

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ company_id: 'c1', role: 'admin_empresa', is_default: true, companies: { id: 'c1', name: 'Empresa A' } }],
        error: null,
      }),
    });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Acesso negado: sem vínculo' },
    } as any);

    const { result } = renderHook(() => useUserCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let switchSuccess = true;
    await act(async () => {
      switchSuccess = await result.current.switchCompany('c_invasora');
    });

    expect(switchSuccess).toBe(false);
  });

  it('4. Em caso de erro de RLS/banco (ex.: 403), limita retry a no máximo 1 repetição (2 chamadas no total) e expõe isError', async () => {
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      user: { id: 'user-403' },
      isAuthenticated: true,
      isSuperAdmin: false,
      refreshUserData: vi.fn(),
    } as any);

    let callCount = 0;
    const mockSelect = vi.fn().mockImplementation(() => {
      callCount++;
      return {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { code: '42501', message: 'permission denied for table user_companies' },
        }),
      };
    });

    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    // Cria client permitindo que o retry: 1 do hook seja respeitado (retryDelay 0 para teste rápido)
    const retryQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retryDelay: 1 },
      },
    });

    const { result } = renderHook(() => useUserCompanies(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={retryQueryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3000 });

    expect(result.current.isError).toBe(true);
    expect(result.current.error).toBeDefined();
    expect(result.current.userCompanies).toEqual([]);
    // Exatamente 2 tentativas (1 original + 1 retry)
    expect(callCount).toBe(2);
  });
});
