import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useVisibleModules } from '../useVisibleModules';
import { supabase } from '@/integrations/supabase/client';
import * as CompanyContext from '@/contexts/CompanyContext';
import * as AuthContext from '../useAuth';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@/contexts/CompanyContext', () => ({
  useCompanyContext: vi.fn(),
}));

vi.mock('../useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('useVisibleModules', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('retorna o default (vazio) para admin, indicando que todos os modulos da role sao permitidos', async () => {
    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({ selectedCompanyId: 'comp-1' } as any);
    vi.mocked(AuthContext.useAuth).mockReturnValue({ role: 'admin_empresa', isAuthenticated: true } as any);
    
    // Simula a RPC retornando vazio (fallback para default)
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

    const { result } = renderHook(() => useVisibleModules(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(supabase.rpc).toHaveBeenCalledWith('get_visible_modules', { p_company_id: 'comp-1' });
    expect(result.current.data).toEqual([]); // Lista vazia significa sem restrições
  });

  it('retorna a lista filtrada apos configurar', async () => {
    vi.mocked(CompanyContext.useCompanyContext).mockReturnValue({ selectedCompanyId: 'comp-1' } as any);
    vi.mocked(AuthContext.useAuth).mockReturnValue({ role: 'colaborador', isAuthenticated: true } as any);
    
    // Simula a RPC retornando config customizada
    vi.mocked(supabase.rpc).mockResolvedValue({ 
      data: [{ module_key: '/diario-bordo', visible: false }, { module_key: '/avaliacoes', visible: true }], 
      error: null 
    } as any);

    const { result } = renderHook(() => useVisibleModules(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toEqual([
      { module_key: '/diario-bordo', visible: false },
      { module_key: '/avaliacoes', visible: true }
    ]);
  });
});
