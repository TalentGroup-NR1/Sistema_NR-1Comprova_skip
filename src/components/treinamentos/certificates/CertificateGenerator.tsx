import { useState, useRef, useCallback, useEffect } from "react";
import { Award, Download, Loader2, Eye, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useEmitCertificate, useMyCertificate, useSaveCertificatePDF, getCertificateSignedUrl } from "@/hooks/useCertificates";
import { useProgressoGlobal, ProgressoTreinamentoGlobal } from "@/hooks/useProgressoAula";
import { CertificateTemplate } from "./CertificateTemplate";
import { TreinamentoProgresso } from "@/hooks/useTreinamentoProgresso";
import { Treinamento } from "@/hooks/useTreinamentos";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getShareBaseUrl } from '@/lib/appUrl';
import { isPerfilGestaoEmpresa } from "@/lib/perfis";
import { 
  resolverLogoCertificado, 
  carregarLogoBase64, 
  extrairDataConclusaoCanonica,
  gerarQrCodeDataUrl,
  formatarDataConclusao,
  formatarDataEmissaoCurta,
} from "@/lib/certificadoBranding";

interface CertificateGeneratorProps {
  treinamento: Treinamento;
  progresso: TreinamentoProgresso;
  colaboradorId: string;
  colaboradorNome: string;
  companyId: string;
  companyName?: string;
  companyLogoUrl?: string;
  podeCertificar?: boolean;
  progressoGlobal?: ProgressoTreinamentoGlobal | null;
}

export function CertificateGenerator({
  treinamento,
  progresso,
  colaboradorId,
  colaboradorNome,
  companyId,
  companyName,
  companyLogoUrl,
  podeCertificar: podeCertificarProp,
  progressoGlobal: progressoGlobalProp,
}: CertificateGeneratorProps) {
  const { role } = useAuth();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // AJUSTE 1: refs 100% separadas - previewRef só no Dialog, printRef só no container off-screen
  const previewRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const isAdmin = role === "admin_master" || isPerfilGestaoEmpresa(role);

  const { data: existingCertificate, isLoading: loadingCertificate } = useMyCertificate(
    treinamento?.id,
    colaboradorId
  );

  const { data: progressoGlobalData } = useProgressoGlobal(treinamento?.id);
  const global = progressoGlobalProp ?? progressoGlobalData;
  const podeCertificar = podeCertificarProp !== undefined 
    ? podeCertificarProp 
    : Boolean(global?.pode_certificar);

  const emitCertificate = useEmitCertificate();
  const saveCertificatePDF = useSaveCertificatePDF();

  // AJUSTE 3: Resolver branding (logo + nome de exibição) por origem do treinamento
  const branding = resolverLogoCertificado(treinamento, {
    name: companyName,
    logo_url: companyLogoUrl,
  });

  // URL pública de validação amigável
  const certCode = existingCertificate?.certificate_code;
  const validationUrl = certCode
    ? `${getShareBaseUrl()}/validar/${certCode}`
    : `${getShareBaseUrl()}/validar`;

  // AJUSTE 4: Pré-carregar logo em base64 para evitar canvas tainted no html2canvas
  useEffect(() => {
    let cancelled = false;
    carregarLogoBase64(branding.logoUrl).then((b64) => {
      if (!cancelled) {
        setLogoBase64(b64);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [branding.logoUrl]);

  // AJUSTE 2: Pré-gerar QR Code como PNG base64 puro
  useEffect(() => {
    let cancelled = false;
    gerarQrCodeDataUrl(validationUrl).then((qr) => {
      if (!cancelled) {
        setQrCodeDataUrl(qr);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [validationUrl]);

  // AJUSTE 2: Ordem canônica da data: 1) existingCertificate, 2) progresso, 3) new Date()
  const dataConclusao = extrairDataConclusaoCanonica(existingCertificate, progresso);
  const dataEmissao = existingCertificate?.issue_date || new Date().toISOString();

  // Dados para o template do certificado
  const certificateData = {
    colaboradorNome,
    treinamentoTitulo: treinamento?.titulo || "",
    cargaHoraria: treinamento?.duracao_estimada_minutos 
      ? Math.round(treinamento.duracao_estimada_minutos / 60) 
      : 0,
    dataConclusao,
    dataEmissao,
    certificateCode: existingCertificate?.certificate_code || "PREVIEW",
    validationUrl,
    qrCodeDataUrl,
    companyName: branding.nomeExibicao,
    companyLogoUrl: branding.logoUrl,
  };

  // Função para gerar o PDF
  const generatePDF = useCallback(async (): Promise<Blob> => {
    const el = printRef.current || (document.getElementById("certificate-print-template") as HTMLDivElement | null);
    if (!el) {
      throw new Error("Template não encontrado");
    }

    try {
      // AJUSTE 4: Converter logo para base64 e sincronizar com a tag <img> do template de impressão
      const b64 = logoBase64 || await carregarLogoBase64(branding.logoUrl);
      const imgEl = el.querySelector('img[alt^="Logo"]') as HTMLImageElement | null;
      if (imgEl && b64 && imgEl.src !== b64) {
        imgEl.src = b64;
        await new Promise((resolve) => {
          if (imgEl.complete) {
            resolve(null);
            return;
          }
          const timer = setTimeout(() => resolve(null), 100);
          imgEl.onload = () => {
            clearTimeout(timer);
            resolve(null);
          };
          imgEl.onerror = () => {
            clearTimeout(timer);
            resolve(null);
          };
        });
      }

      // AJUSTE 2: Garantir QR Code como PNG Base64 sincronizado na tag <img>
      const finalQr = qrCodeDataUrl || await gerarQrCodeDataUrl(validationUrl);
      const qrEl = el.querySelector('img[alt^="QR Code"]') as HTMLImageElement | null;
      if (qrEl && finalQr && qrEl.src !== finalQr) {
        qrEl.src = finalQr;
        await new Promise((resolve) => {
          if (qrEl.complete) {
            resolve(null);
            return;
          }
          const timer = setTimeout(() => resolve(null), 100);
          qrEl.onload = () => {
            clearTimeout(timer);
            resolve(null);
          };
          qrEl.onerror = () => {
            clearTimeout(timer);
            resolve(null);
          };
        });
      }

      // Timing no html2canvas: aguarda frame do navegador
      await new Promise(r => requestAnimationFrame(() => r(null)));

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Adiciona camada de texto selecionável / pesquisável no PDF (Passo 4.4 / Teste g)
      if (typeof pdf.internal?.write === 'function') {
        pdf.internal.write('/Tr 3 Tr');
      }
      if (typeof pdf.text === 'function' && typeof pdf.setFontSize === 'function') {
        pdf.setFontSize(26);
        pdf.text("CERTIFICADO", 148.5, 48, { align: "center" });
        pdf.setFontSize(14);
        pdf.text("Certificamos que", 148.5, 75, { align: "center" });
        pdf.setFontSize(22);
        pdf.text(colaboradorNome, 148.5, 92, { align: "center" });
        pdf.setFontSize(13);
        const textoConclusao = `concluiu com êxito o treinamento "${treinamento.titulo}"${
          certificateData.cargaHoraria > 0 ? `, com carga horária de ${certificateData.cargaHoraria} hora${certificateData.cargaHoraria > 1 ? "s" : ""}` : ""
        }, realizado em ${formatarDataConclusao(dataConclusao)}.`;
        pdf.text(textoConclusao, 148.5, 115, { align: "center", maxWidth: 220 });
        pdf.setFontSize(11);
        pdf.text("Para os devidos fins, apresentamos o presente certificado.", 148.5, 138, { align: "center" });

        pdf.setFontSize(10);
        pdf.text("Instrutor / Responsável", 60, 185, { align: "center" });
        pdf.text(`Data de Emissão: ${formatarDataEmissaoCurta(dataEmissao)}`, 148.5, 180, { align: "center" });
        pdf.text(`Código: ${certificateData.certificateCode}`, 148.5, 185, { align: "center" });
        pdf.text(`Escaneie para validar: ${validationUrl}`, 240, 185, { align: "center" });
      }

      return pdf.output("blob");
    } catch (error: any) {
      // AJUSTE 5: Log seguro sem PII (apenas step e mensagem do erro)
      console.error({ step: "generate_pdf", message: error?.message || "Erro ao gerar PDF" });
      throw error;
    }
  }, [branding.logoUrl, logoBase64, qrCodeDataUrl, validationUrl, colaboradorNome, treinamento.titulo, certificateData.cargaHoraria, dataConclusao, dataEmissao, certificateData.certificateCode]);

  // Handler para gerar certificado
  const handleGenerateCertificate = async () => {
    if (existingCertificate) {
      setPreviewOpen(true);
      return;
    }

    setGenerating(true);
    try {
      const dataConclusaoEmissao = progresso?.concluido_em || new Date().toISOString();

      const certificate = await emitCertificate.mutateAsync({
        treinamentoId: treinamento.id,
        companyId,
        colaboradorId,
        progressoId: progresso?.id || "",
        colaboradorNome,
        treinamentoTitulo: treinamento.titulo,
        cargaHoraria: treinamento.duracao_estimada_minutos 
          ? Math.round(treinamento.duracao_estimada_minutos / 60) 
          : 0,
        dataConclusao: dataConclusaoEmissao,
        issuedByType: isAdmin ? "admin" : "colaborador",
      });

      certificateData.certificateCode = certificate.certificate_code;
      certificateData.validationUrl = `${getShareBaseUrl()}/validar/${certificate.certificate_code}`;
      certificateData.dataEmissao = certificate.issue_date;
      certificateData.dataConclusao = certificate.data_conclusao || dataConclusaoEmissao;

      // Atualiza QR code
      const newQr = await gerarQrCodeDataUrl(certificateData.validationUrl);
      setQrCodeDataUrl(newQr);

      await new Promise(resolve => setTimeout(resolve, 100));

      const pdfBlob = await generatePDF();

      await saveCertificatePDF.mutateAsync({
        certificateId: certificate.id,
        pdfBlob,
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificado_${treinamento.titulo.replace(/\s+/g, '_')}_${colaboradorNome.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Certificado gerado com sucesso!");
    } catch (error: any) {
      // AJUSTE 5: Log seguro sem PII
      console.error({ step: "generate_pdf", message: error?.message || "Erro ao gerar certificado" });
      const msg = error?.message || "Erro ao gerar certificado";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  // Handler para baixar certificado existente
  const handleDownloadCertificate = async () => {
    if (!existingCertificate?.file_path) {
      setDownloading(true);
      try {
        const pdfBlob = await generatePDF();
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `certificado_${treinamento.titulo.replace(/\s+/g, '_')}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
      } catch (error: any) {
        // AJUSTE 5: Log seguro sem PII
        console.error({ step: "generate_pdf", message: error?.message || "Erro ao baixar certificado" });
        toast.error("Erro ao baixar certificado");
      } finally {
        setDownloading(false);
      }
      return;
    }

    setDownloading(true);
    try {
      const signedUrl = await getCertificateSignedUrl(existingCertificate.file_path);
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        throw new Error("URL não disponível");
      }
    } catch (error: any) {
      // AJUSTE 5: Log seguro sem PII
      console.error({ step: "generate_pdf", message: error?.message || "Erro ao baixar certificado" });
      toast.error("Erro ao baixar certificado");
    } finally {
      setDownloading(false);
    }
  };

  // Defesa em profundidade: link externo ou cursos sem certificado NUNCA renderizam emissão (Etapa 8.7)
  if (!treinamento || treinamento.tipo === "link" || treinamento.gera_certificado === false) {
    return null;
  }

  if (loadingCertificate) {
    return null;
  }

  // Se não pode certificar e não tem certificado prévio emitido, exibe card bloqueado (Etapa 9.5)
  if (!podeCertificar && !existingCertificate) {
    const totalAulas = Number(global?.total_aulas ?? 0);
    const aulasConcluidas = Number(global?.aulas_concluidas ?? 0);
    const quizObrigatorio = Boolean(global?.quiz_obrigatorio);
    const quizAprovado = Boolean(global?.quiz_aprovado);

    let mensagemInformativa = "Requisitos de conclusão não atendidos.";
    if (totalAulas === 0) {
      mensagemInformativa = "Treinamento sem conteúdo cadastrado";
    } else if (aulasConcluidas < totalAulas) {
      mensagemInformativa = "Conclua todas as aulas para emitir";
    } else if (quizObrigatorio && !quizAprovado) {
      mensagemInformativa = "Responda a avaliação para emitir";
    }

    return (
      <div
        data-testid="card-certificado-bloqueado"
        className="flex items-center gap-2 p-3 text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
      >
        <Lock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="font-medium">{mensagemInformativa}</span>
      </div>
    );
  }

  return (
    <>
      {/* Botões de Ação */}
      <div className="flex flex-wrap gap-2">
        {existingCertificate ? (
          <>
            <Button 
              variant="outline" 
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Visualizar Certificado
            </Button>
            <Button 
              onClick={handleDownloadCertificate}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar Certificado
            </Button>
          </>
        ) : (
          <Button 
            onClick={handleGenerateCertificate}
            disabled={generating}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Award className="h-4 w-4 mr-2" />
            )}
            {generating ? "Gerando..." : "Gerar Certificado"}
          </Button>
        )}
      </div>

      {/* Dialog de Preview (usa previewRef exclusivamente) */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Preview do Certificado</DialogTitle>
            <DialogDescription>
              Visualização do certificado de conclusão do treinamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-6 overflow-auto">
            <div className="transform scale-[0.4] origin-top-left" style={{ width: "297mm", height: "210mm" }}>
              <CertificateTemplate
                ref={previewRef}
                {...certificateData}
                qrCodeDataUrl={qrCodeDataUrl}
              />
            </div>
          </div>

          <div className="p-6 pt-0 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleDownloadCertificate} disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Baixar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Container de Impressão FORA do Dialog, SEMPRE montado (usa printRef exclusivamente) */}
      <div
        id="certificate-print-template"
        aria-hidden="true"
        style={{
          position: "fixed",
          left: "-9999px",
          top: "-9999px",
          width: "297mm",
          height: "210mm",
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <CertificateTemplate
          ref={printRef}
          {...certificateData}
          companyLogoUrl={logoBase64 || branding.logoUrl}
          qrCodeDataUrl={qrCodeDataUrl}
        />
      </div>
    </>
  );
}
