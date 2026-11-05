import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { QuizPlayer } from '../QuizPlayer';
import { supabase } from '@/integrations/supabase/client';
import { TreinamentoProgresso } from '@/hooks/useTreinamentoProgresso';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-aluno-1' } },
      }),
    },
  },
}));

describe('ETAPA 9.4 — QuizPlayer: Avaliação, Correção Server-Side e Gabarito', () => {
  let queryClient: QueryClient;

  const mockPerguntas = [
    {
      id: 'perg-1',
      treinamento_id: 'trein-1',
      enunciado: 'Qual é o objetivo principal da NR-1?',
      alternativas: [
        'Apenas aplicar multas às empresas',
        'Estabelecer as disposições gerais e o Gerenciamento de Riscos Ocupacionais (GRO)',
        'Extinguir a CIPA das pequenas empresas',
        'Substituir a CLT',
      ],
      ordem: 1,
    },
    {
      id: 'perg-2',
      treinamento_id: 'trein-1',
      enunciado: 'Quem é responsável pela implementação das medidas de prevenção do PGR?',
      alternativas: [
        'O colaborador individualmente',
        'A organização empregadora',
        'O sindicato dos trabalhadores',
        'Apenas o Ministério do Trabalho',
      ],
      ordem: 2,
    },
  ];

  const mockProgresso: TreinamentoProgresso = {
    id: 'prog-1',
    treinamento_id: 'trein-1',
    colaborador_id: 'colab-1',
    status: 'em_andamento',
    tempo_total_minutos: 40,
    quiz_tentativas: 0,
    quiz_melhor_nota: null,
    quiz_aprovado: false,
    quiz_data_aprovacao: null,
    termo_aceito: false,
    termo_aceito_em: null,
    termo_ip: null,
    concluido_em: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    });

    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === 'get_quiz_perguntas') {
        return Promise.resolve({
          data: mockPerguntas,
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {ui}
      </QueryClientProvider>
    );
  };

  // a) Bloco de avaliação bloqueado com aulas pendentes
  it('a) Exibe estado BLOQUEADO quando há aulas pendentes', () => {
    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={false}
        totalAulas={5}
        aulasConcluidas={3}
      />
    );

    expect(screen.getByText(/Avaliação bloqueada/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Conclua todas as aulas para liberar a avaliação\. \(3 de 5 aulas\)/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar avaliação/i })).not.toBeInTheDocument();
  });

  // b) Bloco liberado com 100% das aulas obrigatórias
  it('b) Exibe estado DISPONÍVEL com botão "Iniciar avaliação" quando 100% das aulas estão completas', async () => {
    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={true}
        totalAulas={5}
        aulasConcluidas={5}
        notaMinima={70}
        tentativasMaximas={3}
      />
    );

    expect(screen.getByText(/Avaliação do Treinamento/i)).toBeInTheDocument();
    expect(screen.getByText(/nota mínima 70%, até 3 tentativas/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar avaliação/i })).not.toBeDisabled();
    });
  });

  // h) resposta_correta NUNCA aparece antes do envio
  it('h) Resposta correta e gabarito NUNCA aparecem antes de finalizar o quiz', async () => {
    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar avaliação/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar avaliação/i }));

    await waitFor(() => {
      expect(screen.getByText(/Qual é o objetivo principal da NR-1\?/i)).toBeInTheDocument();
    });

    // As alternativas estão visíveis, mas NÃO há indicação de resposta correta
    expect(screen.queryByText(/Resposta correta/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Gabarito/i)).not.toBeInTheDocument();
  });

  // c) Botão "Enviar respostas" desabilitado até responder tudo
  it('c) Botão "Enviar respostas" permanece desabilitado até responder todas as perguntas', async () => {
    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar avaliação/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar avaliação/i }));

    await waitFor(() => {
      expect(screen.getByText(/Qual é o objetivo principal da NR-1\?/i)).toBeInTheDocument();
    });

    const btnEnviar = screen.getByRole('button', { name: /Enviar respostas/i });
    expect(btnEnviar).toBeDisabled();

    // Responder apenas a pergunta 1
    const opt1 = screen.getByText(/Estabelecer as disposições gerais e o Gerenciamento de Riscos/i);
    fireEvent.click(opt1);

    // Ainda tem a pergunta 2 pendente -> continua desabilitado
    expect(btnEnviar).toBeDisabled();

    // Responder a pergunta 2
    const opt2 = screen.getByText(/A organização empregadora/i);
    fireEvent.click(opt2);

    // Agora todas respondidas -> botão habilitado
    expect(btnEnviar).not.toBeDisabled();
  });

  // d) Após envio: exibe nota, selo e gabarito com explicações
  it('d) Após envio bem-sucedido: exibe nota, selo APROVADO e gabarito com explicações', async () => {
    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === 'get_quiz_perguntas') {
        return Promise.resolve({ data: mockPerguntas, error: null });
      }
      if (name === 'corrigir_quiz_tentativa') {
        return Promise.resolve({
          data: {
            tentativa_id: 'tent-123',
            nota: 100,
            nota_minima: 70,
            aprovado: true,
            acertos: 2,
            total_perguntas: 2,
            tentativas_restantes: 2,
            gabarito: [
              {
                pergunta_id: 'perg-1',
                enunciado: 'Qual é o objetivo principal da NR-1?',
                resposta_usuario: 'Estabelecer as disposições gerais e o Gerenciamento de Riscos Ocupacionais (GRO)',
                resposta_correta: 'Estabelecer as disposições gerais e o Gerenciamento de Riscos Ocupacionais (GRO)',
                correta: true,
                explicacao: 'A NR-1 estabelece o campo de aplicação e as diretrizes gerais para o GRO.',
              },
              {
                pergunta_id: 'perg-2',
                enunciado: 'Quem é responsável pela implementação das medidas de prevenção do PGR?',
                resposta_usuario: 'A organização empregadora',
                resposta_correta: 'A organização empregadora',
                correta: true,
                explicacao: 'Cabe ao empregador implementar as medidas de segurança e saúde ocupacional.',
              },
            ],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar avaliação/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar avaliação/i }));

    await waitFor(() => {
      expect(screen.getByText(/Qual é o objetivo principal da NR-1\?/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Estabelecer as disposições gerais e o Gerenciamento de Riscos/i));
    fireEvent.click(screen.getByText(/A organização empregadora/i));

    fireEvent.click(screen.getByRole('button', { name: /Enviar respostas/i }));

    await waitFor(() => {
      expect(screen.getByText(/Aprovado na Avaliação!/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/100.0%/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 2/i)).toBeInTheDocument();
    expect(screen.getByText('APROVADO')).toBeInTheDocument();

    // Gabarito e explicações pedagógicas
    expect(screen.getByText(/Gabarito da Avaliação/i)).toBeInTheDocument();
    expect(
      screen.getByText(/A NR-1 estabelece o campo de aplicação e as diretrizes gerais para o GRO\./i)
    ).toBeInTheDocument();
  });

  // e) Aprovado -> botão "Continuar", sem "Tentar novamente"
  it('e) Usuário aprovado vê botão "Continuar" e não tem opção de tentar novamente', async () => {
    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === 'get_quiz_perguntas') {
        return Promise.resolve({ data: mockPerguntas, error: null });
      }
      if (name === 'corrigir_quiz_tentativa') {
        return Promise.resolve({
          data: {
            tentativa_id: 'tent-123',
            nota: 100,
            nota_minima: 70,
            aprovado: true,
            acertos: 2,
            total_perguntas: 2,
            tentativas_restantes: 2,
            gabarito: [],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    const onApprovedMock = vi.fn();

    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={true}
        onQuizApproved={onApprovedMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar avaliação/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar avaliação/i }));

    await waitFor(() => {
      expect(screen.getByText(/Qual é o objetivo principal da NR-1\?/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Estabelecer as disposições gerais e o Gerenciamento de Riscos/i));
    fireEvent.click(screen.getByText(/A organização empregadora/i));

    fireEvent.click(screen.getByRole('button', { name: /Enviar respostas/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Continuar/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Tentar novamente/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Continuar/i }));
    expect(onApprovedMock).toHaveBeenCalled();
  });

  // f) Reprovado com tentativas restantes -> "Tentar novamente"
  it('f) Usuário reprovado com tentativas restantes vê botão "Tentar novamente"', async () => {
    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === 'get_quiz_perguntas') {
        return Promise.resolve({ data: mockPerguntas, error: null });
      }
      if (name === 'corrigir_quiz_tentativa') {
        return Promise.resolve({
          data: {
            tentativa_id: 'tent-rep',
            nota: 50,
            nota_minima: 70,
            aprovado: false,
            acertos: 1,
            total_perguntas: 2,
            tentativas_restantes: 2,
            gabarito: [
              {
                pergunta_id: 'perg-1',
                enunciado: 'Qual é o objetivo principal da NR-1?',
                resposta_usuario: 'Apenas aplicar multas às empresas',
                resposta_correta: 'Estabelecer as disposições gerais e o Gerenciamento de Riscos Ocupacionais (GRO)',
                correta: false,
                explicacao: 'A NR-1 foca em prevenção e GRO.',
              },
            ],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar avaliação/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar avaliação/i }));

    await waitFor(() => {
      expect(screen.getByText(/Qual é o objetivo principal da NR-1\?/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Apenas aplicar multas às empresas/i));
    fireEvent.click(screen.getByText(/A organização empregadora/i));

    fireEvent.click(screen.getByRole('button', { name: /Enviar respostas/i }));

    await waitFor(() => {
      expect(screen.getByText('REPROVADO')).toBeInTheDocument();
    });

    expect(screen.getByText(/50.0%/i)).toBeInTheDocument();
    const btnTentarNovamente = screen.getByRole('button', { name: /Tentar novamente/i });
    expect(btnTentarNovamente).toBeInTheDocument();

    // Clicar em tentar novamente reinicia o questionário
    fireEvent.click(btnTentarNovamente);
    expect(screen.getByText(/Questão 1/i)).toBeInTheDocument();
  });

  // g) Reprovado sem tentativas -> "Tentativas esgotadas"
  it('g) Usuário reprovado sem tentativas restantes vê estado "Tentativas esgotadas"', async () => {
    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === 'get_quiz_perguntas') {
        return Promise.resolve({ data: mockPerguntas, error: null });
      }
      if (name === 'corrigir_quiz_tentativa') {
        return Promise.resolve({
          data: {
            tentativa_id: 'tent-fim',
            nota: 40,
            nota_minima: 70,
            aprovado: false,
            acertos: 0,
            total_perguntas: 2,
            tentativas_restantes: 0,
            gabarito: [],
          },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });

    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={mockProgresso}
        aulasCompletas={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Iniciar avaliação/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /Iniciar avaliação/i }));

    await waitFor(() => {
      expect(screen.getByText(/Qual é o objetivo principal da NR-1\?/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Apenas aplicar multas às empresas/i));
    fireEvent.click(screen.getByText(/O sindicato dos trabalhadores/i));

    fireEvent.click(screen.getByRole('button', { name: /Enviar respostas/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tentativas esgotadas/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Tentar novamente/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Contate o RH para orientações/i)).toBeInTheDocument();
  });

  // i & j) Integração com Regra de Ouro (quiz reprovado vs aprovado)
  it('i & j) Estado já aprovado de sessões anteriores é renderizado em card de sucesso permanente', () => {
    const progressoAprovado: TreinamentoProgresso = {
      ...mockProgresso,
      quiz_aprovado: true,
      quiz_melhor_nota: 95,
      quiz_tentativas: 1,
    };

    renderWithProviders(
      <QuizPlayer
        treinamentoId="trein-1"
        progresso={progressoAprovado}
        aulasCompletas={true}
      />
    );

    expect(screen.getByText(/Avaliação Aprovada/i)).toBeInTheDocument();
    expect(screen.getByText(/Aprovado com nota 95.0%/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Iniciar avaliação/i })).not.toBeInTheDocument();
  });
});
