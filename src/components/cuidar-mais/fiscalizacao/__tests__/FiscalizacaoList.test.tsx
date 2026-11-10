import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FiscalizacaoList } from '../FiscalizacaoList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

vi.mock('@/hooks/useEffectiveCompanyId', () => ({
  useEffectiveCompanyId: () => 'company-1',
}));

describe('FiscalizacaoList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <FiscalizacaoList />
      </QueryClientProvider>
    );

  it('deve exibir pulse (alerta visual) APENAS quando há caso "Aguardando ação"', async () => {
    // Mock get_pulse_fiscalizacao
    const mockFiscalizacao = [
      {
        gestor_id: 'g1',
        gestor_nome: 'Gestor A',
        qtd_novo: 1,
        qtd_em_andamento: 0,
        qtd_atrasado: 0,
        ultimos_acompanhamentos: [],
      },
      {
        gestor_id: 'g2',
        gestor_nome: 'Gestor B',
        qtd_novo: 0,
        qtd_em_andamento: 1,
        qtd_atrasado: 0,
        ultimos_acompanhamentos: [],
      },
    ];

    // Mock get_cuidar_drilldown
    const mockDrilldown = [
      {
        gestor_id: 'g1',
        casos: [
          { status: 'novo', is_atrasado: false, colaborador_nome: 'Colab 1' }
        ]
      },
      {
        gestor_id: 'g2',
        casos: [
          { status: 'em_andamento', is_atrasado: false, colaborador_nome: 'Colab 2' }
        ]
      }
    ];

    (supabase.rpc as any).mockImplementation(async (fnName: string) => {
      if (fnName === 'get_pulse_fiscalizacao') return { data: mockFiscalizacao, error: null };
      if (fnName === 'get_cuidar_drilldown') return { data: mockDrilldown, error: null };
      return { data: null, error: null };
    });

    renderComponent();

    // Esperar carregar
    await waitFor(() => {
      expect(screen.getByText('Gestor A')).toBeInTheDocument();
      expect(screen.getByText('Gestor B')).toBeInTheDocument();
    });

    // O Accordion do Gestor A tem 'Aguardando ação' (status novo), então o Pulse deve aparecer.
    // O texto Aguardando ação deve estar no documento (fechado mas no DOM possivelmente, ou pelo menos o trigger)
    // O accordion está fechado, o trigger mostra o Ping: class "animate-ping"
    const triggers = screen.getAllByText('Detalhamento de Casos');
    expect(triggers.length).toBe(2);

    // O Gestor A tem o ping
    const gestorAPing = triggers[0].parentElement?.querySelector('.animate-ping');
    expect(gestorAPing).toBeInTheDocument();

    // O Gestor B NÃO tem o ping
    const gestorBPing = triggers[1].parentElement?.querySelector('.animate-ping');
    expect(gestorBPing).not.toBeInTheDocument();
  });
});
