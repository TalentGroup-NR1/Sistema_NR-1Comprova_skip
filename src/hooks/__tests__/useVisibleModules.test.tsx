import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVisibleModules, useIsModuleVisible } from '../useVisibleModules';
import { supabase } from '@/integrations/supabase/client';
import * as EffectiveCompanyIdHook from '@/hooks/useEffectiveCompanyId';
import * as AuthContext from '../useAuth';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('useVisibleModules e useIsModuleVisible', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('Admin Empresa com empresa efetiva correta consulta a RPC get_visible_modules', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('empresa-horizonte-uuid');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'admin_empresa',
      isAuthenticated: true,
      isSuperAdmin: false,
    } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        { module_key: '/colaboradores', visible: true },
        { module_key: '/ferias', visible: false },
      ],
      error: null,
    } as any);

    const { result } = renderHook(() => useVisibleModules(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(supabase.rpc).toHaveBeenCalledWith('get_visible_modules', {
      p_company_id: 'empresa-horizonte-uuid',
    });
    expect(result.current.data).toEqual([
      { module_key: '/colaboradores', visible: true },
      { module_key: '/ferias', visible: false },
    ]);
  });

  it('módulo desativado na RPC retorna isVisible: false para usuário da empresa', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('empresa-horizonte-uuid');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'admin_empresa',
      isAuthenticated: true,
      isSuperAdmin: false,
    } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        { module_key: '/colaboradores', visible: true },
        { module_key: '/ferias', visible: false },
      ],
      error: null,
    } as any);

    const { result } = renderHook(() => useIsModuleVisible('/ferias'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isVisible).toBe(false);
    expect(result.current.isSuperAdminBypass).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('módulo base (/colaboradores) é inegociável e permanece sempre visível', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('empresa-horizonte-uuid');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'admin_empresa',
      isAuthenticated: true,
      isSuperAdmin: false,
    } as any);

    // Mesmo se a RPC retornar visible: false para base
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ module_key: '/colaboradores', visible: false }],
      error: null,
    } as any);

    const { result } = renderHook(() => useIsModuleVisible('/colaboradores'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('sub-rota herda a desativação do módulo pai (/minhas-ferias herda /ferias desativado)', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('empresa-horizonte-uuid');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'colaborador',
      isAuthenticated: true,
      isSuperAdmin: false,
    } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ module_key: '/ferias', visible: false }],
      error: null,
    } as any);

    const { result } = renderHook(() => useIsModuleVisible('/minhas-ferias'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isVisible).toBe(false);
  });

  it('sub-rotas (/pdi, /campanhas, /laudo-aep) herdam as permissões dos pais', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('empresa-horizonte-uuid');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'admin_empresa',
      isAuthenticated: true,
      isSuperAdmin: false,
    } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [
        { module_key: '/avaliacoes', visible: false },
        { module_key: '/cuidar-mais', visible: true },
        { module_key: '/mapa-riscos-nr1', visible: false },
      ],
      error: null,
    } as any);

    const { result: rPdi } = renderHook(() => useIsModuleVisible('/pdi'), {
      wrapper: createWrapper(),
    });
    const { result: rCampanhas } = renderHook(() => useIsModuleVisible('/campanhas'), {
      wrapper: createWrapper(),
    });
    const { result: rLaudo } = renderHook(() => useIsModuleVisible('/laudo-aep'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(rPdi.current.isLoading).toBe(false));

    expect(rPdi.current.isVisible).toBe(false); // Herda /avaliacoes (desativado)
    expect(rCampanhas.current.isVisible).toBe(true); // Herda /cuidar-mais (ativo)
    expect(rLaudo.current.isVisible).toBe(false); // Herda /mapa-riscos-nr1 (desativado)
  });

  it('erro de RPC não libera módulos contratáveis (fail-closed)', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('empresa-horizonte-uuid');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'admin_empresa',
      isAuthenticated: true,
      isSuperAdmin: false,
    } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    } as any);

    const { result } = renderHook(() => useIsModuleVisible('/ferias'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // NUNCA fail-open: módulo permanece inacessível
    expect(result.current.isVisible).toBe(false);
  });

  it('Super Admin sem empresa selecionada vê tudo (bypass explícito)', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue(null);
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'super_admin',
      isAuthenticated: true,
      isSuperAdmin: true,
    } as any);

    const { result } = renderHook(() => useIsModuleVisible('/ferias'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.isSuperAdminBypass).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('Super Admin com empresa selecionada inspeciona tenant com flag de bypass declarada', async () => {
    vi.mocked(EffectiveCompanyIdHook.useEffectiveCompanyId).mockReturnValue('empresa-horizonte-uuid');
    vi.mocked(AuthContext.useAuth).mockReturnValue({
      role: 'super_admin',
      isAuthenticated: true,
      isSuperAdmin: true,
    } as any);

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ module_key: '/ferias', visible: false }],
      error: null,
    } as any);

    const { result } = renderHook(() => useIsModuleVisible('/ferias'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Super Admin acessa, mas com banner de bypass
    expect(result.current.isVisible).toBe(true);
    expect(result.current.isSuperAdminBypass).toBe(true);
  });
});
