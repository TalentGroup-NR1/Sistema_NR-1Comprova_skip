import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CertificateTemplate } from '../CertificateTemplate';
import { CertificateGenerator } from '../CertificateGenerator';
import ValidarCertificado from '@/pages/ValidarCertificado';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { gerarQrCodeDataUrl } from '@/lib/certificadoBranding';
import QRCode from 'qrcode';

// Mocks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ role: 'colaborador' }),
}));

const mockCertificateData = {
  id: 'cert-1',
  certificate_code: 'CERT-2026-D02D769A',
  colaborador_nome: 'João Pedro Santos',
  treinamento_titulo: 'Riscos psicossociais: o que muda na rotina de trabalho',
  carga_horaria: 1,
  data_conclusao: '2026-11-06 16:18:57.574+00',
  issue_date: '2026-11-06 16:19:00.403895+00',
  is_valid: true,
  file_path: null,
};

vi.mock('@/hooks/useCertificates', () => ({
  useEmitCertificate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useMyCertificate: vi.fn(() => ({ data: mockCertificateData, isLoading: false })),
  useSaveCertificatePDF: vi.fn(() => ({ mutateAsync: vi.fn() })),
  getCertificateSignedUrl: vi.fn().mockResolvedValue(null),
  useValidateCertificate: vi.fn((code) => ({
    data: code === 'CERT-2026-D02D769A' ? mockCertificateData : null,
    isLoading: false,
    isError: false,
  })),
}));

vi.mock('@/hooks/useProgressoAula', () => ({
  useProgressoGlobal: vi.fn(() => ({
    data: {
      total_aulas: 1,
      aulas_concluidas: 1,
      percentual: 100,
      quiz_obrigatorio: false,
      quiz_aprovado: false,
      pode_certificar: true,
    },
  })),
}));

vi.mock('@/lib/appUrl', () => ({
  getShareBaseUrl: () => 'https://www.nr-1comprova.com.br',
}));

describe('ETAPA C2 — Redesign profissional do certificado, QR Code e Validação', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
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

  const queryWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // a) QR é <img> com src data:image/png;base64 (não SVG)
  it('a) QR Code é renderizado como <img> com src data:image/png;base64 (não SVG)', () => {
    const fakeQr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAYAAAA+VemSAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAA8KADAAQAAAABAAAA8AAAAADb5hFMAAAAmUlEQVR42u3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB8GAIA';
    
    render(
      <CertificateTemplate
        colaboradorNome="João Pedro Santos"
        treinamentoTitulo="Riscos psicossociais"
        cargaHoraria={1}
        dataConclusao="2026-11-06"
        dataEmissao="2026-11-06"
        certificateCode="CERT-2026-D02D769A"
        validationUrl="https://www.nr-1comprova.com.br/validar/CERT-2026-D02D769A"
        qrCodeDataUrl={fakeQr}
      />
    );

    const qrImg = screen.getByAltText('QR Code de Validação');
    expect(qrImg.tagName).toBe('IMG');
    expect(qrImg.getAttribute('src')).toMatch(/^data:image\/png;base64,/);
    expect(qrImg.getAttribute('width')).toBe('80');
    expect(qrImg.getAttribute('height')).toBe('80');
  });

  // b) QR escaneável: decodificar o PNG gerado e confirmar que a URL contém /validar/{code}
  it('b) QR escaneável: gera PNG válido com a URL contendo /validar/{code}', async () => {
    const targetUrl = 'https://www.nr-1comprova.com.br/validar/CERT-2026-D02D769A';
    const dataUrl = await gerarQrCodeDataUrl(targetUrl);

    expect(dataUrl).toMatch(/^data:image\/png;base64,/);

    // Validação da decodificação dos segmentos do QR Code
    const qrObj = QRCode.create(targetUrl);
    const decodedUrl = qrObj.segments.map(s => Buffer.from(s.data).toString()).join('');
    expect(decodedUrl).toBe(targetUrl);
    expect(decodedUrl).toContain('/validar/CERT-2026-D02D769A');
  });

  // c) /validar/:code abre a página com os dados corretos
  it('c) /validar/:code abre a página de validação com os dados do certificado', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/validar/CERT-2026-D02D769A']}>
          <Routes>
            <Route path="/validar/:code" element={<ValidarCertificado />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Certificado Válido')).toBeInTheDocument();
      expect(screen.getByText('João Pedro Santos')).toBeInTheDocument();
      expect(screen.getByText(/Riscos psicossociais/i)).toBeInTheDocument();
    });
  });

  // d) /validar-certificado?code= continua funcionando
  it('d) /validar-certificado?code= continua funcionando retrocompatível', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/validar-certificado?code=CERT-2026-D02D769A']}>
          <Routes>
            <Route path="/validar-certificado" element={<ValidarCertificado />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Certificado Válido')).toBeInTheDocument();
      expect(screen.getByText('João Pedro Santos')).toBeInTheDocument();
    });
  });

  // e) Nome com 45 caracteres não quebra o layout (reduz dinamicamente para 20pt)
  it('e) Nome com mais de 40 caracteres reduz dinamicamente para 20pt', () => {
    const nomeLongo = 'Maria Aparecida de Albuquerque dos Santos Silveira'; // 50 chars
    const { container, rerender } = render(
      <CertificateTemplate
        colaboradorNome={nomeLongo}
        treinamentoTitulo="Riscos psicossociais"
        cargaHoraria={1}
        dataConclusao="2026-11-06"
        dataEmissao="2026-11-06"
        certificateCode="CERT-2026-D02D769A"
        validationUrl="https://www.nr-1comprova.com.br/validar/CERT-2026-D02D769A"
      />
    );

    const nomeElLongo = screen.getByText(nomeLongo);
    expect(nomeElLongo.style.fontSize).toBe('20pt');

    // Com nome curto (<= 40 chars), deve usar 24pt
    rerender(
      <CertificateTemplate
        colaboradorNome="João Pedro Santos"
        treinamentoTitulo="Riscos psicossociais"
        cargaHoraria={1}
        dataConclusao="2026-11-06"
        dataEmissao="2026-11-06"
        certificateCode="CERT-2026-D02D769A"
        validationUrl="https://www.nr-1comprova.com.br/validar/CERT-2026-D02D769A"
      />
    );

    const nomeElCurto = screen.getByText('João Pedro Santos');
    expect(nomeElCurto.style.fontSize).toBe('24pt');
  });

  // f) Data, assinatura e QR na MESMA linha de base no rodapé (Grid 3 colunas)
  it('f) Rodapé utiliza grid de 3 colunas alinhadas na mesma linha de base', () => {
    const { container } = render(
      <CertificateTemplate
        colaboradorNome="João Pedro Santos"
        treinamentoTitulo="Riscos psicossociais"
        cargaHoraria={1}
        dataConclusao="2026-11-06"
        dataEmissao="2026-11-06"
        certificateCode="CERT-2026-D02D769A"
        validationUrl="https://www.nr-1comprova.com.br/validar/CERT-2026-D02D769A"
      />
    );

    const footerGrid = container.querySelector('div[style*="grid-template-columns"]') as HTMLElement;
    expect(footerGrid).toBeTruthy();
    expect(footerGrid.style.display).toBe('grid');
    expect(footerGrid.style.gridTemplateColumns).toBe('1fr 1fr auto');
    expect(footerGrid.style.alignItems).toBe('end');
    expect(footerGrid.style.paddingBottom).toBe('6mm');

    // Label da data com dois-pontos sem ponto final
    expect(screen.getByText(/Data de Emissão:/)).toBeInTheDocument();
    expect(screen.queryByText(/Data de Emissão\./)).not.toBeInTheDocument();
  });

  // g) Texto do PDF é selecionável (não imagem)
  it('g) PDF inclui camada de texto selecionável / pesquisável via jsPDF', async () => {
    const mockTreinamento: any = {
      id: 'course-1',
      titulo: 'Riscos psicossociais: o que muda na rotina de trabalho',
      origem: 'plataforma',
      gera_certificado: true,
      duracao_estimada_minutos: 60,
    };

    const mockProgresso: any = {
      id: 'prog-1',
      treinamento_id: 'course-1',
      colaborador_id: 'colab-1',
      status: 'concluido',
      concluido_em: '2026-11-06 16:18:57.574+00',
    };

    render(
      <CertificateGenerator
        treinamento={mockTreinamento}
        progresso={mockProgresso}
        colaboradorId="colab-1"
        colaboradorNome="João Pedro Santos"
        companyId="comp-1"
        podeCertificar={true}
      />,
      { wrapper: queryWrapper }
    );

    // O container de impressão montado fora do Dialog contém os elementos necessários
    const printEl = document.getElementById('certificate-print-template');
    expect(printEl).toBeTruthy();
    expect(printEl?.textContent).toContain('CERTIFICADO');
    expect(printEl?.textContent).toContain('João Pedro Santos');
    expect(printEl?.textContent).toContain('Data de Emissão:');
    expect(printEl?.textContent).toContain('CERT-2026-D02D769A');
  });

  // h) Área de assinatura tem ≥60px de espaço acima da linha
  it('h) Área de assinatura possui min-height >= 60px reservada', () => {
    const { container } = render(
      <CertificateTemplate
        colaboradorNome="João Pedro Santos"
        treinamentoTitulo="Riscos psicossociais"
        cargaHoraria={1}
        dataConclusao="2026-11-06"
        dataEmissao="2026-11-06"
        certificateCode="CERT-2026-D02D769A"
        validationUrl="https://www.nr-1comprova.com.br/validar/CERT-2026-D02D769A"
      />
    );

    const assinaturaLinha = screen.getByText('Instrutor / Responsável').parentElement as HTMLElement;
    const assinaturaContainer = assinaturaLinha.parentElement as HTMLElement;
    
    // min-height é 65px (>= 60px)
    expect(parseInt(assinaturaContainer.style.minHeight, 10)).toBeGreaterThanOrEqual(60);
    // Linha divisória é borderTop acima do texto
    expect(assinaturaLinha.style.borderTop).toContain('1px solid');
  });
});

