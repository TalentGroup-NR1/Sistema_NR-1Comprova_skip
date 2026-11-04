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
  CheckCircle2,
  ChevronDown,
  Clock,
  History,
  Lock,
  UserCheck,
  UserX,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DenunciaAdmin,
  DenunciaStatus,
  useAssumirDenuncia,
  useAtualizarStatusDenuncia,
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

  const [status, setStatus] = useState<DenunciaStatus>("novo");
  const [parecer, setParecer] = useState<string>("");
  const [historicoAberto, setHistoricoAberto] = useState<boolean>(false);

  useEffect(() => {
    if (denuncia) {
      setStatus(denuncia.status);
      setParecer(denuncia.parecer_atual ?? "");
      setHistoricoAberto(false);
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
    (parecer.trim() !== (denuncia.parecer_atual ?? "").trim() && parecerLength > 0);

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
      });
      toast.success("Tratamento da denúncia atualizado com sucesso.");
    } catch (err: any) {
      toast.error("Erro ao atualizar denúncia", { description: err?.message });
    }
  };

  return (
    <Dialog open={!!denuncia} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl">{denuncia.titulo}</DialogTitle>
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
          </div>

          {extraHeader}

          {/* Mensagem da denúncia */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Mensagem Original do Relato
            </Label>
            <div className="mt-1.5 rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
              {denuncia.mensagem}
            </div>
          </div>

          {/* Painel de Prazos Legais (Lei 14.457/2022) */}
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

          {/* BLOCO DE ASSUNÇÃO E TRATAMENTO (Modelo B - Lei 14.457/2022) */}
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
                  registrar diligências ou emitir o parecer final, é necessário assumir a denúncia.
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
                  . Apenas o responsável que assumiu o caso pode alterar o status ou registrar o parecer de apuração.
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
                  . Seus atos e alterações de status são registrados na trilha de auditoria para fins de fiscalização.
                </AlertDescription>
              </Alert>
            )}

            {/* Formulário de Status e Parecer */}
            <div className="space-y-4 pt-2">
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
                    Parecer de Apuração / Justificativa
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
          </div>

          {/* PAINEL DE HISTÓRICO DE APURAÇÃO (Trilha de Auditoria) */}
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
