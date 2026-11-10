import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ModuloFormDialog } from '../ModuloFormDialog';
import { AulaFormDialog } from '../AulaFormDialog';
import { QuizPerguntaDialog } from '../QuizPerguntaDialog';
import { CurriculoManager } from '../CurriculoManager';
import { Treinamento } from '@/hooks/useTreinamentos';
import { toast } from 'sonner';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'treinamentos/test.pdf' }, error: null }),
      })),
    },
  },
}));

// Mock Curriculo hook
const mockModulos = [
  {
    id: 'mod-1',
    treinamento_id: 't-123',
    titulo: 'Módulo 1: Introdução',
    descricao: 'Fundamentos iniciais',
    ordem: 0,
    aulas: [
      {
        id: 'aula-1',
        modulo_id: 'mod-1',
        treinamento_id: 't-123',
        titulo: 'Aula 1 - Apresentação',
        descricao: null,
        tipo: 'video' as const,
        url_conteudo: 'https://youtube.com/watch?v=123',
        duracao_minutos: 15,
        ordem: 0,
        obrigatoria: true,
        tempo_minimo_segundos: 0,
      },
      {
        id: 'aula-2',
        modulo_id: 'mod-1',
        treinamento_id: 't-123',
        titulo: 'Aula 2 - Material PDF',
        descricao: null,
        tipo: 'pdf' as const,
        url_conteudo: 'https://storage/doc.pdf',
        duracao_minutos: 20,
        ordem: 1,
        obrigatoria: true,
        tempo_minimo_segundos: 0,
      },
    ],
  },
];

vi.mock('@/hooks/useTreinamentoCurriculo', () => ({
  useCurriculo: vi.fn(() => ({
    data: mockModulos,
    isLoading: false,
  })),
  useCreateModulo: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useUpdateModulo: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useDeleteModulo: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useDeleteAula: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useUpsertAula: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useReordenarAulas: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useReordenarModulos: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
}));

vi.mock('@/hooks/useQuizAdmin', () => ({
  useAdminQuizPerguntas: vi.fn(() => ({ data: [], isLoading: false })),
  useTreinamentoStats: vi.fn(() => ({ data: { tentativasCount: 2, certificadosCount: 5 }, isLoading: false })),
  useCreateQuizPergunta: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useUpdateQuizPergunta: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useDeleteQuizPergunta: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useReordenarQuizPerguntas: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
  useUpdateQuizConfig: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })),
}));

describe('ETAPA 9.6 — CRUD de Módulos, Aulas e Quiz (Passo 8.1 Validações)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const mockTreinamento: Treinamento = {
    id: 't-123',
    company_id: 'c-1',
    categoria_id: null,
    titulo: 'Treinamento de Segurança',
    descricao: 'Descrição',
    tipo: 'video',
    url_conteudo: 'https://video.com',
    nome_arquivo: null,
    duracao_estimada_minutos: 60,
    nivel: 'Básico',
    idioma: 'pt-BR',
    tags: [],
    tempo_minimo_minutos: 30,
    quiz_obrigatorio: true,
    termo_ciencia_obrigatorio: false,
    texto_termo_ciencia: null,
    status: 'publicado',
    publicado_em: '2026-01-01',
    publicado_por_user_id: 'u-1',
    obrigatorio: false,
    target_company_ids: null,
    target_contract_types: null,
    capa_path: null,
    destaque: false,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  // a) Validação de título de módulo (< 3 char recusa, > 120 recusa)
  it('a) valida título de módulo (< 3 caracteres recusa)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ModuloFormDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const inputTitulo = screen.getByLabelText(/Título do Módulo/i);
    const btnSubmit = screen.getByRole('button', { name: /Criar módulo/i });

    // Digita apenas 2 caracteres
    fireEvent.change(inputTitulo, { target: { value: 'AB' } });
    fireEvent.click(btnSubmit);

    expect(await screen.findByText(/O título deve ter entre 3 e 120 caracteres/i)).toBeInTheDocument();
  });

  // b) Validação de descrição de módulo (> 2000 recusa)
  it('b) valida descrição de módulo (> 2000 caracteres recusa)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ModuloFormDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const inputTitulo = screen.getByLabelText(/Título do Módulo/i);
    const inputDesc = screen.getByLabelText(/Descrição/i);
    const btnSubmit = screen.getByRole('button', { name: /Criar módulo/i });

    fireEvent.change(inputTitulo, { target: { value: 'Módulo Válido' } });
    // Descrição com mais de 2000 caracteres
    fireEvent.change(inputDesc, { target: { value: 'x'.repeat(2001) } });
    fireEvent.click(btnSubmit);

    expect(await screen.findByText(/A descrição não pode exceder 2000 caracteres/i)).toBeInTheDocument();
  });

  // c) Validação de título de aula (< 3 recusa, > 120 recusa)
  it('c) valida título de aula (< 3 caracteres recusa)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AulaFormDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          moduloId="mod-1"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const inputTitulo = screen.getByLabelText(/Título da Aula/i);
    const btnSubmit = screen.getByRole('button', { name: /Adicionar aula/i });

    fireEvent.change(inputTitulo, { target: { value: 'Oi' } });
    fireEvent.click(btnSubmit);

    expect(await screen.findByText(/O título deve ter entre 3 e 120 caracteres/i)).toBeInTheDocument();
  });

  // d) Validação de URL de aula (invalida recusa, exceto texto)
  it('d) valida URL de aula (URL inválida recusa)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AulaFormDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          moduloId="mod-1"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const inputTitulo = screen.getByLabelText(/Título da Aula/i);
    fireEvent.change(inputTitulo, { target: { value: 'Aula com URL inválida' } });

    // Alternar para modo URL
    const btnModoUrl = screen.getByRole('button', { name: /Usar URL Direta/i });
    fireEvent.click(btnModoUrl);

    const inputUrl = screen.getByLabelText(/URL Direta do Arquivo/i);
    fireEvent.change(inputUrl, { target: { value: 'htp://nao-e-uma-url' } });

    const btnSubmit = screen.getByRole('button', { name: /Adicionar aula/i });
    fireEvent.click(btnSubmit);

    expect(await screen.findByText(/Informe uma URL válida/i)).toBeInTheDocument();
  });

  // e) Upload de arquivo > 50MB recusa no cliente com mensagem clara
  it('e) recusa upload de arquivo acima de 50MB no cliente', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AulaFormDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          moduloId="mod-1"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Criar arquivo simulado com 51MB
    const bigFile = new File(['x'.repeat(100)], 'livro.pdf', { type: 'application/pdf' });
    Object.defineProperty(bigFile, 'size', { value: 51 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    expect(toast.error).toHaveBeenCalledWith('O arquivo excede o limite máximo permitido de 50 MB.');
  });

  // f) Extensão não permitida recusa com mensagem clara
  it('f) recusa upload de extensão não permitida (.exe)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AulaFormDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          moduloId="mod-1"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    const forbiddenFile = new File(['content'], 'virus.exe', { type: 'application/x-msdownload' });

    fireEvent.change(fileInput, { target: { files: [forbiddenFile] } });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Extensão não permitida')
    );
  });

  // g) Validação de pergunta: < 5 ou > 1000 char recusa
  it('g) valida enunciado de pergunta (< 5 caracteres recusa)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QuizPerguntaDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const inputEnunciado = screen.getByLabelText(/Enunciado da Questão/i);
    const btnSubmit = screen.getByRole('button', { name: /Adicionar questão/i });

    fireEvent.change(inputEnunciado, { target: { value: 'Qual' } }); // 4 chars
    fireEvent.click(btnSubmit);

    expect(await screen.findByText(/O enunciado deve ter entre 5 e 1000 caracteres/i)).toBeInTheDocument();
  });

  // h) Validação de alternativas: < 2 ou > 6 recusa
  it('h) impede menos de 2 alternativas e bloqueia adição além de 6', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QuizPerguntaDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const btnAddAlt = screen.getByRole('button', { name: /Adicionar Alternativa/i });

    // Dialog inicia com 3 alternativas (A, B, C). Clicamos para adicionar até chegar em 6
    fireEvent.click(btnAddAlt); // 4
    fireEvent.click(btnAddAlt); // 5
    fireEvent.click(btnAddAlt); // 6
    expect(btnAddAlt).toBeDisabled();

    // Se remover até 2 alternativas, botão de lixeira fica desabilitado
    const removeButtons = screen.getAllByTitle(/Remover alternativa/i);
    fireEvent.click(removeButtons[0]); // 5
    const removeButtons2 = screen.getAllByTitle(/Remover alternativa/i);
    fireEvent.click(removeButtons2[0]); // 4
    const removeButtons3 = screen.getAllByTitle(/Remover alternativa/i);
    fireEvent.click(removeButtons3[0]); // 3
    const removeButtons4 = screen.getAllByTitle(/Remover alternativa/i);
    fireEvent.click(removeButtons4[0]); // 2

    // Com 2 alternativas, todos os botões de remover devem estar desabilitados
    const remainingRemoves = screen.getAllByTitle(/Remover alternativa/i);
    expect(remainingRemoves.length).toBe(2);
    expect(remainingRemoves[0]).toBeDisabled();
    expect(remainingRemoves[1]).toBeDisabled();
  });

  // i) Validação de alternativas vazias
  it('i) recusa submissão quando alternativas têm texto em branco', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <QuizPerguntaDialog
          open={true}
          onOpenChange={vi.fn()}
          treinamentoId="t-123"
          proximaOrdem={0}
        />
      </QueryClientProvider>
    );

    const inputEnunciado = screen.getByLabelText(/Enunciado da Questão/i);
    fireEvent.change(inputEnunciado, { target: { value: 'Qual a norma regulamentadora de segurança geral?' } });

    // Alternativas vazias
    const btnSubmit = screen.getByRole('button', { name: /Adicionar questão/i });
    fireEvent.click(btnSubmit);

    expect(await screen.findByText(/Todas as alternativas devem ter texto preenchido/i)).toBeInTheDocument();
  });

  // j) Modal de exclusão de módulo exibe contagem de aulas a serem removidas
  it('j) modal de exclusão de módulo exibe contagem de aulas a serem removidas em cascata', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CurriculoManager treinamento={mockTreinamento} />
      </QueryClientProvider>
    );

    // Clica no botão de excluir o primeiro módulo
    const btnExcluirModulo = screen.getByTitle(/Excluir módulo/i);
    fireEvent.click(btnExcluirModulo);

    // Deve abrir o dialog informando que tem 2 aulas
    expect(await screen.findByText(/Excluir módulo\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Este módulo possui/i)).toBeInTheDocument();
    expect(screen.getByText(/aula\(s\) cadastrada\(s\) que também serão excluídas em cascata/i)).toBeInTheDocument();
    expect(screen.getByText(/Este módulo possui/i).parentElement?.textContent).toContain('2');
  });
});