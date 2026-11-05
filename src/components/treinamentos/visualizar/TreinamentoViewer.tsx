import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  Copy,
  ExternalLink,
  Layers,
  AlertTriangle,
} from "lucide-react";
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
import {
  useCurriculo,
  useProgressoAulas,
  useProgressoGlobal,
  useSalvarProgressoAula,
  AulaTreinamento,
  ModuloTreinamento,
} from "@/hooks/useProgressoAula";
import { useTrainingTimer } from "@/hooks/useTrainingTimer";
import { QuizPlayer } from "./QuizPlayer";
import { TermoCiencia } from "./TermoCiencia";
import { CertificateGenerator } from "../certificates/CertificateGenerator";
import { AulaPlayer } from "./AulaPlayer";
import { CursoSidebar } from "./CursoSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface TreinamentoViewerProps {
  treinamento: Treinamento;
  modulos?: ModuloTreinamento[];
}

export function TreinamentoViewer({ treinamento, modulos: modulosProp }: TreinamentoViewerProps) {
  const navigate = useNavigate();
  const { companyId } = useAuth();

  // Carregar currículo (módulos e aulas)
  const { data: modulosQuery = [] } = useCurriculo(treinamento.id);
  const modulos = modulosProp || modulosQuery;

  // Flatten de todas as aulas em ordem
  const aulas = useMemo(() => modulos.flatMap((m) => m.aulas || []), [modulos]);

  // Progresso individual de cada aula
  const { data: progressoAulas = [], refetch: refetchProgressoAulas } = useProgressoAulas(treinamento.id);
  const salvarProgressoAula = useSalvarProgressoAula();

  // Progresso geral do treinamento
  const { data: progresso, isLoading: loadingProgresso, refetch: refetchProgresso } = useMeuProgresso(treinamento.id);
  const { data: progressoGlobal, refetch: refetchProgressoGlobal } = useProgressoGlobal(treinamento.id);

  const getOrCreateProgresso = useGetOrCreateProgresso();
  const createLogAcesso = useCreateLogAcesso();
  const concluirTreinamento = useConcluirTreinamento();

  // Estados locais
  const [logId, setLogId] = useState<string | undefined>();
  const [progressoData, setProgressoData] = useState<TreinamentoProgresso | null>(null);
  const [colaboradorData, setColaboradorData] = useState<{ id: string; full_name: string } | null>(null);
  const [companyData, setCompanyData] = useState<{ name: string; logo_url: string | null } | null>(null);

  // Aula selecionada
  const [aulaAtualId, setAulaAtualId] = useState<string | null>(null);

  // Modal de autodeclaração para link externo (Etapa 8.7)
  const [modalAutodeclaracaoOpen, setModalAutodeclaracaoOpen] = useState(false);
  const [declaracaoChecked, setDeclaracaoChecked] = useState(false);

  // Inicializar aula atual
  useEffect(() => {
    if (aulas.length > 0 && !aulaAtualId) {
      // Priorizar a primeira aula não concluída
      const concluidasIds = new Set(progressoAulas.filter((p) => p.concluida).map((p) => p.aula_id));
      const primeiraNaoFeita = aulas.find((a) => !concluidasIds.has(a.id));
      setAulaAtualId(primeiraNaoFeita ? primeiraNaoFeita.id : aulas[0].id);
    }
  }, [aulas, aulaAtualId, progressoAulas]);

  // Fetch colaborador
  useEffect(() => {
    const fetchColaborador = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  // Fetch company
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

  // Inicializar progresso e log de acesso
  useEffect(() => {
    const initializeSession = async () => {
      if (loadingProgresso) return;

      try {
        let currentProgresso = progresso;
        if (!currentProgresso) {
          const result = await getOrCreateProgresso.mutateAsync({ treinamentoId: treinamento.id });
          currentProgresso = result;
        }
        setProgressoData(currentProgresso);

        if (currentProgresso?.status === "concluido") return;

        const log = await createLogAcesso.mutateAsync({ treinamentoId: treinamento.id });
        setLogId(log.id);
      } catch (error) {
        console.error("Erro ao inicializar sessão:", error);
      }
    };

    initializeSession();
  }, [loadingProgresso, progresso, treinamento.id]);

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
    enabled: !!logId && progressoData?.status !== "concluido",
  });

  // Mapeamento de aulas concluídas
  const concluidasSet = useMemo(
    () => new Set(progressoAulas.filter((p) => p.concluida).map((p) => p.aula_id)),
    [progressoAulas]
  );

  const totalAulas = aulas.length;
  const aulasConcluidasCount = concluidasSet.size;

  // Percentual derivado de progresso
  const percentualAulas = totalAulas > 0 ? Math.round((aulasConcluidasCount / totalAulas) * 100) : 0;
  const todasAulasConcluidas = totalAulas > 0 && aulasConcluidasCount === totalAulas;

  // Validações de requisitos
  const tempoMinimo = treinamento.tempo_minimo_minutos || 0;
  const tempoAtingido = tempoMinimo === 0 || timer.elapsedMinutes >= tempoMinimo;
  const quizAprovado = !treinamento.quiz_obrigatorio || Boolean(progressoData?.quiz_aprovado);
  const termoAceito = !treinamento.termo_ciencia_obrigatorio || Boolean(progressoData?.termo_aceito);
  const jaConcluido = progressoData?.status === "concluido";

  // Pode concluir treinamento:
  // Se tem aulas: todas as aulas concluídas + tempo atingido + quiz aprovado + termo aceito
  // Se não tem aulas e é link externo: mantém suporte de autodeclaração conforme Etapa 8.7
  const isTreinamentoLink = treinamento.tipo === "link";
  const podeConcluirCurso =
    !jaConcluido &&
    tempoAtingido &&
    quizAprovado &&
    termoAceito &&
    (totalAulas > 0 ? todasAulasConcluidas : isTreinamentoLink);

  // Aula atual e índice
  const aulaAtual = aulas.find((a) => a.id === aulaAtualId) || aulas[0] || null;
  const indexAtual = aulaAtual ? aulas.findIndex((a) => a.id === aulaAtual.id) : -1;
  const progressoAulaAtual = aulaAtual ? progressoAulas.find((p) => p.aula_id === aulaAtual.id) || null : null;

  // Navegar entre aulas
  const irParaAula = (delta: number) => {
    const novoIndex = indexAtual + delta;
    if (novoIndex >= 0 && novoIndex < aulas.length) {
      setAulaAtualId(aulas[novoIndex].id);
    }
  };

  // Salvar conclusão de aula
  const handleConcluirAula = async (dados?: {
    autodeclarado?: boolean;
    termoAceito?: boolean;
    termoIp?: string | null;
    percentual?: number;
  }) => {
    if (!aulaAtual) return;

    try {
      await salvarProgressoAula.mutateAsync({
        aulaId: aulaAtual.id,
        treinamentoId: treinamento.id,
        concluida: true,
        percentualAssistido: dados?.percentual ?? 100,
        termoAceito: dados?.termoAceito,
        termoIp: dados?.termoIp,
      });

      refetchProgressoAulas();
      refetchProgressoGlobal();

      // Se todas as aulas estiverem completadas e não tiver quiz nem termo, sugerir conclusão
      const novasConcluidas = new Set(concluidasSet);
      novasConcluidas.add(aulaAtual.id);
      if (novasConcluidas.size === totalAulas && !treinamento.quiz_obrigatorio && !treinamento.termo_ciencia_obrigatorio) {
        if (progressoData?.id) {
          await concluirTreinamento.mutateAsync({
            progressoId: progressoData.id,
            treinamentoId: treinamento.id,
          });
          refetchProgresso();
        }
      } else if (indexAtual < aulas.length - 1) {
        // Avançar para a próxima aula
        irParaAula(1);
      }
    } catch (err) {
      console.error("Erro ao concluir aula:", err);
    }
  };

  const handleAtualizarProgressoAula = async (percentual: number) => {
    if (!aulaAtual) return;
    try {
      await salvarProgressoAula.mutateAsync({
        aulaId: aulaAtual.id,
        treinamentoId: treinamento.id,
        percentualAssistido: percentual,
      });
    } catch (err) {
      console.error("Erro ao salvar progresso parcial:", err);
    }
  };

  // Ação de confirmação de conclusão do curso todo (quando todas as etapas estiverem cumpridas)
  const handleConcluirCurso = async () => {
    if (!progressoData?.id || !podeConcluirCurso) return;
    try {
      await concluirTreinamento.mutateAsync({
        progressoId: progressoData.id,
        treinamentoId: treinamento.id,
      });
      refetchProgresso();
      refetchProgressoGlobal();
      toast.success("Treinamento concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao concluir treinamento:", error);
    }
  };

  // Confirmar autodeclaração de link externo (Etapa 8.7)
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

  const getExternalDomain = (url?: string | null): string => {
    if (!url) return "instituição externa";
    try {
      const parsed = new URL(url.startsWith("http") ? url : "https://" + url);
      return parsed.hostname.replace(/^www\./, "");
    } catch {
      return "instituição externa";
    }
  };

  // Status Badge derivado
  const getStatusInfo = () => {
    if (jaConcluido) {
      if (isTreinamentoLink) {
        return {
          label: "Estudado (autodeclarado)",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
          icon: CheckCircle,
        };
      }
      return { label: "Concluído", color: "bg-green-100 text-green-800", icon: CheckCircle };
    }

    if (totalAulas > 0) {
      if (!todasAulasConcluidas) {
        return {
          label: `Em andamento (${aulasConcluidasCount}/${totalAulas} aulas)`,
          color: "bg-yellow-100 text-yellow-800",
          icon: Clock,
        };
      }
      if (treinamento.quiz_obrigatorio && !quizAprovado) {
        return { label: "Quiz pendente", color: "bg-orange-100 text-orange-800", icon: AlertCircle };
      }
      if (treinamento.termo_ciencia_obrigatorio && !termoAceito) {
        return { label: "Termo pendente", color: "bg-orange-100 text-orange-800", icon: AlertCircle };
      }
      return { label: "Pronto para finalizar", color: "bg-blue-100 text-blue-800", icon: CheckCircle };
    }

    // Sem aulas
    if (isTreinamentoLink) {
      return {
        label: "Link externo",
        color: "bg-blue-100 text-blue-800",
        icon: ExternalLink,
      };
    }

    return { label: "Sem conteúdo", color: "bg-muted text-muted-foreground", icon: AlertTriangle };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="container mx-auto max-w-6xl space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/treinamentos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">{treinamento.titulo}</h1>
            <p className="text-xs text-muted-foreground">
              {treinamento.categoria?.nome || "Capacitação"} •{" "}
              {totalAulas > 0 ? `${modulos.length} módulos • ${totalAulas} aulas` : "Treinamento complementar"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={statusInfo.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      {/* Caso o curso tenha aulas estruturadas (D1/D2/D3/D4) */}
      {totalAulas > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
          {/* Coluna Esquerda: Player e Conteúdo da Aula Ativa */}
          <div className="space-y-6">
            {aulaAtual ? (
              <div className="space-y-4">
                {/* Cabeçalho da Aula */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                      Aula {indexAtual + 1} de {totalAulas}
                    </span>
                    <h2 className="text-lg font-bold">{aulaAtual.titulo}</h2>
                    {aulaAtual.descricao && (
                      <p className="text-xs text-muted-foreground mt-1">{aulaAtual.descricao}</p>
                    )}
                  </div>
                  {concluidasSet.has(aulaAtual.id) && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Aula Concluída
                    </Badge>
                  )}
                </div>

                {/* Player Híbrido por tipo */}
                <AulaPlayer
                  aula={aulaAtual}
                  progresso={progressoAulaAtual}
                  onConcluirAula={handleConcluirAula}
                  onAtualizarProgresso={handleAtualizarProgressoAula}
                  isPending={salvarProgressoAula.isPending}
                />

                {/* Controles de Navegação entre aulas */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irParaAula(-1)}
                    disabled={indexAtual <= 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => irParaAula(1)}
                    disabled={indexAtual >= totalAulas - 1}
                    className="gap-1"
                  >
                    Próxima <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertDescription>Selecione uma aula na barra lateral para começar.</AlertDescription>
              </Alert>
            )}

            {/* Seção de Quiz (se obrigatório) */}
            {treinamento.quiz_obrigatorio && progressoData && (
              <div className="pt-4 border-t space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Avaliação e Quiz
                </h3>
                <QuizPlayer
                  treinamentoId={treinamento.id}
                  progresso={progressoData}
                  aulasCompletas={todasAulasConcluidas}
                  totalAulas={totalAulas}
                  aulasConcluidas={aulasConcluidasCount}
                  notaMinima={(treinamento as any).nota_minima || 70}
                  tentativasMaximas={(treinamento as any).tentativas_maximas || 3}
                  onQuizApproved={() => {
                    refetchProgresso();
                    refetchProgressoGlobal();
                  }}
                />
              </div>
            )}

            {/* Seção de Termo de Ciência (se obrigatório) */}
            {treinamento.termo_ciencia_obrigatorio && progressoData && (
              <div className="pt-4 border-t space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" /> Termo de Ciência
                </h3>
                {todasAulasConcluidas && quizAprovado ? (
                  <TermoCiencia
                    progressoId={progressoData.id}
                    treinamentoId={treinamento.id}
                    progresso={progressoData}
                    textoTermo={treinamento.texto_termo_ciencia}
                    onTermoAceito={() => refetchProgresso()}
                  />
                ) : (
                  <Alert className="border-muted bg-muted/30">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <AlertDescription className="text-xs text-muted-foreground">
                      O termo de ciência será liberado após a conclusão de todas as aulas
                      {treinamento.quiz_obrigatorio ? " e aprovação no quiz" : ""}.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Botão para Finalizar Treinamento (somente quando apto e não concluído) */}
            {podeConcluirCurso && !jaConcluido && (
              <Card className="border-primary/40 bg-primary/5">
                <CardContent className="pt-6 space-y-3 text-center">
                  <CheckCircle className="h-8 w-8 text-primary mx-auto" />
                  <div>
                    <h3 className="font-semibold text-foreground">Todas as etapas foram cumpridas!</h3>
                    <p className="text-xs text-muted-foreground">
                      Você completou todas as aulas e requisitos deste treinamento.
                    </p>
                  </div>
                  <Button
                    onClick={handleConcluirCurso}
                    disabled={concluirTreinamento.isPending}
                    className="w-full sm:w-auto"
                  >
                    {concluirTreinamento.isPending ? "Finalizando..." : "Finalizar Treinamento"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Banner de Conclusão / Certificado */}
            {jaConcluido && progressoData && (
              isTreinamentoLink ? (
                <Card className="border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p className="text-blue-900 dark:text-blue-100 font-semibold text-sm">
                          Conteúdo externo registrado como estudado em{" "}
                          {progressoData.concluido_em
                            ? new Date(progressoData.concluido_em).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "data não registrada"}
                          .
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-300">
                          ℹ️ Este treinamento é ministrado por instituição externa ({getExternalDomain(treinamento.url_conteudo)}). Caso a instituição ofereça certificado, este deve ser obtido diretamente pelo portal dela, não pela plataforma NR-1 Comprova.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="text-green-900 dark:text-green-100 font-semibold text-sm">
                            Treinamento concluído com sucesso em{" "}
                            {progressoData.concluido_em
                              ? new Date(progressoData.concluido_em).toLocaleDateString("pt-BR", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "data não registrada"}
                            .
                          </p>
                          <p className="text-xs text-green-800 dark:text-green-300">
                            {totalAulas} aulas concluídas • 100% de aproveitamento
                          </p>
                        </div>

                        {/* Botão de Certificado (apenas se gera_certificado !== false) */}
                        {treinamento.gera_certificado !== false && colaboradorData && companyId && (
                          <div className="pt-2">
                            <CertificateGenerator
                              treinamento={treinamento}
                              progresso={progressoData}
                              colaboradorId={colaboradorData.id}
                              colaboradorNome={colaboradorData.full_name}
                              companyId={companyId}
                              companyName={companyData?.name}
                              companyLogoUrl={companyData?.logo_url || undefined}
                              podeCertificar={progressoGlobal?.pode_certificar}
                              progressoGlobal={progressoGlobal}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Coluna Direita: Sidebar com Módulos e Aulas */}
          <CursoSidebar
            modulos={modulos}
            aulaAtualId={aulaAtualId}
            concluidas={concluidasSet}
            onSelecionar={setAulaAtualId}
            percentual={percentualAulas}
            totalAulas={totalAulas}
          />
        </div>
      ) : (
        /* Caso o curso NÃO tenha aulas estruturadas */
        <div className="space-y-6">
          {isTreinamentoLink ? (
            /* Treinamento de Link Externo (compatibilidade com Etapa 8.7) */
            <div className="space-y-6">
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/40 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                  Conteúdo hospedado externamente ({getExternalDomain(treinamento.url_conteudo)}). O certificado deste treinamento é emitido pela instituição responsável na própria plataforma de origem. Ao finalizar seus estudos, retorne a esta página para registrar sua autodeclaração de estudo.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {treinamento.descricao && (
                    <p className="text-sm text-muted-foreground">{treinamento.descricao}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <a href={treinamento.url_conteudo || "#"} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Acessar Link
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
                      <Copy className="h-4 w-4 mr-2" /> Copiar link
                    </Button>
                  </div>
                </CardContent>
                {!jaConcluido && (
                  <CardFooter>
                    <Button
                      onClick={() => {
                        setDeclaracaoChecked(false);
                        setModalAutodeclaracaoOpen(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={concluirTreinamento.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Marcar como estudado
                    </Button>
                  </CardFooter>
                )}
              </Card>

              {/* Conclusão de link externo */}
              {jaConcluido && progressoData && (
                <Card className="border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <p className="text-blue-900 dark:text-blue-100 font-semibold">
                          Conteúdo externo registrado como estudado em{" "}
                          {progressoData.concluido_em
                            ? new Date(progressoData.concluido_em).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "data não registrada"}
                          .
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300/90 pt-1">
                          ℹ️ Este treinamento é ministrado por instituição externa ({getExternalDomain(treinamento.url_conteudo)}). Caso a instituição ofereça certificado, este deve ser obtido diretamente pelo portal dela, não pela plataforma NR-1 Comprova.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            /* Treinamento sem aulas cadastradas (Blindagem: NUNCA exibe botão Concluir solto) */
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="py-12 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                    Sem conteúdo disponível
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 max-w-md mx-auto">
                    Este treinamento ainda não possui módulos e aulas cadastrados pela organização ou plataforma.
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  A conclusão e emissão de certificados exigem a comprovação de conclusão das aulas do curso.
                </p>
                <div className="pt-2">
                  <Button variant="outline" onClick={() => navigate("/treinamentos")}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Catálogo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Modal de Autodeclaração de Estudo Externo (Etapa 8.7) */}
      <Dialog open={modalAutodeclaracaoOpen} onOpenChange={setModalAutodeclaracaoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar estudo do conteúdo externo</DialogTitle>
            <DialogDescription className="space-y-2 pt-2 text-xs">
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
                className="text-xs font-medium leading-relaxed cursor-pointer select-none"
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
              size="sm"
              onClick={() => setModalAutodeclaracaoOpen(false)}
              disabled={concluirTreinamento.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
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
