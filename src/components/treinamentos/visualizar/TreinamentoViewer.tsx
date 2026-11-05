import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Download, ExternalLink, Clock, CheckCircle, AlertCircle, Play, Pause, Lock, Copy, Link2, AlertTriangle, FileText, FileType2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Treinamento } from "@/hooks/useTreinamentos";
import { 
  useMeuProgresso, 
  useGetOrCreateProgresso,
  useCreateLogAcesso,
  useConcluirTreinamento,
  TreinamentoProgresso,
} from "@/hooks/useTreinamentoProgresso";
import { useTrainingTimer } from "@/hooks/useTrainingTimer";
import { getSignedUrlTreinamento, isStoragePath } from "@/hooks/useTreinamentoStorage";
import { QuizPlayer } from "./QuizPlayer";
import { TermoCiencia } from "./TermoCiencia";
import { CertificateGenerator } from "../certificates/CertificateGenerator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TreinamentoViewerProps {
  treinamento: Treinamento;
}

export function TreinamentoViewer({ treinamento }: TreinamentoViewerProps) {
  const navigate = useNavigate();
  const { companyId } = useAuth();
  const { data: progresso, isLoading: loadingProgresso, refetch: refetchProgresso } = useMeuProgresso(treinamento.id);
  const getOrCreateProgresso = useGetOrCreateProgresso();
  const createLogAcesso = useCreateLogAcesso();
  const concluirTreinamento = useConcluirTreinamento();
  
  const [logId, setLogId] = useState<string | undefined>();
  const [progressoData, setProgressoData] = useState<TreinamentoProgresso | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [colaboradorData, setColaboradorData] = useState<{ id: string; full_name: string } | null>(null);
  const [companyData, setCompanyData] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [modalAutodeclaracaoOpen, setModalAutodeclaracaoOpen] = useState(false);
  const [declaracaoChecked, setDeclaracaoChecked] = useState(false);

  const getExternalDomain = (url?: string | null): string => {
    if (!url) return "instituição externa";
    try {
      const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "instituição externa";
    }
  };

  // Fetch colaborador data
  useEffect(() => {
    const fetchColaborador = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data } = await supabase
        .from("colaboradores")
        .select("id, full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) setColaboradorData(data);
    };
    fetchColaborador();
  }, []);

  // Fetch company data for certificate
  useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) return;
      
      const { data } = await supabase
        .from("companies")
        .select("name, logo_url")
        .eq("id", companyId)
        .maybeSingle();
      
      if (data) setCompanyData(data);
    };
    fetchCompany();
  }, [companyId]);

  // Check if content is a storage file or external URL
  const isFileContent = isStoragePath(treinamento.url_conteudo);
  const isFileType = treinamento.tipo === "pdf" || treinamento.tipo === "ppt" || treinamento.tipo === "video";

  // Fetch signed URL for file content
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (isFileContent && treinamento.url_conteudo) {
        setLoadingUrl(true);
        const url = await getSignedUrlTreinamento(treinamento.url_conteudo);
        setSignedUrl(url);
        setLoadingUrl(false);
      }
    };
    fetchSignedUrl();
  }, [isFileContent, treinamento.url_conteudo]);

  // Inicializar progresso e log de acesso
  useEffect(() => {
    const initializeSession = async () => {
      if (loadingProgresso) return;
      
      try {
        // Criar ou obter progresso
        let currentProgresso = progresso;
        if (!currentProgresso) {
          const result = await getOrCreateProgresso.mutateAsync({ treinamentoId: treinamento.id });
          currentProgresso = result;
        }
        setProgressoData(currentProgresso);

        // Se já concluído, não criar novo log
        if (currentProgresso?.status === 'concluido') return;

        // Criar log de acesso para esta sessão
        const log = await createLogAcesso.mutateAsync({ treinamentoId: treinamento.id });
        setLogId(log.id);
      } catch (error) {
        console.error("Erro ao inicializar sessão:", error);
      }
    };

    initializeSession();
  }, [loadingProgresso, progresso, treinamento.id]);

  // Sincronizar progressoData com progresso do hook
  useEffect(() => {
    if (progresso) {
      setProgressoData(progresso);
    }
  }, [progresso]);

  // Timer hook
  const timer = useTrainingTimer({
    logId,
    progressoId: progressoData?.id,
    treinamentoId: treinamento.id,
    tempoMinimoMinutos: treinamento.tempo_minimo_minutos || 0,
    initialSeconds: (progressoData?.tempo_total_minutos || 0) * 60,
    enabled: !!logId && progressoData?.status !== 'concluido',
  });

  // Verificar condições de conclusão
  const tempoMinimo = treinamento.tempo_minimo_minutos || 0;
  const tempoAtingido = tempoMinimo === 0 || timer.elapsedMinutes >= tempoMinimo;
  const quizAprovado = !treinamento.quiz_obrigatorio || progressoData?.quiz_aprovado;
  const termoAceito = !treinamento.termo_ciencia_obrigatorio || progressoData?.termo_aceito;
  const jaConcluido = progressoData?.status === 'concluido';

  // Pode concluir quando todas as condições forem atendidas
  const podeIniciarQuiz = tempoAtingido && treinamento.quiz_obrigatorio && !progressoData?.quiz_aprovado;
  const podeAceitarTermo = tempoAtingido && quizAprovado && treinamento.termo_ciencia_obrigatorio && !progressoData?.termo_aceito;
  const podeConcluir = tempoAtingido && quizAprovado && termoAceito && !jaConcluido;

  const handleQuizApproved = useCallback(() => {
    refetchProgresso();
  }, [refetchProgresso]);

  const handleTermoAceito = useCallback(() => {
    refetchProgresso();
  }, [refetchProgresso]);

  const handleConcluir = async () => {
    if (!progressoData?.id || !podeConcluir) return;

    try {
      await concluirTreinamento.mutateAsync({
        progressoId: progressoData.id,
        treinamentoId: treinamento.id,
      });
      refetchProgresso();
    } catch (error) {
      console.error("Erro ao concluir treinamento:", error);
    }
  };

  const handleConfirmarAutodeclaracao = async () => {
    if (!progressoData?.id || !declaracaoChecked) return;
    try {
      await concluirTreinamento.mutateAsync({
        progressoId: progressoData.id,
        treinamentoId: treinamento.id,
        autodeclarado: true,
        termoAceito: true,
      });
      setModalAutodeclaracaoOpen(false);
      refetchProgresso();
      toast.success("Estudo registrado com sucesso!");
    } catch (error) {
      console.error("Erro ao registrar autodeclaração:", error);
      toast.error("Erro ao registrar conclusão.");
    }
  };

  const handleDownload = () => {
    if (signedUrl) {
      window.open(signedUrl, "_blank");
    }
  };

  // Status display
  const getStatusInfo = () => {
    if (jaConcluido) {
      if (treinamento.tipo === "link") {
        return {
          label: "Estudado (autodeclarado)",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
          icon: CheckCircle,
        };
      }
      return { label: "Concluído", color: "bg-green-100 text-green-800", icon: CheckCircle };
    }
    if (podeConcluir) {
      return {
        label: treinamento.tipo === "link" ? "Pronto para registrar" : "Pronto para concluir",
        color: "bg-blue-100 text-blue-800",
        icon: CheckCircle,
      };
    }
    if (!tempoAtingido) {
      return { label: "Em andamento", color: "bg-yellow-100 text-yellow-800", icon: Clock };
    }
    if (treinamento.quiz_obrigatorio && !quizAprovado) {
      return { label: "Quiz pendente", color: "bg-orange-100 text-orange-800", icon: AlertCircle };
    }
    if (treinamento.termo_ciencia_obrigatorio && !termoAceito) {
      return { label: "Termo pendente", color: "bg-orange-100 text-orange-800", icon: AlertCircle };
    }
    return { label: "Em andamento", color: "bg-yellow-100 text-yellow-800", icon: Clock };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  // Render content based on type
  const renderContent = () => {
    // PDF file - embedded viewer
    if (treinamento.tipo === "pdf" && isFileContent) {
      return (
        <div className="space-y-4">
          {loadingUrl ? (
            <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Carregando documento...</p>
            </div>
          ) : signedUrl ? (
            <>
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Se o documento não carregar, extensões de bloqueio (AdBlock, uBlock) podem estar bloqueando. Use os botões abaixo para baixar ou copiar o link.
                </AlertDescription>
              </Alert>
              <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                <iframe
                  src={`${signedUrl}#toolbar=1&navpanes=1`}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Não foi possível carregar o documento.</p>
                <p className="text-sm mt-1">
                  Se você usa extensões de bloqueio (AdBlock, uBlock Origin), tente desativá-las ou use uma aba anônima.
                </p>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleDownload} disabled={!signedUrl}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF {treinamento.nome_arquivo && `(${treinamento.nome_arquivo})`}
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                if (signedUrl) {
                  navigator.clipboard.writeText(signedUrl);
                  toast.success("Link copiado! Cole em uma nova aba.");
                }
              }}
              disabled={!signedUrl}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar Link
            </Button>
          </div>
        </div>
      );
    }

    // PPT file - download only
    if (treinamento.tipo === "ppt" && isFileContent) {
      return (
        <div className="space-y-4">
          <div className="p-8 border rounded-lg bg-muted/50 text-center">
            <FileType2 className="h-16 w-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-semibold mb-2">Apresentação PowerPoint</h3>
            <p className="text-muted-foreground mb-4">
              {treinamento.nome_arquivo || "Arquivo PowerPoint"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Faça o download e abra no PowerPoint ou outro visualizador compatível.
            </p>
            <Button onClick={handleDownload} disabled={!signedUrl || loadingUrl}>
              <Download className="h-4 w-4 mr-2" />
              {loadingUrl ? "Carregando..." : "Baixar Apresentação"}
            </Button>
          </div>
        </div>
      );
    }

    // Video file - HTML5 player
    if (treinamento.tipo === "video" && isFileContent) {
      return (
        <div className="space-y-4">
          {loadingUrl ? (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">Carregando vídeo...</p>
            </div>
          ) : signedUrl ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                src={signedUrl}
                controls
                className="w-full h-full"
                controlsList="nodownload"
              >
                Seu navegador não suporta a reprodução de vídeo.
              </video>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Não foi possível carregar o vídeo.</AlertDescription>
            </Alert>
          )}
        </div>
      );
    }

    // External video (YouTube, etc.)
    if (treinamento.tipo === "video" && !isFileContent) {
      return (
        <div className="space-y-4">
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Este conteúdo pode ser bloqueado pela rede ou preview. Use "Copiar link" ou "Abrir link" para acessar em uma nova aba do navegador.
            </AlertDescription>
          </Alert>
          <div className="aspect-video bg-muted rounded-lg relative overflow-hidden">
            <iframe
              src={treinamento.url_conteudo?.replace("watch?v=", "embed/")}
              className="w-full h-full rounded-lg"
              allowFullScreen
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (treinamento.url_conteudo) {
                  navigator.clipboard.writeText(treinamento.url_conteudo);
                  toast.success("Link copiado para a área de transferência");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </Button>
            <Button asChild variant="outline">
              <a href={treinamento.url_conteudo || "#"} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir link
              </a>
            </Button>
          </div>
        </div>
      );
    }

    // Link type - external link
    if (treinamento.tipo === "link") {
      const domain = getExternalDomain(treinamento.url_conteudo);
      return (
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
              Conteúdo hospedado externamente ({domain}). O certificado deste treinamento é emitido pela instituição responsável na própria plataforma de origem. Ao finalizar seus estudos, retorne a esta página para registrar sua autodeclaração de estudo.
            </AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <a href={treinamento.url_conteudo || "#"} target="_blank" rel="noopener noreferrer">
                <Link2 className="h-4 w-4 mr-2" />
                Acessar Link
              </a>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                if (treinamento.url_conteudo) {
                  navigator.clipboard.writeText(treinamento.url_conteudo);
                  toast.success("Link copiado para a área de transferência");
                }
              }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </Button>
          </div>
        </div>
      );
    }

    // Legacy "arquivo" type - treat as download
    if (treinamento.tipo === "arquivo") {
      return (
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={treinamento.url_conteudo || "#"} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4 mr-2" />
              Baixar Arquivo {treinamento.nome_arquivo && `(${treinamento.nome_arquivo})`}
            </a>
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/treinamentos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{treinamento.titulo}</h1>
          {treinamento.categoria && (
            <p className="text-muted-foreground">{treinamento.categoria.nome}</p>
          )}
        </div>
        <Badge className={statusInfo.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {statusInfo.label}
        </Badge>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Seu Progresso
            </span>
            {!jaConcluido && (
              <div className="flex items-center gap-2 text-sm font-normal">
                {timer.isActive && !timer.isPaused ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <Play className="h-3 w-3 mr-1" />
                    Contando
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    <Pause className="h-3 w-3 mr-1" />
                    Pausado
                  </Badge>
                )}
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer Display */}
          {tempoMinimo > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tempo contabilizado</span>
                <span className={tempoAtingido ? "text-green-600 font-medium" : ""}>
                  {timer.elapsedMinutes} / {tempoMinimo} min
                </span>
              </div>
              <Progress value={timer.percentComplete} className="h-3" />
              {!tempoAtingido && !jaConcluido && (
                <p className="text-xs text-muted-foreground">
                  O tempo só é contabilizado enquanto você permanece nesta página com a aba ativa.
                </p>
              )}
            </div>
          )}

          {/* Checklist de requisitos */}
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2">
              {tempoAtingido ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={`text-sm ${tempoAtingido ? 'text-green-700' : ''}`}>
                Tempo mínimo {tempoMinimo > 0 ? `(${tempoMinimo} min)` : '(sem requisito)'}
              </span>
            </div>
            
            {treinamento.quiz_obrigatorio && (
              <div className="flex items-center gap-2">
                {quizAprovado ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${quizAprovado ? 'text-green-700' : ''}`}>
                  Quiz aprovado
                </span>
              </div>
            )}
            
            {treinamento.termo_ciencia_obrigatorio && (
              <div className="flex items-center gap-2">
                {termoAceito ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${termoAceito ? 'text-green-700' : ''}`}>
                  Termo aceito
                </span>
              </div>
            )}
          </div>
        </CardContent>

        {/* Botão de conclusão */}
        {podeConcluir && (
          <CardFooter>
            {treinamento.tipo === "link" ? (
              <Button 
                onClick={() => {
                  setDeclaracaoChecked(false);
                  setModalAutodeclaracaoOpen(true);
                }} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={concluirTreinamento.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar como estudado
              </Button>
            ) : (
              <Button 
                onClick={handleConcluir} 
                className="w-full"
                disabled={concluirTreinamento.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {concluirTreinamento.isPending ? "Concluindo..." : "Concluir Treinamento"}
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Content Card */}
      <Card>
        <CardHeader>
          <CardTitle>Conteúdo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {treinamento.descricao && (
            <p className="text-muted-foreground mb-4">{treinamento.descricao}</p>
          )}

          {renderContent()}

          {/* Note about time tracking */}
          <p className="text-xs text-muted-foreground mt-4">
            💡 O tempo é contabilizado enquanto você permanece nesta página. Você pode acessar o conteúdo externo em outra aba sem perder seu progresso.
          </p>
        </CardContent>
      </Card>

      {/* Quiz Section (if required and time reached) */}
      {treinamento.quiz_obrigatorio && progressoData && (
        <>
          <Separator />
          {tempoAtingido ? (
            <QuizPlayer 
              treinamentoId={treinamento.id}
              progresso={progressoData}
              onQuizApproved={handleQuizApproved}
            />
          ) : (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                O quiz será liberado após você atingir o tempo mínimo de {tempoMinimo} minutos.
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Termo Section (if required, time reached, and quiz approved) */}
      {treinamento.termo_ciencia_obrigatorio && progressoData && (
        <>
          <Separator />
          {tempoAtingido && quizAprovado ? (
            <TermoCiencia
              progressoId={progressoData.id}
              treinamentoId={treinamento.id}
              progresso={progressoData}
              textoTermo={treinamento.texto_termo_ciencia}
              onTermoAceito={handleTermoAceito}
            />
          ) : (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                {!tempoAtingido 
                  ? `O termo de ciência será liberado após você atingir o tempo mínimo de ${tempoMinimo} minutos.`
                  : "O termo de ciência será liberado após a aprovação no quiz."}
              </AlertDescription>
            </Alert>
          )}
        </>
      )}

      {/* Conclusão Notice + Certificado */}
      {jaConcluido && progressoData && (
        treinamento.tipo === "link" ? (
          <Card className="border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-blue-900 dark:text-blue-100 font-semibold">
                      Conteúdo externo registrado como estudado em {progressoData.concluido_em 
                        ? new Date(progressoData.concluido_em).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'data não registrada'}.
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                      Tempo registrado na plataforma: {progressoData.tempo_total_minutos} min.
                    </p>
                  </div>
                  <p className="text-xs text-blue-700 dark:text-blue-300/90 pt-1">
                    ℹ️ Este treinamento é ministrado por instituição externa ({getExternalDomain(treinamento.url_conteudo)}). Caso a instituição ofereça certificado, este deve ser obtido diretamente pelo portal dela, não pela plataforma NR-1 Comprova.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
                <div className="flex-1 space-y-4">
                  <div>
                    <p className="text-green-800 font-medium">
                      Treinamento concluído em {progressoData.concluido_em 
                        ? new Date(progressoData.concluido_em).toLocaleDateString('pt-BR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : 'data não registrada'}.
                    </p>
                    <p className="text-sm text-green-700">
                      Tempo total: {progressoData.tempo_total_minutos} min
                      {progressoData.quiz_aprovado && ` | Quiz: ${progressoData.quiz_melhor_nota?.toFixed(1)}%`}
                      {progressoData.termo_aceito && ` | Termo aceito`}
                    </p>
                  </div>
                  
                  {/* Botão de Certificado (apenas se gera_certificado !== false) */}
                  {treinamento.gera_certificado !== false && colaboradorData && companyId && (
                    <CertificateGenerator
                      treinamento={treinamento}
                      progresso={progressoData}
                      colaboradorId={colaboradorData.id}
                      colaboradorNome={colaboradorData.full_name}
                      companyId={companyId}
                      companyName={companyData?.name}
                      companyLogoUrl={companyData?.logo_url || undefined}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* Modal de Autodeclaração de Estudo Externo */}
      <Dialog open={modalAutodeclaracaoOpen} onOpenChange={setModalAutodeclaracaoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar estudo do conteúdo externo</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span>
                Este treinamento acontece na plataforma externa{" "}
                <strong>{getExternalDomain(treinamento.url_conteudo)}</strong>. A conclusão das aulas
                e atividades não é verificada automaticamente pelo NR-1 Comprova.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-start space-x-3 rounded-lg border border-border p-3.5 bg-muted/40">
              <Checkbox
                id="check-declaracao"
                checked={declaracaoChecked}
                onCheckedChange={(checked) => setDeclaracaoChecked(checked === true)}
                className="mt-0.5"
              />
              <label
                htmlFor="check-declaracao"
                className="text-sm font-medium leading-relaxed cursor-pointer select-none"
              >
                Declaro que acessei e estudei o conteúdo indicado neste treinamento.
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              Esta autodeclaração será registrada no seu histórico de capacitações com data e hora.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalAutodeclaracaoOpen(false)}
              disabled={concluirTreinamento.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarAutodeclaracao}
              disabled={!declaracaoChecked || concluirTreinamento.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {concluirTreinamento.isPending ? "Registrando..." : "Confirmar conclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
