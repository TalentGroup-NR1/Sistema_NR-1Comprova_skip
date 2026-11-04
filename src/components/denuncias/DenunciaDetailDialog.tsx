import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  History,
  Lock,
  MessageSquare,
  Send,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DenunciaAdmin,
  DenunciaStatus,
  useAssumirDenuncia,
  useAtualizarStatusDenuncia,
  useComiteEnviarMensagem,
  useComiteMensagens,
  useHistoricoDenuncia,
  useLiberarDenuncia,
} from "@/hooks/useDenuncias";
import { TipoBadge } from "./TipoBadge";
import { PrazoBadge } from "./PrazoBadge";

const STATUS_LABEL: Record<DenunciaStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
};

interface Props {
  denuncia: DenunciaAdmin | null;
  onOpenChange: (open: boolean) => void;
  extraHeader?: React.ReactNode;
}

export function DenunciaDetailDialog({ denuncia, onOpenChange, extraHeader }: Props) {
  const { user } = useAuth();
  const atualizar = useAtualizarStatusDenuncia();
  const assumir = useAssumirDenuncia();
  const liberar = useLiberarDenuncia();
  const historicoQuery = useHistoricoDenuncia(denuncia?.id ?? null);
  const mensagensQuery = useComiteMensagens(denuncia?.id ?? null);
  const enviarMensagem = useComiteEnviarMensagem();

  const [status, setStatus] = useState<DenunciaStatus>("novo");
  const [parecer, setParecer] = useState<string>("");
  const [resumoPublico, setResumoPublico] = useState<string>("");
  const [mensagemComite, setMensagemComite] = useState<string>("");
  const [historicoAberto, setHistoricoAberto] = useState<boolean>(false);
  const [copiadoProtocolo, setCopiadoProtocolo] = useState<boolean>(false);

  useEffect(() => {
    if (denuncia) {
      setStatus(denuncia.status);
      setParecer(denuncia.parecer_atual ?? "");
      setResumoPublico(denuncia.resumo_publico ?? "");
      setMensagemComite("");
      setHistoricoAberto(false);
      setCopiadoProtocolo(false);
    }
  }, [denuncia]);

  if (!denuncia) return null;

  const currentUserId = user?.id;
  const isAssumidoPorMim = !!denuncia.assumido_por && denuncia.assumido_por === currentUserId;
  const isNaoAssumida = !denuncia.assumido_por;
  const isAssumidaPorOutro = !!denuncia.assumido_por && denuncia.assumido_por !== currentUserId;

  const parecerLength = parecer.trim().length;
  const isConcluindo = status === "concluido";
  const parecerValidoParaConclusao = !isConcluindo || parecerLength >= 30;

  const hasChanges =
    status !== denuncia.status ||
    (parecer.trim() !== (denuncia.parecer_atual ?? "").trim() && parecerLength > 0) ||
    resumoPublico.trim() !== (denuncia.resumo_publico ?? "").trim();

  const handleCopiarProtocolo = async () => {
    if (!denuncia.protocolo) return;
    try {
      await navigator.clipboard.writeText(denuncia.protocolo);
      setCopiadoProtocolo(true);
      toast.success("Protocolo copiado para a área de transferência.");
      setTimeout(() => setCopiadoProtocolo(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o protocolo.");
    }
  };

  const handleAssumir = async () => {
    try {
      await assumir.mutateAsync(denuncia.id);
    } catch {
      // toast já disparado no hook
    }
  };

  const handleLiberar = async () => {
    try {
      await liberar.mutateAsync(denuncia.id);
    } catch {
      // toast já disparado no hook
    }
  };

  const handleSalvar = async () => {
    if (isConcluindo && !parecerValidoParaConclusao) {
      toast.error(
        "O parecer de apuração é obrigatório para a conclusão (mínimo de 30 caracteres)."
      );
      return;
    }

    try {
      await atualizar.mutateAsync({
        id: denuncia.id,
        status,
        parecer: parecer.trim() || null,
        resumo_publico: resumoPublico.trim() || null,
      });
      toast.success("Tratamento da denúncia atualizado com sucesso.");
    } catch (err: any) {
      toast.error("Erro ao atualizar denúncia", { description: err?.message });
    }
  };

  const handleEnviarMensagemComite = async (e: React.FormEvent) => {
    e.preventDefault();
    const txt = mensagemComite.trim();
    if (!txt) {
      toast.error("Digite a mensagem para o denunciante.");
      return;
    }
    if (txt.length > 2000) {
      toast.error("A mensagem deve ter no máximo 2000 caracteres.");
      return;
    }

    try {
      await enviarMensagem.mutateAsync({
        denunciaId: denuncia.id,
        mensagem: txt,
      });
      setMensagemComite("");
      toast.success("Mensagem enviada. O denunciante verá ao consultar o protocolo.");
    } catch {
      // erro tratado no hook
    }
  };

  return (
    <Dialog open={!!denuncia} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">{denuncia.titulo}</DialogTitle>
                <div className="inline-flex items-center gap-1.5 bg-muted/60 border border-border px-2.5 py-0.5 rounded-md">
                  <span className="text-[11px] text-muted-foreground font-medium">Protocolo:</span>
                  <span className="font-mono text-xs font-bold tracking-wider text-foreground">
                    {denuncia.protocolo || "—"}
                  </span>
                  {denuncia.protocolo && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleCopiarProtocolo}
                            className="h-5 w-5 ml-0.5 p-0 hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            {copiadoProtocolo ? (
                              <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span className="sr-only">Copiar protocolo</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {copiadoProtocolo ? "Copiado!" : "Copiar protocolo"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                O denunciante usa este código para acompanhar o relato em{" "}
                <span className="font-mono font-medium text-foreground">/acompanhar</span>.
              </p>
              <DialogDescription>
                Recebida em{" "}
                {format(new Date(denuncia.criado_em), "dd/MM/yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </DialogDescription>
            </div>
            <PrazoBadge denuncia={denuncia} className="shrink-0" />
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Badges de cabeçalho */}
          <div className="flex flex-wrap items-center gap-2">
            <TipoBadge tipo={denuncia.tipo} />
            <Badge variant={denuncia.anonimo ? "secondary" : "outline"}>
              {denuncia.anonimo ? "Anônimo" : denuncia.autor_nome ?? "Identificado"}
            </Badge>
            {denuncia.data_fato && (
              <Badge variant="outline" className="text-xs">
                Data do fato: {format(new Date(denuncia.data_fato + "T00:00:00"), "dd/MM/yyyy")}
              </Badge>
            )}
          </div>

          {extraHeader}

          {/* 1. Mensagem da denúncia */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Mensagem Original do Relato
            </Label>
            <div className="mt-1.5 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {denuncia.mensagem}
            </div>
          </div>

          {/* 2. Painel de Prazos Legais (Lei 14.457/2022) */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" />
              Prazos Legais de Apuração (Lei nº 14.457/2022)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md border bg-muted/20 space-y-1">
                <span className="text-muted-foreground font-medium block">
                  1ª Resposta ao Relato (30 dias)
                </span>
                <p className="font-semibold text-foreground">
                  {denuncia.prazo_primeira_resposta
                    ? format(new Date(denuncia.prazo_primeira_resposta), "dd/MM/yyyy", {
                        locale: ptBR,
                      })
                    : "—"}
                </p>
                {denuncia.primeira_resposta_em ? (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Iniciado em{" "}
                    {format(new Date(denuncia.primeira_resposta_em), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Ainda não iniciado
                  </span>
                )}
              </div>

              <div className="p-3 rounded-md border bg-muted/20 space-y-1">
                <span className="text-muted-foreground font-medium block">
                  Conclusão e Parecer Final (90 dias)
                </span>
                <p className="font-semibold text-foreground">
                  {denuncia.prazo_conclusao
                    ? format(new Date(denuncia.prazo_conclusao), "dd/MM/yyyy", {
                        locale: ptBR,
                      })
                    : "—"}
                </p>
                {denuncia.status === "concluido" ? (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Apuração concluída
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">
                    Em tramitação
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 3. GESTÃO E APURAÇÃO DA DENÚNCIA (Titularidade e Assunção - Modelo B) */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Label className="text-sm font-semibold uppercase tracking-wide">
                Gestão e Apuração da Denúncia
              </Label>
              {isAssumidoPorMim && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLiberar}
                  disabled={liberar.isPending}
                  className="text-xs text-destructive hover:text-destructive"
                >
                  <UserX className="h-3.5 w-3.5 mr-1" />
                  Liberar ao comitê
                </Button>
              )}
            </div>

            {/* CASO 1: NÃO ASSUMIDA */}
            {isNaoAssumida && (
              <Alert className="border-amber-300 dark:border-amber-700 bg-amber-500/10">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-amber-900 dark:text-amber-300 font-semibold text-sm">
                  Denúncia aguardando responsável
                </AlertTitle>
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-300/90 mt-1">
                  Este relato está no pool compartilhado da empresa. Para alterar o status,
                  registrar diligências, emitir o parecer final ou enviar mensagens ao denunciante,
                  é necessário assumir a denúncia.
                </AlertDescription>
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={handleAssumir}
                    disabled={assumir.isPending}
                    className="gap-1.5"
                  >
                    <UserCheck className="h-4 w-4" />
                    Assumir denúncia para apuração
                  </Button>
                </div>
              </Alert>
            )}

            {/* CASO 2: ASSUMIDA POR OUTRO RESPONSÁVEL */}
            {isAssumidaPorOutro && (
              <Alert className="border-border bg-muted/40">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <AlertTitle className="font-semibold text-sm">
                  Em apuração por {denuncia.assumido_por_nome ?? "outro membro do comitê"}
                </AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1">
                  Assumida em{" "}
                  {denuncia.assumido_em
                    ? format(new Date(denuncia.assumido_em), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : "data não registrada"}
                  . Apenas o responsável que assumiu o caso pode alterar o status, registrar o parecer de apuração ou enviar mensagens ao denunciante.
                </AlertDescription>
                <div className="mt-3">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0}>
                          <Button size="sm" variant="outline" disabled className="gap-1.5">
                            <UserCheck className="h-4 w-4" />
                            Assumir denúncia
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        Esta denúncia já está sob apuração do titular. Ela deve ser liberada de volta ao comitê antes de outro membro assumir.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </Alert>
            )}

            {/* CASO 3: ASSUMIDA PELO USUÁRIO ATUAL */}
            {isAssumidoPorMim && (
              <Alert className="border-emerald-300 dark:border-emerald-700 bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <AlertTitle className="text-emerald-900 dark:text-emerald-300 font-semibold text-sm">
                  Você é o titular responsável por esta apuração
                </AlertTitle>
                <AlertDescription className="text-xs text-emerald-800 dark:text-emerald-300/90 mt-1">
                  Assumida em{" "}
                  {denuncia.assumido_em
                    ? format(new Date(denuncia.assumido_em), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : "—"}
                  . Seus atos, mensagens e alterações de status são registrados na trilha de auditoria para fins de fiscalização.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 4. COMUNICAÇÃO ANÔNIMA COM O DENUNCIANTE (Posicionada logo abaixo de Gestão e Apuração!) */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold uppercase tracking-wide">
                    Comunicação Anônima com o Denunciante
                  </Label>
                </div>
                {denuncia.ultima_mensagem_denunciante_em && (
                  <span className="text-[11px] text-muted-foreground">
                    Última resposta do denunciante:{" "}
                    {format(new Date(denuncia.ultima_mensagem_denunciante_em), "dd/MM 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                O denunciante verá estas mensagens ao consultar o protocolo em /acompanhar. Ele é anônimo — este é o único canal de retorno.
              </p>
            </div>

            {/* Thread de mensagens */}
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 border rounded-md p-3 bg-muted/10">
              {mensagensQuery.isLoading ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Carregando mensagens...</p>
              ) : !mensagensQuery.data || mensagensQuery.data.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center italic">
                  Nenhuma mensagem ainda. Envie a primeira para iniciar o contato com o denunciante.
                </p>
              ) : (
                mensagensQuery.data.map((msg) => {
                  const isComite = msg.autor === "comite";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isComite ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 text-xs space-y-1 ${
                          isComite
                            ? "bg-primary/10 border border-primary/20 text-foreground"
                            : "bg-background border border-amber-300 dark:border-amber-700/60 shadow-xs text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                          {isComite ? (
                            <span className="font-semibold text-primary uppercase tracking-wider">
                              {msg.autor_nome || "Comitê"}
                            </span>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10"
                            >
                              Denunciante (Anônimo)
                            </Badge>
                          )}
                          <span>
                            {format(new Date(msg.created_at), "dd/MM 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="whitespace-pre-wrap leading-relaxed">{msg.mensagem}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Caixa de envio */}
            {isAssumidoPorMim ? (
              <form onSubmit={handleEnviarMensagemComite} className="space-y-2 pt-2 border-t">
                <Textarea
                  value={mensagemComite}
                  onChange={(e) => setMensagemComite(e.target.value)}
                  placeholder="Escreva uma mensagem ou pedido de esclarecimento ao denunciante..."
                  rows={2}
                  maxLength={2000}
                  className="text-xs resize-y"
                  disabled={enviarMensagem.isPending}
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">
                    {mensagemComite.length} / 2000 caracteres
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={enviarMensagem.isPending || !mensagemComite.trim() || mensagemComite.length > 2000}
                    className="gap-1.5 text-xs h-8"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {enviarMensagem.isPending ? "Enviando..." : "Enviar ao denunciante"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="pt-2 border-t space-y-2">
                <Textarea
                  placeholder="Escreva uma mensagem ou pedido de esclarecimento ao denunciante..."
                  rows={2}
                  className="text-xs resize-none bg-muted/30"
                  disabled
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Assuma a denúncia para se comunicar com o denunciante.
                  </p>
                  <Button size="sm" disabled className="gap-1.5 text-xs h-8 opacity-50">
                    <Send className="h-3.5 w-3.5" />
                    Enviar ao denunciante
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 5. TRATAMENTO, STATUS E PARECER DE APURAÇÃO */}
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <Label className="text-sm font-semibold uppercase tracking-wide block">
              Tratamento e Parecer de Apuração
            </Label>

            <div className="space-y-2">
              <Label htmlFor="denuncia-status-select">Status do Relato</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as DenunciaStatus)}
                disabled={!isAssumidoPorMim || atualizar.isPending}
              >
                <SelectTrigger id="denuncia-status-select" className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as DenunciaStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="parecer-apuracao">
                  Parecer Interno de Apuração / Justificativa
                  {isConcluindo && (
                    <span className="text-destructive ml-1">* (obrigatório)</span>
                  )}
                </Label>
                {isAssumidoPorMim && isConcluindo && (
                  <span
                    className={`text-xs ${
                      parecerLength >= 30
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-destructive font-medium"
                    }`}
                  >
                    {parecerLength} / 30 caracteres mínimos
                  </span>
                )}
              </div>

              <Textarea
                id="parecer-apuracao"
                value={parecer}
                onChange={(e) => setParecer(e.target.value)}
                placeholder={
                  isAssumidoPorMim
                    ? "Descreva detalhadamente as diligências realizadas, medidas adotadas e a fundamentação da conclusão..."
                    : "Nenhum parecer registrado até o momento."
                }
                rows={4}
                disabled={!isAssumidoPorMim || atualizar.isPending}
                className="resize-y"
              />

              {isAssumidoPorMim && isConcluindo && !parecerValidoParaConclusao && (
                <p className="text-xs text-destructive flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Para concluir uma denúncia, a Lei 14.457/2022 exige parecer fundamentado com pelo menos 30 caracteres. Faltam {30 - parecerLength} caracteres.
                </p>
              )}
            </div>

            {/* Campo Resumo Público para o Denunciante (ao concluir) */}
            {isConcluindo && isAssumidoPorMim && (
              <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="resumo-publico" className="text-xs font-semibold">
                    Resumo da Conclusão para o Denunciante (Público)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Visível via protocolo em /acompanhar</span>
                </div>
                <Textarea
                  id="resumo-publico"
                  value={resumoPublico}
                  onChange={(e) => setResumoPublico(e.target.value)}
                  placeholder="Ex: A apuração foi concluída pelo comitê e as medidas administrativas foram tomadas para garantir a integridade do ambiente. Agradecemos sua manifestação."
                  rows={3}
                  maxLength={500}
                  className="text-xs resize-y"
                />
                <p className="text-[11px] text-muted-foreground">
                  Este é o texto que a pessoa que denunciou verá ao consultar o protocolo. Seja acolhedor e não exponha dados sigilosos ou nomes de pessoas.
                </p>
              </div>
            )}

            {isAssumidoPorMim && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSalvar}
                  disabled={
                    !hasChanges ||
                    atualizar.isPending ||
                    (isConcluindo && !parecerValidoParaConclusao)
                  }
                >
                  {atualizar.isPending ? "Salvando..." : "Salvar Apuração"}
                </Button>
              </div>
            )}
          </div>

          {/* 6. PAINEL DE HISTÓRICO DE APURAÇÃO (Trilha de Auditoria) */}
          <Collapsible open={historicoAberto} onOpenChange={setHistoricoAberto}>
            <div className="rounded-lg border bg-card">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <History className="h-4 w-4 text-primary" />
                    Trilha de Auditoria e Histórico de Tramitação
                    {historicoQuery.data && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {historicoQuery.data.length}
                      </Badge>
                    )}
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                      historicoAberto ? "transform rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t space-y-3">
                  {historicoQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground py-2">
                      Carregando histórico...
                    </p>
                  ) : !historicoQuery.data || historicoQuery.data.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">
                      Nenhum registro de alteração anterior.
                    </p>
                  ) : (
                    <div className="space-y-2.5 pt-2">
                      {historicoQuery.data.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border bg-muted/20 p-3 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-medium text-foreground">
                              {item.alterado_por_nome || "Usuário"}
                            </span>
                            <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(
                                new Date(item.created_at),
                                "dd/MM/yyyy 'às' HH:mm",
                                { locale: ptBR }
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className="text-[10px]">
                              {STATUS_LABEL[item.status_anterior as DenunciaStatus] ??
                                item.status_anterior ??
                                "—"}
                            </Badge>
                            <span className="text-muted-foreground">➔</span>
                            <Badge variant="default" className="text-[10px]">
                              {STATUS_LABEL[item.status_novo as DenunciaStatus] ??
                                item.status_novo}
                            </Badge>
                          </div>
                          {item.justificativa && (
                            <div className="mt-1 pt-1 border-t border-border/50 text-muted-foreground italic">
                              "{item.justificativa}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}
