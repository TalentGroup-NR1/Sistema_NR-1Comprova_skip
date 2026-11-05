import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TreinamentoViewer } from '../TreinamentoViewer';
import { TreinamentoCard } from '../../catalogo/TreinamentoCard';
import { useEmitCertificate } from '@/hooks/useCertificates';
import { supabase } from '@/integrations/supabase/client';
import { Treinamento } from '@/hooks/useTreinamentos';
import { TreinamentoProgresso } from '@/hooks/useTreinamentoProgresso';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
  },
}));

// Mock hooks used by TreinamentoViewer
const mockUseMeuProgresso = vi.fn();
const mockConcluirMutateAsync = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useTreinamentoProgresso', () => ({
  useMeuProgresso: () => mockUseMeuProgresso(),
  useGetOrCreateProgresso: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'prog-1' }) }),
  useCreateLogAcesso: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 'log-1' }) }),
  useConcluirTreinamento: () => ({
    mutateAsync: mockConcluirMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useTrainingTimer', () => ({
  useTrainingTimer: () => ({
    elapsedMinutes: 30,
    percentComplete: 100,
    isActive: true,
    isPaused: false,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    companyId: 'comp-1',
  }),
}));

describe('Treinamento Link Externo e Autodeclaração (Etapa 8.7)', () => {
  let queryClient: QueryClient;

  const mockTreinamentoLink: Treinamento = {
    id: 'trein-link-1',
    titulo: 'Associando Alto Desempenho e Bem-Estar',
    tipo: 'link',
    url_conteudo: 'https://www.escolavirtual.gov.br/curso/123',
    descricao: 'Curso em plataforma externa GOV.BR',
    carga_horaria: 20,
    tempo_minimo_minutos: 0,
    quiz_obrigatorio: false,
    termo_ciencia_obrigatorio: false,
    obrigatorio: false,
    status: 'publicado',
    gera_certificado: false,
    origem: 'plataforma',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'colaboradores') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'colab-1', full_name: 'Colaborador Teste' },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'companies') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { name: 'Empresa Teste', logo_url: null },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'treinamentos') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { tipo: 'link', gera_certificado: false, validade_meses: null },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('1. Link externo não concluído exibe botão "Marcar como estudado" e aviso de conteúdo externo', async () => {
    mockUseMeuProgresso.mockReturnValue({
      data: {
        id: 'prog-1',
        treinamento_id: 'trein-link-1',
        colaborador_id: 'colab-1',
        status: 'em_andamento',
        tempo_total_minutos: 10,
        quiz_aprovado: false,
        termo_aceito: false,
      } as TreinamentoProgresso,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<TreinamentoViewer treinamento={mockTreinamentoLink} />);

    // Deve exibir aviso sobre instituição externa
    expect(screen.getByText(/Conteúdo hospedado externamente \(escolavirtual\.gov\.br\)/i)).toBeInTheDocument();

    // Deve exibir botão "Marcar como estudado" em vez de "Concluir Treinamento"
    const btnConcluir = screen.getByRole('button', { name: /Marcar como estudado/i });
    expect(btnConcluir).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir Treinamento/i })).not.toBeInTheDocument();
  });

  it('2. Ao clicar em "Marcar como estudado", abre modal com checkbox obrigatório desmarcado e confirmação desabilitada', async () => {
    mockUseMeuProgresso.mockReturnValue({
      data: {
        id: 'prog-1',
        treinamento_id: 'trein-link-1',
        colaborador_id: 'colab-1',
        status: 'em_andamento',
        tempo_total_minutos: 10,
        quiz_aprovado: false,
        termo_aceito: false,
      } as TreinamentoProgresso,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<TreinamentoViewer treinamento={mockTreinamentoLink} />);

    const btnMarcar = screen.getByRole('button', { name: /Marcar como estudado/i });
    fireEvent.click(btnMarcar);

    // Modal deve estar aberto
    expect(screen.getByText(/Confirmar estudo do conteúdo externo/i)).toBeInTheDocument();
    expect(screen.getByText(/Declaro que acessei e estudei o conteúdo indicado neste treinamento/i)).toBeInTheDocument();

    const btnConfirmar = screen.getByRole('button', { name: /Confirmar conclusão/i });
    expect(btnConfirmar).toBeDisabled();

    // Marcar o checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Botão agora deve estar habilitado
    expect(btnConfirmar).not.toBeDisabled();

    // Clicar em confirmar
    fireEvent.click(btnConfirmar);

    expect(mockConcluirMutateAsync).toHaveBeenCalledWith({
      progressoId: 'prog-1',
      treinamentoId: 'trein-link-1',
      autodeclarado: true,
      termoAceito: true,
    });
  });

  it('3. Quando treinamento de link externo já está concluído: badge é "Estudado (autodeclarado)" e NUNCA exibe "Gerar Certificado"', async () => {
    mockUseMeuProgresso.mockReturnValue({
      data: {
        id: 'prog-1',
        treinamento_id: 'trein-link-1',
        colaborador_id: 'colab-1',
        status: 'concluido',
        concluido_em: '2026-11-05T14:25:00.000Z',
        tempo_total_minutos: 45,
        quiz_aprovado: false,
        termo_aceito: true,
      } as TreinamentoProgresso,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderWithProviders(<TreinamentoViewer treinamento={mockTreinamentoLink} />);

    // Header badge
    expect(screen.getByText('Estudado (autodeclarado)')).toBeInTheDocument();

    // Card explicativo de estudo externo
    expect(screen.getByText(/Conteúdo externo registrado como estudado em/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Caso a instituição ofereça certificado, este deve ser obtido diretamente pelo portal dela/i)
    ).toBeInTheDocument();

    // Blindagem visual: NUNCA exibe botão de emitir/gerar certificado
    expect(screen.queryByText(/Gerar Certificado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Emitir Certificado/i)).not.toBeInTheDocument();
  });

  it('4. TreinamentoCard exibe "Estudado (autodeclarado)" quando concluído e "Link externo" quando não concluído', () => {
    // 4a. Não concluído
    const { unmount } = renderWithProviders(
      <TreinamentoCard
        treinamento={mockTreinamentoLink}
        progresso={{
          id: 'prog-1',
          treinamento_id: 'trein-link-1',
          colaborador_id: 'colab-1',
          status: 'em_andamento',
          tempo_total_minutos: 5,
          quiz_aprovado: false,
          termo_aceito: false,
        } as TreinamentoProgresso}
      />
    );

    expect(screen.getByText('Link externo')).toBeInTheDocument();
    expect(screen.queryByText('Concluído')).not.toBeInTheDocument();
    unmount();

    // 4b. Concluído
    renderWithProviders(
      <TreinamentoCard
        treinamento={mockTreinamentoLink}
        progresso={{
          id: 'prog-1',
          treinamento_id: 'trein-link-1',
          colaborador_id: 'colab-1',
          status: 'concluido',
          concluido_em: '2026-11-05T14:25:00.000Z',
          tempo_total_minutos: 25,
          quiz_aprovado: false,
          termo_aceito: true,
        } as TreinamentoProgresso}
      />
    );

    expect(screen.getByText('Estudado (autodeclarado)')).toBeInTheDocument();
    expect(screen.queryByText('Concluído')).not.toBeInTheDocument();
  });

  it('5. Blindagem no Hook: useEmitCertificate rejeita treinamento de link externo ou com gera_certificado=false', async () => {
    let hookResult: ReturnType<typeof useEmitCertificate>;

    function TestComponent() {
      hookResult = useEmitCertificate();
      return null;
    }

    renderWithProviders(<TestComponent />);

    await expect(
      hookResult!.mutateAsync({
        treinamentoId: 'trein-link-1',
        colaboradorId: 'colab-1',
        companyId: 'comp-1',
        cargaHoraria: 20,
      })
    ).rejects.toThrow('Este treinamento não emite certificado da plataforma.');
  });
});
