import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CertificateGenerator } from '../CertificateGenerator';
import { useEmitCertificate } from '@/hooks/useCertificates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { toast } from 'sonner';

// Mocks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ role: 'colaborador' }),
}));

const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useCertificates', () => ({
  useEmitCertificate: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useMyCertificate: vi.fn(() => ({ data: null, isLoading: false })),
  useSaveCertificatePDF: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue('certificates/fake.pdf') })),
  getCertificateSignedUrl: vi.fn().mockResolvedValue('https://fake.url'),
}));

vi.mock('@/hooks/useProgressoAula', () => ({
  useProgressoGlobal: vi.fn(() => ({
    data: {
      total_aulas: 2,
      aulas_concluidas: 2,
      percentual: 100,
      quiz_obrigatorio: false,
      quiz_aprovado: false,
      pode_certificar: true,
    },
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/appUrl', () => ({
  getShareBaseUrl: () => 'http://localhost:3000',
}));

describe('ETAPA 9.5 — Emissão de Certificado com Regra de Ouro (CertificateGenerator)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockTreinamento: any = {
    id: 'course-123',
    titulo: 'Treinamento NR-1 Básico',
    tipo: 'pdf',
    origem: 'plataforma',
    gera_certificado: true,
    duracao_estimada_minutos: 120,
  };

  const mockProgresso: any = {
    id: 'prog-123',
    treinamento_id: 'course-123',
    colaborador_id: 'colab-123',
    status: 'concluido',
    concluido_em: '2026-11-05T12:00:00Z',
  };

  it('a) NÃO renderiza o botão emitir quando pode_certificar=false (exibe card informativo)', () => {
    render(
      <CertificateGenerator
        treinamento={mockTreinamento}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="João Teste"
        companyId="comp-123"
        podeCertificar={false}
        progressoGlobal={{
          total_aulas: 3,
          aulas_concluidas: 1,
          percentual: 33.33,
          quiz_obrigatorio: false,
          quiz_aprovado: false,
          pode_certificar: false,
        }}
      />,
      { wrapper }
    );

    // Botão "Gerar Certificado" NÃO deve existir
    expect(screen.queryByRole('button', { name: /Gerar Certificado/i })).not.toBeInTheDocument();

    // Deve exibir card informativo de bloqueio
    expect(screen.getByTestId('card-certificado-bloqueado')).toBeInTheDocument();
    expect(screen.getByText(/Conclua todas as aulas para emitir/i)).toBeInTheDocument();
  });

  it('a.2) Exibe mensagem "Responda a avaliação para emitir" quando quiz obrigatório pendente', () => {
    render(
      <CertificateGenerator
        treinamento={mockTreinamento}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="João Teste"
        companyId="comp-123"
        podeCertificar={false}
        progressoGlobal={{
          total_aulas: 2,
          aulas_concluidas: 2,
          percentual: 100,
          quiz_obrigatorio: true,
          quiz_aprovado: false,
          pode_certificar: false,
        }}
      />,
      { wrapper }
    );

    expect(screen.queryByRole('button', { name: /Gerar Certificado/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Responda a avaliação para emitir/i)).toBeInTheDocument();
  });

  it('a.3) Exibe mensagem "Treinamento sem conteúdo cadastrado" quando total_aulas = 0', () => {
    render(
      <CertificateGenerator
        treinamento={mockTreinamento}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="João Teste"
        companyId="comp-123"
        podeCertificar={false}
        progressoGlobal={{
          total_aulas: 0,
          aulas_concluidas: 0,
          percentual: 0,
          quiz_obrigatorio: false,
          quiz_aprovado: false,
          pode_certificar: false,
        }}
      />,
      { wrapper }
    );

    expect(screen.queryByRole('button', { name: /Gerar Certificado/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Treinamento sem conteúdo cadastrado/i)).toBeInTheDocument();
  });

  it('b) Renderiza quando pode_certificar=true e gera_certificado=true', () => {
    render(
      <CertificateGenerator
        treinamento={mockTreinamento}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="João Teste"
        companyId="comp-123"
        podeCertificar={true}
        progressoGlobal={{
          total_aulas: 2,
          aulas_concluidas: 2,
          percentual: 100,
          quiz_obrigatorio: false,
          quiz_aprovado: false,
          pode_certificar: true,
        }}
      />,
      { wrapper }
    );

    // Botão deve ser renderizado e visível
    const btn = screen.getByRole('button', { name: /Gerar Certificado/i });
    expect(btn).toBeInTheDocument();
    expect(screen.queryByTestId('card-certificado-bloqueado')).not.toBeInTheDocument();
  });

  it('c) Link externo nunca renderiza certificado (Etapa 8.7 preservada)', () => {
    const cursoLink = {
      ...mockTreinamento,
      tipo: 'link',
      gera_certificado: false,
    };

    const { container } = render(
      <CertificateGenerator
        treinamento={cursoLink}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="João Teste"
        companyId="comp-123"
        podeCertificar={true}
      />,
      { wrapper }
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: /Gerar Certificado/i })).not.toBeInTheDocument();
  });

  it('d) Emissão chama useEmitCertificate com os parâmetros corretos', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      id: 'cert-real-uuid',
      certificate_code: 'CERT-2026-ABCD1234',
      issue_date: '2026-11-05T12:00:00Z',
    });

    render(
      <CertificateGenerator
        treinamento={mockTreinamento}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="João Teste"
        companyId="comp-123"
        podeCertificar={true}
      />,
      { wrapper }
    );

    const btn = screen.getByRole('button', { name: /Gerar Certificado/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          treinamentoId: 'course-123',
        })
      );
    });
  });

  it('e) Erro na emissão da RPC exibe mensagem específica no toast', async () => {
    const rpcErroMsg = 'Requisitos de conclusão não atendidos (aulas ou avaliação pendentes).';
    mockMutateAsync.mockRejectedValueOnce(new Error(rpcErroMsg));

    render(
      <CertificateGenerator
        treinamento={mockTreinamento}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="João Teste"
        companyId="comp-123"
        podeCertificar={true}
      />,
      { wrapper }
    );

    const btn = screen.getByRole('button', { name: /Gerar Certificado/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(rpcErroMsg);
    });
  });
});
