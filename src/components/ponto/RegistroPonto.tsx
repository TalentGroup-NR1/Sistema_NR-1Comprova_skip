import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Play, Square, MapPin, Info, Paperclip, Edit3 } from "lucide-react";
import { decidirBotoes } from "./registroPontoBotoes";
import { usePontoRegistros, PontoRegistroTipo, useUltimoDiaComBatidas, useUltimoRegistro } from "@/hooks/usePontoRegistros";
import { LancarPontoManualDialog } from "./LancarPontoManualDialog";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { formatMinutes, calcularResumoDiario } from "@/hooks/usePontoResumo";
import { useFeriados } from "@/hooks/useFeriados";
import { useFeriasAtivas } from "@/hooks/useFeriasAtivas";
import { useColaboradorWorkSchedule } from "@/hooks/useColaboradorWorkSchedule";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { getHojeBR } from "@/lib/dateBR";

export interface RegistroPontoProps {
  compact?: boolean;
}

type StatusJornada = {
  label: string;
  color: string; // hex
};

export function RegistroPonto({ compact = false }: RegistroPontoProps = {}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [observacao, setObservacao] = useState("");
  const [showObs, setShowObs] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [manualDefaultDate, setManualDefaultDate] = useState<string | undefined>(undefined);
  const [warningInfo, setWarningInfo] = useState<{ missingAt: string; missingDay?: string; message?: string } | null>(null);
  const { todayRegistros, registrarPonto, lancarPontoManual } = usePontoRegistros();
  const { config } = usePontoConfig();
  const { user } = useAuth();
  const { feriadosMap } = useFeriados();

  const { data: meuColab } = useQuery({
    queryKey: ["meu-colab-id-ponto", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from("colaboradores").select("id").eq("user_id", user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const today = getHojeBR();
  const { feriasDates } = useFeriasAtivas(meuColab?.id, today, today);
  const isFerias = feriasDates.has(today);
  const feriadoHoje = feriadosMap.get(today);
  const { data: workSchedule } = useColaboradorWorkSchedule(meuColab?.id);
  const { data: inconsistencia } = useUltimoDiaComBatidas(meuColab?.id);
  const { data: ultimoRegistro } = useUltimoRegistro(meuColab?.id);

  const { entradaDisabled, saidaDisabled, entradaTooltip, saidaTooltip } =
    decidirBotoes(ultimoRegistro ?? null, currentTime);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const resumo = calcularResumoDiario(todayRegistros, config || null, today, undefined, undefined, feriadosMap, feriasDates, workSchedule ?? null);

  const inferTipo = (acao: "ENTRADA" | "SAIDA"): PontoRegistroTipo => {
    return acao;
  };

  const handleRegistrar = async (acao: "ENTRADA" | "SAIDA") => {
    if (acao === "ENTRADA" && entradaDisabled) {
      toast.error(entradaTooltip || "Sequência inválida de marcações.");
      return;
    }
    if (acao === "SAIDA" && saidaDisabled) {
      toast.error(saidaTooltip || "Sequência inválida de marcações.");
      return;
    }
    const tipo = inferTipo(acao);
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (config?.geolocation_required && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // sem geo
      }
    }

    try {
      const result: any = await registrarPonto.mutateAsync({
        tipo,
        observacao: observacao.trim() || undefined,
        latitude,
        longitude,
      });
      setObservacao("");
      setShowObs(false);
      if (result?.warning?.warning) {
        setWarningInfo({
          missingAt: result.warning.missingAt,
          missingDay: result.warning.missingDay,
          message: result.warning.message,
        });
      }
    } catch {
      // toast já é emitido pelo hook
    }
  };

  const tipoLabel: Record<string, string> = {
    ENTRADA: "Entrada",
    SAIDA: "Saída",
  };

  // Status dinâmico
  const status: StatusJornada = (() => {
    const last = todayRegistros[todayRegistros.length - 1];
    if (!last) return { label: "Jornada não iniciada", color: "#D97706" };
    if (last.tipo === "ENTRADA")
      return { label: "Em jornada", color: "#059669" };
    return { label: "Jornada encerrada", color: "#64748B" };
  })();

  const instructionText = (() => {
    const last = todayRegistros[todayRegistros.length - 1];
    if (!last) return "Bata sua ENTRADA primeiro.";
    if (last.tipo === "ENTRADA") return "Você está em jornada. Bata SAÍDA para encerrar ou iniciar uma pausa.";
    return "Jornada encerrada. Nova batida iniciará novo ciclo.";
  })();

  return (
    <div className="space-y-8">
      {/* Relógio */}
      <div
        className={`rounded-xl border border-[#F1F0ED] bg-white animate-fade-in ${compact ? "p-4" : "p-8"}`}
        style={{ animationFillMode: "both" }}
      >
        <div className="flex flex-col items-center">
          <div
            className={`font-mono font-bold leading-none text-[#0F172A] tracking-tight tabular-nums animate-scale-in ${
              compact ? "text-[32px] md:text-[40px]" : "text-[48px] md:text-[72px]"
            }`}
            style={{ animationFillMode: "both" }}
          >
            {format(currentTime, "HH:mm:ss")}
          </div>

          {/* Status */}
          <div className={`flex items-center gap-2 ${compact ? "mt-2" : "mt-5"}`}>
            <span
              className="inline-block w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: status.color }}
            />
            <span className="text-sm font-medium" style={{ color: status.color }}>
              {status.label}
            </span>
          </div>

          {!compact && config?.geolocation_required && (
            <div className="flex items-center gap-1 text-xs text-[#94A3B8] mt-3">
              <MapPin className="h-3 w-3" />
              Geolocalização ativada
            </div>
          )}
        </div>


        {(isFerias || feriadoHoje) && (
          <div className="mt-6 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-900 text-sm text-center">
            {isFerias
              ? "Você está de férias. O registro de ponto está bloqueado neste período."
              : `Hoje é feriado: ${feriadoHoje?.nome}. Bater o ponto é opcional — horas trabalhadas serão computadas como extras.`}
          </div>
        )}

        {inconsistencia && !isFerias && !compact && (
          <div className="mt-6 p-2.5 rounded-md border border-[#F1F0ED] bg-[#FAFAF8] text-[#64748B] text-xs">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span>
                  Saída pendente de {format(parseISO(inconsistencia.data), "dd/MM/yyyy")}.
                  Regularize pelo painel manual quando puder.
                </span>
                <button
                  className="ml-2 text-xs underline text-[#D97706] hover:text-[#F59E0B]"
                  onClick={() => {
                    setManualDefaultDate(inconsistencia.data);
                    setShowManualDialog(true);
                  }}
                >
                  Lançar ponto manual
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Botões ENTRADA / SAÍDA */}
        <div className={`mx-auto max-w-[400px] flex flex-col sm:flex-row items-center justify-center ${compact ? "mt-3 gap-2" : "mt-4 gap-4"}`}>
          <button
            type="button"
            title={entradaTooltip}
            onClick={() => handleRegistrar("ENTRADA")}
            disabled={registrarPonto.isPending || isFerias || entradaDisabled}
            className={`rounded-[10px] font-display font-semibold text-white inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#059669] to-[#047857] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_4px_15px_rgba(5,150,105,0.25)] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none disabled:cursor-not-allowed cursor-pointer ${
              compact ? "h-9 w-[140px] px-4 text-[13px]" : "h-11 w-[180px] px-8 text-[15px]"
            }`}
          >
            <Play className="h-4 w-4" fill="currentColor" />
            ENTRADA
          </button>
          <button
            type="button"
            title={saidaTooltip}
            onClick={() => handleRegistrar("SAIDA")}
            disabled={registrarPonto.isPending || isFerias || saidaDisabled}
            className={`rounded-[10px] font-display font-semibold text-[#DC2626] inline-flex items-center justify-center gap-2 bg-[#FEF2F2] border border-[#FCA5A5] transition-all duration-200 hover:bg-[#FEE2E2] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              compact ? "h-9 w-[140px] px-4 text-[13px]" : "h-11 w-[180px] px-8 text-[15px]"
            }`}
          >
            <Square className="h-4 w-4" fill="currentColor" />
            SAÍDA
          </button>
        </div>

        {/* Mensagens de instrução (ocultas em modo compacto - exibidas no módulo de ponto) */}
        {!compact && (
          <>
            <p className="mt-4 text-sm italic text-[#94A3B8] text-center">{instructionText}</p>
            {(entradaDisabled || saidaDisabled) && !isFerias && (
              <p className="text-xs text-[#94A3B8] mt-2 text-center">
                {entradaDisabled ? entradaTooltip : saidaTooltip}
              </p>
            )}
            <p className="text-xs text-[#CBD5E1] mt-2 text-center">
              Pausas são identificadas pela sequência SAÍDA e nova ENTRADA no mesmo dia.
            </p>
          </>
        )}

        {/* Link: Lançar Ponto Manual (centralizado) */}
        <div className={`flex items-center justify-center ${compact ? "mt-3 pt-3 border-t border-[#F1F0ED]" : "mt-4 pt-4 border-t border-[#F1F0ED]"}`}>
          <button
            onClick={() => {
              setManualDefaultDate(undefined);
              setShowManualDialog(true);
            }}
            disabled={isFerias}
            className={`inline-flex items-center gap-1.5 font-medium text-[#D97706] hover:text-[#F59E0B] hover:underline transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${compact ? "text-xs" : "text-sm"}`}
          >
            <Edit3 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
            Lançar Ponto Manual
          </button>
        </div>



      </div>


      {!compact && (
        <>
          {/* Resumo do dia */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Trabalhado", value: formatMinutes(resumo.horasTrabalhadasMin), color: "text-[#1E293B]" },
              { label: "Previsto", value: formatMinutes(resumo.horasPrevistasMin), color: "text-[#1E293B]" },
              { label: "Horas Extras", value: formatMinutes(resumo.horasExtrasMin), color: "text-[#059669]" },
              {
                label: "Saldo",
                value: formatMinutes(resumo.saldoMin),
                color: resumo.saldoMin >= 0 ? "text-[#059669]" : "text-[#DC2626]",
              },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#F1F0ED] bg-white p-4 text-center">
                <p className="text-xs text-[#64748B]">{s.label}</p>
                <p className={`text-xl font-bold font-numeric ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Timeline de hoje */}
          <div className="rounded-xl border border-[#F1F0ED] bg-white p-5">
            <h3 className="font-display text-base font-medium text-[#1E293B] mb-3">
              Registros de Hoje
            </h3>
            {todayRegistros.length === 0 ? (
              <p className="text-sm text-[#64748B] text-center py-4">
                Nenhum registro hoje. Bata seu ponto acima.
              </p>
            ) : (
              <div className="overflow-x-auto py-4">
                <div className="relative flex items-center justify-around min-w-fit gap-6 px-4">
                  <div className="absolute left-4 right-4 top-[42px] h-px bg-[#E2E8F0]" />
                  {todayRegistros.map((reg) => {
                    const isEntrada = reg.tipo === "ENTRADA";
                    const dotColor = isEntrada ? "bg-emerald-500" : "bg-red-500";
                    const timeColor = isEntrada ? "text-emerald-600" : "text-red-600";
                    return (
                      <div key={reg.id} className="relative flex flex-col items-center gap-1 min-w-[72px]">
                        <span className={`font-mono font-semibold text-sm ${timeColor}`}>
                          {format(new Date(reg.data_hora), "HH:mm")}
                        </span>
                        <div className={`w-4 h-4 rounded-full border-2 border-background shadow ${dotColor} z-10`} />
                        <span className="text-[10px] text-[#64748B] text-center whitespace-nowrap">
                          {tipoLabel[reg.tipo]}
                        </span>
                        <div className="flex items-center gap-1 flex-wrap justify-center">
                          {reg.status_aprovacao === "pendente" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-700">Pendente</Badge>
                          )}
                          {reg.status_aprovacao === "rejeitado" && (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-red-100 text-red-700">Rejeitado</Badge>
                          )}
                          {reg.ajuste_manual && reg.status_aprovacao === "aprovado" && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0">Ajuste</Badge>
                          )}
                          {reg.latitude && <MapPin className="h-3 w-3 text-[#94A3B8]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <LancarPontoManualDialog
        open={showManualDialog}
        onOpenChange={setShowManualDialog}
        onSubmit={(params) => {
          lancarPontoManual.mutate(params, {
            onSuccess: () => setShowManualDialog(false),
          });
        }}
        isPending={lancarPontoManual.isPending}
        defaultDate={manualDefaultDate}
      />

      <AlertDialog open={!!warningInfo} onOpenChange={(open) => !open && setWarningInfo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcação faltante detectada</AlertDialogTitle>
            <AlertDialogDescription>
              {warningInfo &&
                (warningInfo.message
                  ? `${warningInfo.message} Última batida registrada às ${format(
                      new Date(warningInfo.missingAt),
                      "HH:mm",
                    )}.`
                  : `Falta uma marcação (última às ${format(
                      new Date(warningInfo.missingAt),
                      "HH:mm",
                    )}). Você pode continuar, mas é recomendado corrigir no Histórico.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Corrigir depois</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setWarningInfo(null);
                window.dispatchEvent(
                  new CustomEvent("ponto:goto-tab", { detail: { tab: "historico" } }),
                );
              }}
            >
              Ir para Ajuste agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
