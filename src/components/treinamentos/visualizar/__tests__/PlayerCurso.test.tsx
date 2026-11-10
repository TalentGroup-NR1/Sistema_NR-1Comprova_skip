import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TreinamentoViewer } from '../TreinamentoViewer';
import { AulaPlayer } from '../AulaPlayer';
import { TreinamentoCard } from '../../catalogo/TreinamentoCard';
import { Treinamento } from '@/hooks/useTreinamentos';
import { TreinamentoProgresso } from '@/hooks/useTreinamentoProgresso';
import { AulaTreinamento, ModuloTreinamento, ProgressoAula } from '@/hooks/useProgressoAula';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-teste-1' } } }),
    },
  },
}));

// Mock hooks
const mockUseMeuProgresso = vi.fn();
const mockUseCurriculo = vi.fn();
const mockUseProgressoAulas = vi.fn();
const mockSalvarProgressoAulaMutateAsync = vi.fn().mockResolvedValue({});
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

vi.mock('@/hooks/useProgressoAula', () => ({
  useCurriculo: () => mockUseCurriculo(),
  useProgressoAulas: () => mockUseProgressoAulas(),
  useProgressoGlobal: () => ({ data: null, refetch: vi.fn() }),
  useSalvarProgressoAula: () => ({
    mutateAsync: mockSalvarProgressoAulaMutateAsync,
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
    user: { id: 'user-teste-1' },
    companyId: 'company-1',
  }),
}));

describe('ETAPA 9.2 — Player de Curso com Módulos, Aulas e Progresso Derivado', () => {
  let queryClient: QueryClient;

  const mockTreinamentoPadrao: Treinamento = {
    id: 'trein-curso-1',
    titulo: 'Treinamento de Segurança NR-1 Integrado',
    tipo: 'video',
    url_conteudo: 'video_treinamento.mp4',
    descricao: 'Curso completo de NR-1 estruturado em módulos e aulas',
    tempo_minimo_minutos: 0,
    quiz_obrigatorio: false,
    termo_ciencia_obrigatorio: false,
    obrigatorio: true,
    status: 'publicado',
    gera_certificado: true,
    origem: 'plataforma',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockModulos: ModuloTreinamento[] = [
    {
      id: 'mod-1',
      treinamento_id: 'trein-curso-1',
      titulo: 'Fundamentos da Norma',
      descricao: 'Conceitos gerais',
      ordem: 1,
      aulas: [
        {
          id: 'aula-1',
          modulo_id: 'mod-1',
          treinamento_id: 'trein-curso-1',
          titulo: 'Introdução à NR-1',
          descricao: 'Vídeo introdutório',
          tipo: 'video',
          url_conteudo: 'https://cdn.exemplo.com/aula1.mp4',
          duracao_minutos: 15,
          ordem: 1,
          obrigatoria: true,
          tempo_minimo_segundos: 0,
        },
        {
          id: 'aula-2',
          modulo_id: 'mod-1',
          treinamento_id: 'trein-curso-1',
          titulo: 'Guia em PDF',
          descricao: 'Apostila oficial',
          tipo: 'pdf',
          url_conteudo: 'https://cdn.exemplo.com/apostila.pdf',
          duracao_minutos: 20,
          ordem: 2,
          obrigatoria: true,
          tempo_minimo_segundos: 0,
        },
      ],
    },
    {
      id: 'mod-2',
      treinamento_id: 'trein-curso-1',
      titulo: 'Diretrizes Práticas',
      descricao: 'Aplicações práticas',
      ordem: 2,
      aulas: [
        {
          id: 'aula-3',
          modulo_id: 'mod-2',
          treinamento_id: 'trein-curso-1',
          titulo: 'Leitura de Procedimentos',
          descricao: 'Texto explicativo com tempo mínimo',
          tipo: 'texto',
          url_conteudo: 'Texto com as diretrizes da NR-1 para segurança no trabalho...',
          duracao_minutos: 10,
          ordem: 1,
          obrigatoria: true,
          tempo_minimo_segundos: 3,
        },
      ],
    },
  ];

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
                data: { id: 'colab-1', full_name: 'Colaborador Aluno' },
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
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    mockUseMeuProgresso.mockReturnValue({
      data: {
        id: 'prog-1',
        treinamento_id: 'trein-curso-1',
        colaborador_id: 'colab-1',
        status: 'em_andamento',
        tempo_total_minutos: 10,
        quiz_aprovado: false,
        termo_aceito: false,
      } as TreinamentoProgresso,
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseCurriculo.mockReturnValue({
      data: mockModulos,
      isLoading: false,
    });

    mockUseProgressoAulas.mockReturnValue({
      data: [] as ProgressoAula[],
      refetch: vi.fn(),
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    );
  };

  // a) Renderização da estrutura de módulos e aulas na sidebar
  it('a) Renderiza a sidebar com módulos, títulos das aulas, durações e contadores', () => {
    renderWithProviders(<TreinamentoViewer treinamento={mockTreinamentoPadrao} modulos={mockModulos} />);

    expect(screen.getByText(/Conteúdo do curso/i)).toBeInTheDocument();
    expect(screen.getByText(/Fundamentos da Norma/i)).toBeInTheDocument();
    expect(screen.getByText(/Diretrizes Práticas/i)).toBeInTheDocument();

    expect(screen.getByText(/1.1 Introdução à NR-1/i)).toBeInTheDocument();
    expect(screen.getByText(/1.2 Guia em PDF/i)).toBeInTheDocument();
    expect(screen.getByText(/2.1 Leitura de Procedimentos/i)).toBeInTheDocument();
    expect(screen.getByText(/0 de 3 aulas concluídas/i)).toBeInTheDocument();
  });

  // b) Seleção de aula pelo clique na sidebar
  it('b) Permite selecionar outra aula pelo clique na sidebar e atualiza o player principal', () => {
    renderWithProviders(<TreinamentoViewer treinamento={mockTreinamentoPadrao} modulos={mockModulos} />);

    // Por padrão exibe a primeira aula
    expect(screen.getByRole('heading', { level: 2, name: /Introdução à NR-1/i })).toBeInTheDocument();

    // Clicar na Aula 1.2 na sidebar
    const btnAulaPdf = screen.getByText(/1.2 Guia em PDF/i);
    fireEvent.click(btnAulaPdf);

    // Agora o cabeçalho do player exibe a Aula 1.2
    expect(screen.getByRole('heading', { level: 2, name: /Guia em PDF/i })).toBeInTheDocument();
  });

  // c) Aula do tipo video: auto-conclusão e throttle
  it('c) AulaPlayer de vídeo conclui automaticamente ao atingir 90%', () => {
    const onConcluirMock = vi.fn();
    const onProgressoMock = vi.fn();

    renderWithProviders(
      <AulaPlayer
        aula={mockModulos[0].aulas[0]}
        progresso={null}
        onConcluirAula={onConcluirMock}
        onAtualizarProgresso={onProgressoMock}
      />
    );

    expect(screen.getByRole('button', { name: /Marcar como assistido/i })).toBeInTheDocument();
  });

  // d) Aula do tipo pdf: renderização e botão de conclusão
  it('d) AulaPlayer de PDF renderiza botões de baixar PDF e concluir leitura', () => {
    const onConcluirMock = vi.fn();
    const aulaPdf = mockModulos[0].aulas[1];

    renderWithProviders(
      <AulaPlayer aula={aulaPdf} progresso={null} onConcluirAula={onConcluirMock} />
    );

    expect(screen.getByRole('button', { name: /Baixar PDF/i })).toBeInTheDocument();
    const btnConcluirPdf = screen.getByRole('button', { name: /Concluir leitura do PDF/i });
    expect(btnConcluirPdf).toBeInTheDocument();

    fireEvent.click(btnConcluirPdf);
    expect(onConcluirMock).toHaveBeenCalledWith({ percentual: 100 });
  });

  // e) Aula do tipo ppt/arquivo: renderização, download e conclusão
  it('e) AulaPlayer de PPT/arquivo renderiza card com download e botão marcar como estudado', () => {
    const onConcluirMock = vi.fn();
    const aulaPpt: AulaTreinamento = {
      id: 'aula-ppt',
      modulo_id: 'mod-1',
      treinamento_id: 'trein-curso-1',
      titulo: 'Apresentação de Slides da CIPA',
      descricao: 'Slides em PowerPoint',
      tipo: 'ppt',
      url_conteudo: 'https://cdn.exemplo.com/apresentacao.pptx',
      duracao_minutos: 15,
      ordem: 3,
      obrigatoria: true,
      tempo_minimo_segundos: 0,
    };

    renderWithProviders(
      <AulaPlayer aula={aulaPpt} progresso={null} onConcluirAula={onConcluirMock} />
    );

    expect(screen.getByRole('button', { name: /Baixar Apresentação/i })).toBeInTheDocument();
    const btnMarcar = screen.getByRole('button', { name: /Marcar como estudado/i });
    expect(btnMarcar).toBeInTheDocument();

    fireEvent.click(btnMarcar);
    expect(onConcluirMock).toHaveBeenCalledWith({ percentual: 100 });
  });

  // f) Aula do tipo link: aviso externo e autodeclaração
  it('f) AulaPlayer de link externo exibe aviso de conteúdo externo e modal de autodeclaração', () => {
    const onConcluirMock = vi.fn();
    const aulaLink: AulaTreinamento = {
      id: 'aula-link',
      modulo_id: 'mod-1',
      treinamento_id: 'trein-curso-1',
      titulo: 'Curso Externo GOV.BR',
      descricao: 'Plataforma oficial externa',
      tipo: 'link',
      url_conteudo: 'https://www.escolavirtual.gov.br/curso/99',
      duracao_minutos: 30,
      ordem: 4,
      obrigatoria: true,
      tempo_minimo_segundos: 0,
    };

    renderWithProviders(
      <AulaPlayer aula={aulaLink} progresso={null} onConcluirAula={onConcluirMock} />
    );

    expect(screen.getByText(/Conteúdo hospedado externamente \(escolavirtual\.gov\.br\)/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Acessar Link/i })).toBeInTheDocument();

    const btnMarcar = screen.getByRole('button', { name: /Marcar como estudado/i });
    fireEvent.click(btnMarcar);

    expect(screen.getByText(/Confirmar estudo do conteúdo externo/i)).toBeInTheDocument();
    const btnConfirmar = screen.getByRole('button', { name: /Confirmar conclusão/i });
    expect(btnConfirmar).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(btnConfirmar).not.toBeDisabled();

    fireEvent.click(btnConfirmar);
    expect(onConcluirMock).toHaveBeenCalledWith({
      autodeclarado: true,
      termoAceito: true,
      percentual: 100,
    });
  });

  // g) Aula do tipo texto: tempo mínimo bloqueando e liberando
  it('g) AulaPlayer de texto bloqueia botão até transcorrer o tempo mínimo', () => {
    const onConcluirMock = vi.fn();
    const aulaTextoComTempo: AulaTreinamento = {
      id: 'aula-txt',
      modulo_id: 'mod-2',
      treinamento_id: 'trein-curso-1',
      titulo: 'Texto Normativo',
      descricao: 'Leitura obrigatória',
      tipo: 'texto',
      url_conteudo: 'Conteúdo detalhado das disposições da NR-1...',
      duracao_minutos: 5,
      ordem: 1,
      obrigatoria: true,
      tempo_minimo_segundos: 10,
    };

    renderWithProviders(
      <AulaPlayer aula={aulaTextoComTempo} progresso={null} onConcluirAula={onConcluirMock} />
    );

    const btnAguarde = screen.getByRole('button', { name: /Aguarde \d+s/i });
    expect(btnAguarde).toBeDisabled();
    expect(screen.getByText(/Tempo mínimo de leitura restante:/i)).toBeInTheDocument();
  });

  // h) Remoção do botão solto "Concluir Treinamento" quando há aulas pendentes
  it('h) Não exibe botão solto "Concluir Treinamento" nem "Finalizar Treinamento" quando há aulas pendentes', () => {
    renderWithProviders(<TreinamentoViewer treinamento={mockTreinamentoPadrao} modulos={mockModulos} />);

    expect(screen.queryByRole('button', { name: /^Concluir Treinamento$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Finalizar Treinamento$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Em andamento \(0\/3 aulas\)/i)).toBeInTheDocument();
  });

  // i) Conclusão do curso habilitada somente quando todas as aulas estiverem concluídas
  it('i) Libera "Finalizar Treinamento" apenas quando todas as 3 aulas estiverem concluídas', () => {
    mockUseProgressoAulas.mockReturnValue({
      data: [
        { id: 'p1', user_id: 'user-teste-1', aula_id: 'aula-1', treinamento_id: 'trein-curso-1', company_id: 'c1', concluida: true, concluida_em: new Date().toISOString(), percentual_assistido: 100, termo_aceito: false, termo_aceito_em: null, termo_ip: null },
        { id: 'p2', user_id: 'user-teste-1', aula_id: 'aula-2', treinamento_id: 'trein-curso-1', company_id: 'c1', concluida: true, concluida_em: new Date().toISOString(), percentual_assistido: 100, termo_aceito: false, termo_aceito_em: null, termo_ip: null },
        { id: 'p3', user_id: 'user-teste-1', aula_id: 'aula-3', treinamento_id: 'trein-curso-1', company_id: 'c1', concluida: true, concluida_em: new Date().toISOString(), percentual_assistido: 100, termo_aceito: false, termo_aceito_em: null, termo_ip: null },
      ] as ProgressoAula[],
      refetch: vi.fn(),
    });

    renderWithProviders(<TreinamentoViewer treinamento={mockTreinamentoPadrao} modulos={mockModulos} />);

    expect(screen.getByText(/Todas as etapas foram cumpridas!/i)).toBeInTheDocument();
    const btnFinalizar = screen.getByRole('button', { name: /Finalizar Treinamento/i });
    expect(btnFinalizar).toBeInTheDocument();

    fireEvent.click(btnFinalizar);
    expect(mockConcluirMutateAsync).toHaveBeenCalledWith({
      progressoId: 'prog-1',
      treinamentoId: 'trein-curso-1',
    });
  });

  // j) Treinamento sem aulas exibe aviso "Sem conteúdo disponível" e bloqueia conclusão
  it('j) Treinamento sem aulas exibe "Sem conteúdo disponível" e TreinamentoCard exibe badge', () => {
    // 1. TreinamentoViewer com 0 aulas
    const { unmount: unmountViewer } = renderWithProviders(
      <TreinamentoViewer treinamento={mockTreinamentoPadrao} modulos={[]} />
    );

    expect(screen.getByText(/Sem conteúdo disponível/i)).toBeInTheDocument();
    expect(screen.getByText(/Este treinamento ainda não possui módulos e aulas cadastrados/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir Treinamento/i })).not.toBeInTheDocument();
    unmountViewer();

    // 2. TreinamentoCard exibe badge "Sem conteúdo disponível"
    const { unmount: unmountCard } = renderWithProviders(
      <TreinamentoCard
        treinamento={{ ...mockTreinamentoPadrao, total_aulas: 0 }}
        totalAulas={0}
        progresso={null}
      />
    );

    expect(screen.getByText(/Sem conteúdo disponível/i)).toBeInTheDocument();
    unmountCard();
  });
});
