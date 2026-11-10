import { useEffect, useMemo, useState } from "react";
import { addYears, differenceInCalendarDays, format } from "date-fns";
import { calcularLimiteGozo } from "@/lib/feriasEngine";
import { ptBR } from "date-fns/locale";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { parseISODate, formatDateToISO } from "@/lib/validators/colaborador";
import type { PeriodoAquisitivo } from "@/hooks/useFerias";

interface LancarFeriasPassadasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  companyId: string;
  admissionDate: string;
  periodos: PeriodoAquisitivo[];
}

const NOVO = "__novo__";

interface Fracao {
  inicioGozo: string;
  fimGozo: string;
  diasDescanso: number;
  diasAbono: number;
  dataPagamento: string;
  observacoes: string;
}

const emptyFracao = (): Fracao => ({
  inicioGozo: "",
  fimGozo: "",
  diasDescanso: 0,
  diasAbono: 0,
  dataPagamento: "",
  observacoes: "",
});

export function LancarFeriasPassadasDialog({
  open,
  onOpenChange,
  colaboradorId,
  companyId,
  admissionDate,
  periodos,
}: LancarFeriasPassadasDialogProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const [periodoId, setPeriodoId] = useState<string>("");
  const [novoInicio, setNovoInicio] = useState("");
  const [novoFim, setNovoFim] = useState("");
  const [fracoes, setFracoes] = useState<Fracao[]>([emptyFracao()]);

  const periodosOrdenados = useMemo(
    () =>
      [...periodos].sort(
        (a, b) =>
          new Date(b.data_inicio_aquisitivo).getTime() -
          new Date(a.data_inicio_aquisitivo).getTime()
      ),
    [periodos]
  );

  useEffect(() => {
    if (!open) return;
    if (periodoId === NOVO) {
      if (!novoInicio) {
        const ultimo = periodosOrdenados[0];
        const baseIni = ultimo
          ? parseISODate(ultimo.data_fim_aquisitivo)
          : parseISODate(admissionDate);
        const baseFim = addYears(baseIni, 1);
        setNovoInicio(formatDateToISO(baseIni));
        setNovoFim(formatDateToISO(baseFim));
      }
    } else {
      const p = periodosOrdenados.find((x) => x.id === periodoId);
      if (p) {
        setNovoInicio(p.data_inicio_aquisitivo);
        setNovoFim(p.data_fim_aquisitivo);
      }
    }
  }, [periodoId, open, novoInicio, periodosOrdenados, admissionDate]);

  useEffect(() => {
    if (open) {
      setPeriodoId(periodosOrdenados[0]?.id || NOVO);
      setNovoInicio("");
      setNovoFim("");
      setFracoes([emptyFracao()]);
    }
  }, [open, periodosOrdenados]);

  const updateFracao = (idx: number, patch: Partial<Fracao>) => {
    setFracoes((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      // auto-calc dias de descanso
      if (patch.inicioGozo !== undefined || patch.fimGozo !== undefined) {
        const { inicioGozo, fimGozo } = next[idx];
        if (inicioGozo && fimGozo) {
          const dias =
            differenceInCalendarDays(parseISODate(fimGozo), parseISODate(inicioGozo)) + 1;
          if (dias > 0) next[idx].diasDescanso = dias;
        }
      }
      return next;
    });
  };

  const addFracao = () => {
    if (fracoes.length >= 3) return;
    setFracoes((prev) => [...prev, emptyFracao()]);
  };

  const removeFracao = (idx: number) => {
    setFracoes((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  };

  const totalDescanso = fracoes.reduce((s, f) => s + (Number(f.diasDescanso) || 0), 0);
  const totalAbono = fracoes.reduce((s, f) => s + (Number(f.diasAbono) || 0), 0);

  const handleSubmit = async () => {
    for (const [i, f] of fracoes.entries()) {
      if (!f.inicioGozo || !f.fimGozo) {
        toast({ title: `Período ${i + 1}: preencha início e fim`, variant: "destructive" });
        return;
      }
      if (parseISODate(f.fimGozo) < parseISODate(f.inicioGozo)) {
        toast({ title: `Período ${i + 1}: data fim anterior ao início`, variant: "destructive" });
        return;
      }
      if (f.diasDescanso <= 0) {
        toast({ title: `Período ${i + 1}: dias inválidos`, variant: "destructive" });
        return;
      }
    }
    if (periodoId === NOVO && (!novoInicio || !novoFim)) {
      toast({ title: "Defina o período aquisitivo", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let targetPeriodoId = periodoId;
      const hojeISO = formatDateToISO(new Date());

      // Por fração: já passou → 'gozado'; ainda vai acontecer → 'aprovado'
      const statusPorFracao = fracoes.map((f) =>
        f.fimGozo < hojeISO ? ("gozado" as const) : ("aprovado" as const)
      );
      const temFuturo = statusPorFracao.some((s) => s === "aprovado");

      if (periodoId === NOVO) {
        const fimDate = parseISODate(novoFim);
        const limite = calcularLimiteGozo(fimDate);
        const { data: created, error: errPer } = await supabase
          .from("ferias_periodos_aquisitivos")
          .insert({
            colaborador_id: colaboradorId,
            company_id: companyId,
            data_inicio_aquisitivo: novoInicio,
            data_fim_aquisitivo: novoFim,
            data_limite_gozo: formatDateToISO(limite),
            dias_adquiridos: 30,
            // Se existe descanso ainda a ocorrer, o período fica aberto
            status: temFuturo ? "aberto" : "fechado",
          })
          .select()
          .single();
        if (errPer) throw errPer;
        targetPeriodoId = created.id;
      } else {
        // Atualiza datas do período aquisitivo selecionado (permite correção)
        const periodoOriginal = periodosOrdenados.find((p) => p.id === targetPeriodoId);
        const patch: Record<string, any> = {};
        if (
          periodoOriginal &&
          (periodoOriginal.data_inicio_aquisitivo !== novoInicio ||
            periodoOriginal.data_fim_aquisitivo !== novoFim)
        ) {
          if (!novoInicio || !novoFim) {
            throw new Error("Defina as datas do período aquisitivo");
          }
          patch.data_inicio_aquisitivo = novoInicio;
          patch.data_fim_aquisitivo = novoFim;
          patch.data_limite_gozo = formatDateToISO(calcularLimiteGozo(parseISODate(novoFim)));
        }
        if (temFuturo) patch.status = "aberto";
        if (Object.keys(patch).length > 0) {
          const { error: errUpd } = await supabase
            .from("ferias_periodos_aquisitivos")
            .update(patch)
            .eq("id", targetPeriodoId);
          if (errUpd) throw errUpd;
        }
      }

      const rows = fracoes.map((f, idx) => {
        const pagamento = f.dataPagamento || formatDateToISO(parseISODate(f.inicioGozo));
        const obsFinal = [
          f.observacoes,
          f.diasAbono > 0 ? `Abono pecuniário: ${f.diasAbono} dia(s)` : null,
        ]
          .filter(Boolean)
          .join(" | ");
        return {
          colaborador_id: colaboradorId,
          company_id: companyId,
          periodo_aquisitivo_id: targetPeriodoId,
          data_inicio_gozo: f.inicioGozo,
          data_fim_gozo: f.fimGozo,
          dias_gozados: f.diasDescanso,
          data_pagamento: pagamento,
          abono_pecuniario_dias: f.diasAbono,
          status: statusPorFracao[idx],
          observacoes: obsFinal || null,
        };
      });

      const { error: errGozo } = await supabase.from("ferias_gozo").insert(rows);
      if (errGozo) throw errGozo;

      queryClient.invalidateQueries({ queryKey: ["ferias-colaborador"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores-ferias"] });
      const totalFuturo = statusPorFracao.filter((s) => s === "aprovado").length;
      toast({
        title: `Férias lançadas (${rows.length} período(s))`,
        description: totalFuturo > 0
          ? `${totalFuturo} ainda a gozar — período aquisitivo permanece em aberto.`
          : undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao lançar férias",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lançar férias (passadas ou agendadas)</DialogTitle>
          <DialogDescription>
            Registre férias já gozadas ou que ainda serão tiradas. Fracione em até 3 períodos. Lançamentos com data futura ficam como <strong>aprovado</strong> e mantêm o período aquisitivo em aberto até o gozo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Período aquisitivo</Label>
            <Select value={periodoId} onValueChange={setPeriodoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {periodosOrdenados.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {format(parseISODate(p.data_inicio_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                    {" – "}
                    {format(parseISODate(p.data_fim_aquisitivo), "dd/MM/yyyy", { locale: ptBR })}
                  </SelectItem>
                ))}
                <SelectItem value={NOVO}>
                  <span className="flex items-center gap-2">
                    <Plus className="h-3 w-3" /> Criar novo período aquisitivo…
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-muted/40">
            <div className="col-span-2 text-xs text-muted-foreground">
              {periodoId === NOVO
                ? "Defina as datas do novo período aquisitivo."
                : "Edite as datas se houver erro de digitação no período aquisitivo selecionado."}
            </div>
              <div className="space-y-1">
                <Label className="text-xs">Início do período</Label>
                <Input type="date" value={novoInicio} onChange={(e) => setNovoInicio(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim do período</Label>
                <Input type="date" value={novoFim} onChange={(e) => setNovoFim(e.target.value)} />
              </div>
          </div>

          <div className="space-y-3">
            {fracoes.map((f, idx) => (
              <div key={idx} className="rounded-md border p-3 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Período de descanso {idx + 1}</span>
                  {fracoes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFracao(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Início do descanso</Label>
                    <Input
                      type="date"
                      value={f.inicioGozo}
                      onChange={(e) => updateFracao(idx, { inicioGozo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fim do descanso</Label>
                    <Input
                      type="date"
                      value={f.fimGozo}
                      onChange={(e) => updateFracao(idx, { fimGozo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dias de descanso</Label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={f.diasDescanso}
                      onChange={(e) => updateFracao(idx, { diasDescanso: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dias de abono</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={f.diasAbono}
                      onChange={(e) => updateFracao(idx, { diasAbono: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de pagamento</Label>
                    <Input
                      type="date"
                      value={f.dataPagamento}
                      onChange={(e) => updateFracao(idx, { dataPagamento: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Observações</Label>
                  <Textarea
                    rows={2}
                    value={f.observacoes}
                    onChange={(e) => updateFracao(idx, { observacoes: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            ))}

            {fracoes.length < 3 && (
              <Button type="button" variant="outline" size="sm" onClick={addFracao}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar período de descanso
              </Button>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              Total: <strong>{totalDescanso}</strong> dia(s) de descanso e <strong>{totalAbono}</strong> dia(s) de abono. Cada fração é salva como <strong>gozado</strong> (se a data fim já passou) ou <strong>aprovado</strong> (se ainda vai ocorrer), vinculada ao período aquisitivo selecionado.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
