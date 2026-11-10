import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CertificateGenerator } from '../CertificateGenerator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  resolverLogoCertificado, 
  extrairDataConclusaoCanonica, 
  formatarDataConclusao, 
  LOGO_PLATAFORMA, 
  NOME_PLATAFORMA 
} from '@/lib/certificadoBranding';
import html2canvas from 'html2canvas';

// Mocks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ role: 'colaborador' }),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(async (_element: HTMLElement) => ({
    toDataURL: () => 'data:image/png;base64,mockCanvasBase64',
  })),
}));

vi.mock('jspdf', () => ({
  default: class MockJsPDF {
    internal = {
      pageSize: {
        getWidth: () => 297,
        getHeight: () => 210,
      },
    };
    addImage = vi.fn();
    output = vi.fn(() => new Blob(['fake-pdf'], { type: 'application/pdf' }));
  },
}));

const mockCertificateData = {
  id: 'cert-ana-beatriz',
  colaborador_id: 'colab-123',
  treinamento_id: 'course-global-1',
  certificate_code: 'CERT-2026-XYZ987',
  data_conclusao: '2026-11-06 16:18:57.574+00',
  issue_date: '2026-11-06 16:19:00.403895+00',
  file_path: null, // Força a geração on-the-fly via generatePDF()
};

vi.mock('@/hooks/useCertificates', () => ({
  useEmitCertificate: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useMyCertificate: vi.fn(() => ({ data: mockCertificateData, isLoading: false })),
  useSaveCertificatePDF: vi.fn(() => ({ mutateAsync: vi.fn() })),
  getCertificateSignedUrl: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/hooks/useProgressoAula', () => ({
  useProgressoGlobal: vi.fn(() => ({
    data: {
      total_aulas: 3,
      aulas_concluidas: 3,
      percentual: 100,
      quiz_obrigatorio: false,
      quiz_aprovado: false,
      pode_certificar: true,
    },
  })),
}));

vi.mock('@/lib/appUrl', () => ({
  getShareBaseUrl: () => 'http://localhost:3000',
}));

describe('ETAPA C1 — Certificado: Template, Logo por Origem e Data', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL e revokeObjectURL no jsdom
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    }
    if (!globalThis.URL.revokeObjectURL) {
      globalThis.URL.revokeObjectURL = vi.fn();
    }
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockTreinamentoGlobal: any = {
    id: 'course-global-1',
    titulo: 'Riscos psicossociais: o que muda na rotina de trabalho',
    company_id: null,
    origem: 'plataforma',
    gera_certificado: true,
    duracao_estimada_minutos: 60,
  };

  const mockTreinamentoEmpresa: any = {
    id: 'course-empresa-1',
    titulo: 'Treinamento Interno Específico',
    company_id: 'empresa-uuid-1',
    origem: 'empresa',
    gera_certificado: true,
    duracao_estimada_minutos: 120,
  };

  const mockProgresso: any = {
    id: 'prog-123',
    treinamento_id: 'course-global-1',
    colaborador_id: 'colab-123',
    status: 'concluido',
    concluido_em: '2024-11-06T12:00:00Z', // Data divergente antiga proposital para testar prioridade
  };

  // a) resolverLogoCertificado: global → { tipo:'plataforma', nomeExibicao:'NR-1 Comprova' }
  it('a) resolverLogoCertificado: global retorna tipo plataforma e nome NR-1 Comprova', () => {
    const res = resolverLogoCertificado(mockTreinamentoGlobal, {
      name: 'Horizonte Contabilidade',
      logo_url: 'https://storage/logo-horizonte.png',
    });

    expect(res.tipo).toBe('plataforma');
    expect(res.nomeExibicao).toBe(NOME_PLATAFORMA);
    expect(res.logoUrl).toBe(LOGO_PLATAFORMA);
  });

  // b) empresa com logo → { tipo:'empresa', nomeExibicao:<nome> }
  it('b) resolverLogoCertificado: empresa com logo retorna tipo empresa e o nome da empresa', () => {
    const res = resolverLogoCertificado(mockTreinamentoEmpresa, {
      name: 'Horizonte Contabilidade',
      logo_url: 'https://storage/logo-horizonte.png',
    });

    expect(res.tipo).toBe('empresa');
    expect(res.nomeExibicao).toBe('Horizonte Contabilidade');
    expect(res.logoUrl).toBe('https://storage/logo-horizonte.png');
  });

  // c) empresa sem logo → fallback plataforma (logo E nome)
  it('c) resolverLogoCertificado: empresa sem logo faz fallback completo para a plataforma (logo E nome)', () => {
    const res = resolverLogoCertificado(mockTreinamentoEmpresa, {
      name: 'Empresa Sem Logo',
      logo_url: null,
    });

    expect(res.tipo).toBe('plataforma');
    expect(res.nomeExibicao).toBe(NOME_PLATAFORMA);
    expect(res.logoUrl).toBe(LOGO_PLATAFORMA);
  });

  // d) data: existingCertificate.data_conclusao tem prioridade sobre progresso.concluido_em
  it('d) existingCertificate.data_conclusao tem prioridade estrita sobre progresso.concluido_em', () => {
    const dataCanonica = extrairDataConclusaoCanonica(
      { data_conclusao: '2026-11-06 16:18:57.574+00' },
      { concluido_em: '2024-01-01T00:00:00Z' }
    );

    expect(dataCanonica).toBe('2026-11-06 16:18:57.574+00');
  });

  // e) data formatada em America/Sao_Paulo (não shift de 1 dia)
  it('e) data formatada em America/Sao_Paulo exibe ano 2026 sem shift de 1 dia', () => {
    // Timestamp do Postgres
    const textoPg = formatarDataConclusao('2026-11-06 16:18:57.574+00');
    expect(textoPg).toBe('06 de novembro de 2026');

    // ISO string com midnight UTC (onde normalmente ocorreria recuo para 05/11 em UTC-3)
    const textoIsoMidnight = formatarDataConclusao('2026-11-06T00:00:00Z');
    expect(textoIsoMidnight).toBe('06 de novembro de 2026');

    // Date-only YYYY-MM-DD
    const textoDateOnly = formatarDataConclusao('2026-11-06');
    expect(textoDateOnly).toBe('06 de novembro de 2026');
  });

  // f) download funciona com o Dialog FECHADO (regressão do BUG 1)
  it('f) download funciona com o Dialog FECHADO sem lançar erro de template não encontrado', async () => {
    render(
      <CertificateGenerator
        treinamento={mockTreinamentoGlobal}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="Ana Beatriz Martins"
        companyId="empresa-uuid-1"
        companyName="Horizonte Contabilidade"
        companyLogoUrl="https://storage/logo-horizonte.png"
        podeCertificar={true}
      />,
      { wrapper }
    );

    // Dialog está fechado inicialmente
    expect(screen.queryByText('Preview do Certificado')).not.toBeInTheDocument();

    // Botão "Baixar Certificado" deve estar presente
    const btnBaixar = screen.getByRole('button', { name: /Baixar Certificado/i });
    expect(btnBaixar).toBeInTheDocument();

    // Clica para baixar
    fireEvent.click(btnBaixar);

    await waitFor(() => {
      // html2canvas deve ter sido chamado com o container off-screen montado fora do Dialog
      expect(html2canvas).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(html2canvas).mock.calls[0];
    const element = callArgs[0] as HTMLElement;
    expect(element).toBeTruthy();
    expect(element.closest('#certificate-print-template')).toBeTruthy();
  });

  // g) download funciona com o Dialog ABERTO (preview + download)
  it('g) download funciona com o Dialog ABERTO a partir do botão Baixar PDF', async () => {
    render(
      <CertificateGenerator
        treinamento={mockTreinamentoGlobal}
        progresso={mockProgresso}
        colaboradorId="colab-123"
        colaboradorNome="Ana Beatriz Martins"
        companyId="empresa-uuid-1"
        companyName="Horizonte Contabilidade"
        companyLogoUrl="https://storage/logo-horizonte.png"
        podeCertificar={true}
      />,
      { wrapper }
    );

    // Abre o Dialog de preview
    const btnVisualizar = screen.getByRole('button', { name: /Visualizar Certificado/i });
    fireEvent.click(btnVisualizar);

    // Modal deve estar aberto
    await waitFor(() => {
      expect(screen.getByText('Preview do Certificado')).toBeInTheDocument();
    });

    // Clica no botão "Baixar PDF" dentro do Dialog
    const btnBaixarPdf = screen.getByRole('button', { name: /Baixar PDF/i });
    fireEvent.click(btnBaixarPdf);

    await waitFor(() => {
      expect(html2canvas).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(html2canvas).mock.calls[0];
    const element = callArgs[0] as HTMLElement;
    expect(element).toBeTruthy();
    expect(element.closest('#certificate-print-template')).toBeTruthy();
  });
});

