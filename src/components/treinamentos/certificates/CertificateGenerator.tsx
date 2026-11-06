import { useState, useRef, useCallback } from "react";
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
  const templateRef = useRef<HTMLDivElement>(null);

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

  // Dados para o certificado
  const certificateData = {
    colaboradorNome,
    treinamentoTitulo: treinamento?.titulo || "",
    cargaHoraria: treinamento?.duracao_estimada_minutos 
      ? Math.round(treinamento.duracao_estimada_minutos / 60) 
      : 0,
    dataConclusao: new Date(progresso?.concluido_em || new Date()),
    dataEmissao: existingCertificate 
      ? new Date(existingCertificate.issue_date) 
      : new Date(),
    certificateCode: existingCertificate?.certificate_code || "PREVIEW",
    validationUrl: existingCertificate 
      ? `${getShareBaseUrl()}/validar-certificado?code=${existingCertificate.certificate_code}`
      : `${getShareBaseUrl()}/validar-certificado`,
    companyName,
    companyLogoUrl,
  };

  // Função para gerar o PDF
  const generatePDF = useCallback(async (): Promise<Blob> => {
    if (!templateRef.current) {
      throw new Error("Template não encontrado");
    }

    const canvas = await html2canvas(templateRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
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

    return pdf.output("blob");
  }, []);

  // Handler para gerar certificado
  const handleGenerateCertificate = async () => {
    if (existingCertificate) {
      setPreviewOpen(true);
      return;
    }

    setGenerating(true);
    try {
      // Primeiro, emitir o certificado no banco via RPC segura
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
        dataConclusao: progresso?.concluido_em || new Date().toISOString(),
        issuedByType: isAdmin ? "admin" : "colaborador",
      });

      // Atualizar dados do certificado para o template
      certificateData.certificateCode = certificate.certificate_code;
      certificateData.validationUrl = `${getShareBaseUrl()}/validar-certificado?code=${certificate.certificate_code}`;
      certificateData.dataEmissao = new Date(certificate.issue_date);

      // Aguardar um momento para o DOM atualizar
      await new Promise(resolve => setTimeout(resolve, 100));

      // Gerar PDF
      const pdfBlob = await generatePDF();

      // Salvar no storage
      await saveCertificatePDF.mutateAsync({
        certificateId: certificate.id,
        pdfBlob,
      });

      // Download automático
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificado_${treinamento.titulo.replace(/\s+/g, '_')}_${colaboradorNome.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Certificado gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar certificado:", error);
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
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
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
    } catch (error) {
      console.error("Erro ao baixar certificado:", error);
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

  // 1. Caso certificado já exista: exibe botões de Visualizar e Baixar (Passo 5.1)
  if (existingCertificate) {
    return (
      <>
        <div className="flex flex-wrap gap-2">
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
        </div>

        {/* Dialog de Preview */}
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
                  ref={templateRef}
                  {...certificateData}
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

        {/* Template oculto para geração do PDF */}
        <div
          style={{
            position: "absolute",
            left: "-9999px",
            top: "-9999px",
          }}
        >
          <CertificateTemplate
            ref={templateRef}
            {...certificateData}
          />
        </div>
      </>
    );
  }

  // 2. Caso pode_certificar === false: exibe card informativo e NÃO renderiza botão de emitir (Passo 4.2 / 4.3)
  if (!podeCertificar) {
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

  // 3. Caso pode_certificar === true: renderiza o botão de Gerar Certificado
  return (
    <>
      <div className="flex flex-wrap gap-2">
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
      </div>

      {/* Dialog de Preview */}
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
                ref={templateRef}
                {...certificateData}
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

      {/* Template oculto para geração do PDF */}
      <div
        style={{
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
        }}
      >
        <CertificateTemplate
          ref={templateRef}
          {...certificateData}
        />
      </div>
    </>
  );
}
