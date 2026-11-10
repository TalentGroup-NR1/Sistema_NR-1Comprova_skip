import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { GestorAlertBanner } from '../GestorAlertBanner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MemoryRouter } from 'react-router-dom';
import * as useAuthMock from '@/hooks/useAuth';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: () => 'company-1',
}));

describe('GestorAlertBanner', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    sessionStorage.clear();

    vi.spyOn(useAuthMock, 'useAuth').mockReturnValue({
      session: { user: { id: 'user-1' } },
    } as any);
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <GestorAlertBanner />
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('deve exibir o banner quando houver casos novos ou atrasados para o gestor', async () => {
    (supabase.rpc as any).mockImplementation(async (fnName: string) => {
      if (fnName === 'get_my_role') return { data: 'gestor_departamento', error: null };
      if (fnName === 'get_cuidar_drilldown') {
        return {
          data: [
            {
              gestor_id: 'g1',
              casos: [{ status: 'novo', is_atrasado: false }],
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/1 caso crítico aguardando/i)).toBeInTheDocument();
    });
  });

  it('NÃO deve exibir o banner para papel admin_master', async () => {
    (supabase.rpc as any).mockImplementation(async (fnName: string) => {
      if (fnName === 'get_my_role') return { data: 'admin_master', error: null };
      if (fnName === 'get_cuidar_drilldown') {
        return {
          data: [
            {
              gestor_id: 'g1',
              casos: [{ status: 'novo', is_atrasado: false }],
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/caso crítico aguardando/i)).not.toBeInTheDocument();
    });
  });

  it('NÃO deve exibir o banner se não houver casos novos/atrasados', async () => {
    (supabase.rpc as any).mockImplementation(async (fnName: string) => {
      if (fnName === 'get_my_role') return { data: 'gestor_departamento', error: null };
      if (fnName === 'get_cuidar_drilldown') {
        return {
          data: [
            {
              gestor_id: 'g1',
              casos: [{ status: 'em_andamento', is_atrasado: false }],
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/caso crítico aguardando/i)).not.toBeInTheDocument();
    });
  });

});
