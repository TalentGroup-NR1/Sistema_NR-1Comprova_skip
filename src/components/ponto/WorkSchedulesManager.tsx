import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  useWorkSchedules,
  type WorkSchedule,
  type WorkScheduleInput,
  type HorariosPorDia,
  type HorarioDia,
} from "@/hooks/useWorkSchedules";

const empty: WorkScheduleInput = {
  nome: "",
  entrada_manha: "08:00",
  saida_manha: "12:00",
  entrada_tarde: "13:00",
  saida_tarde: "17:00",
  carga_diaria_minutos: 480,
  tolerancia_minutos: 0,
  ativo: true,
  dias_semana: [1, 2, 3, 4, 5],
  trabalha_feriados: false,
  horarios_por_dia: null,
};


const DOW_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];
const DOW_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatDiasSemana(dias: number[], trabalhaFeriados: boolean): string {
  const sorted = [...(dias || [])].sort();
  const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === i + 1);
  const isWeekend = sorted.length === 2 && sorted[0] === 0 && sorted[1] === 6;
  let label = "";
  if (isWeekdays) label = "Seg a Sex";
  else if (isWeekend) label = "Sáb e Dom";
  else if (sorted.length === 0) label = "Nenhum dia";
  else label = sorted.map((d) => DOW_NAMES[d]).join(", ");
  if (trabalhaFeriados) label += " + Feriados";
  return label;
}

function diffMinutes(start: string | null | undefined, end: string | null | undefined): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

function cargaFromDia(d: HorarioDia): number {
  return diffMinutes(d.em, d.sm) + diffMinutes(d.et, d.st);
}

function diaKey(d: HorarioDia): string {
  return `${d.em ?? ""}|${d.sm ?? ""}|${d.et ?? ""}|${d.st ?? ""}`;
}

/** Agrupa dias contíguos com mesmo horário: "Seg–Qui 09:00–18:30 · Sex 09:00–15:00". */
function formatHorariosPorDia(dias: number[], hp: HorariosPorDia): string {
  const sorted = [...dias].sort((a, b) => a - b);
  if (sorted.length === 0) return "—";
  const fmtRange = (d: HorarioDia) => {
    const p1 = d.em && d.sm ? `${d.em}–${d.sm}` : "";
    const p2 = d.et && d.st ? `${d.et}–${d.st}` : "";
    return [p1, p2].filter(Boolean).join(" / ") || "—";
  };
  const groups: { start: number; end: number; key: string; dia: HorarioDia }[] = [];
  for (const dow of sorted) {
    const dia = hp[String(dow)] || {};
    const k = diaKey(dia);
    const last = groups[groups.length - 1];
    if (last && last.key === k && last.end + 1 === dow) {
      last.end = dow;
    } else {
      groups.push({ start: dow, end: dow, key: k, dia });
    }
  }
  return groups
    .map((g) => {
      const label = g.start === g.end ? DOW_NAMES[g.start] : `${DOW_NAMES[g.start]}–${DOW_NAMES[g.end]}`;
      return `${label} ${fmtRange(g.dia)}`;
    })
    .join(" · ");
}

export function WorkSchedulesManager() {
  const { data: schedules = [], create, update, remove } = useWorkSchedules();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkSchedule | null>(null);
  const [form, setForm] = useState<WorkScheduleInput>(empty);
  const [variaPorDia, setVariaPorDia] = useState(false);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setVariaPorDia(false);
    setOpen(true);
  };

  const openEdit = (s: WorkSchedule) => {
    setEditing(s);
    const hp = s.horarios_por_dia ?? null;
    setForm({
      nome: s.nome,
      entrada_manha: s.entrada_manha?.substring(0, 5) || null,
      saida_manha: s.saida_manha?.substring(0, 5) || null,
      entrada_tarde: s.entrada_tarde?.substring(0, 5) || null,
      saida_tarde: s.saida_tarde?.substring(0, 5) || null,
      carga_diaria_minutos: s.carga_diaria_minutos,
      tolerancia_minutos: s.tolerancia_minutos ?? 0,
      ativo: s.ativo,
      dias_semana: s.dias_semana ?? [1, 2, 3, 4, 5],
      trabalha_feriados: s.trabalha_feriados ?? false,
      horarios_por_dia: hp,
    });

    setVariaPorDia(!!hp && Object.keys(hp).length > 0);
    setOpen(true);
  };

  const autoCalc = () => {
    const total = diffMinutes(form.entrada_manha, form.saida_manha) + diffMinutes(form.entrada_tarde, form.saida_tarde);
    setForm({ ...form, carga_diaria_minutos: total });
  };

  // ----- per-day editor helpers -----
  const hp: HorariosPorDia = useMemo(() => form.horarios_por_dia ?? {}, [form.horarios_por_dia]);

  const setDia = (dow: number, patch: Partial<HorarioDia>) => {
    const cur: HorarioDia = hp[String(dow)] ?? {};
    const next: HorarioDia = { ...cur, ...patch };
    next.carga = cargaFromDia(next);
    const newHp: HorariosPorDia = { ...hp, [String(dow)]: next };
    setForm({ ...form, horarios_por_dia: newHp });
  };

  const onToggleVaria = (v: boolean) => {
    setVariaPorDia(v);
    if (v) {
      // seed each selected day with the current single block
      const seed: HorariosPorDia = {};
      const base: HorarioDia = {
        em: form.entrada_manha || null,
        sm: form.saida_manha || null,
        et: form.entrada_tarde || null,
        st: form.saida_tarde || null,
      };
      base.carga = cargaFromDia(base);
      for (const d of form.dias_semana) {
        seed[String(d)] = { ...base };
      }
      setForm({ ...form, horarios_por_dia: seed });
    } else {
      setForm({ ...form, horarios_por_dia: null });
    }
  };

  const onChangeDias = (next: number[]) => {
    const sorted = [...next].sort((a, b) => a - b);
    if (!variaPorDia) {
      setForm({ ...form, dias_semana: sorted });
      return;
    }
    // sincroniza chaves do hp com a seleção
    const newHp: HorariosPorDia = {};
    const base: HorarioDia = {
      em: form.entrada_manha || null,
      sm: form.saida_manha || null,
      et: form.entrada_tarde || null,
      st: form.saida_tarde || null,
    };
    base.carga = cargaFromDia(base);
    for (const d of sorted) {
      newHp[String(d)] = hp[String(d)] ?? { ...base };
    }
    setForm({ ...form, dias_semana: sorted, horarios_por_dia: newHp });
  };

  const copiarParaTodos = () => {
    const firstKey = form.dias_semana[0];
    if (firstKey === undefined) return;
    const ref = hp[String(firstKey)];
    if (!ref) return;
    const newHp: HorariosPorDia = {};
    for (const d of form.dias_semana) {
      newHp[String(d)] = { ...ref, carga: cargaFromDia(ref) };
    }
    setForm({ ...form, horarios_por_dia: newHp });
    toast.success("Horário do primeiro dia copiado para os demais");
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do horário");
      return;
    }

    let payload: WorkScheduleInput = { ...form };

    if (variaPorDia) {
      // validação básica e sincronização dos campos planos
      const dias = form.dias_semana;
      if (dias.length === 0) {
        toast.error("Selecione pelo menos um dia de trabalho");
        return;
      }
      const newHp: HorariosPorDia = {};
      let maxCarga = 0;
      for (const d of dias) {
        const dia: HorarioDia = hp[String(d)] ?? {};
        const carga = cargaFromDia(dia);
        if (carga < 1) {
          toast.error(`Informe entrada e saída para ${DOW_NAMES[d]}`);
          return;
        }
        newHp[String(d)] = { ...dia, carga };
        if (carga > maxCarga) maxCarga = carga;
      }
      // primeiro dia vira referência para campos planos (retrocompat)
      const first = newHp[String(dias[0])];
      payload = {
        ...form,
        horarios_por_dia: newHp,
        entrada_manha: first.em || null,
        saida_manha: first.sm || null,
        entrada_tarde: first.et || null,
        saida_tarde: first.st || null,
        carga_diaria_minutos: maxCarga,
      };
    } else {
      payload.horarios_por_dia = null;
    }

    if (editing) {
      await update.mutateAsync({ id: editing.id, ...payload });
    } else {
      await create.mutateAsync(payload);
    }
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Horários de Trabalho</CardTitle>
          <CardDescription>Cadastre os horários padrão usados pelos colaboradores desta empresa</CardDescription>
        </div>
        <Button size="sm" onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo</Button>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum horário cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map((s) => {
              const hasHp = !!s.horarios_por_dia && Object.keys(s.horarios_por_dia).length > 0;
              return (
                <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{s.nome}</span>
                      {!s.ativo && <Badge variant="secondary">Inativo</Badge>}
                      {hasHp && <Badge variant="outline">Horário variável</Badge>}
                      <Badge variant="outline">
                        {(s.tolerancia_minutos ?? 0) > 0
                          ? `Tolerância ${s.tolerancia_minutos}min`
                          : "Minuto a minuto"}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {hasHp
                        ? formatHorariosPorDia(s.dias_semana ?? [], s.horarios_por_dia as HorariosPorDia)
                        : (
                          <>
                            {s.entrada_manha && s.saida_manha ? `${s.entrada_manha.substring(0, 5)}–${s.saida_manha.substring(0, 5)}` : "—"}
                            {s.entrada_tarde && s.saida_tarde ? ` / ${s.entrada_tarde.substring(0, 5)}–${s.saida_tarde.substring(0, 5)}` : ""}
                            {" · "}{Math.floor(s.carga_diaria_minutos / 60)}h{s.carga_diaria_minutos % 60 ? ` ${s.carga_diaria_minutos % 60}min` : ""}
                          </>
                        )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDiasSemana(s.dias_semana ?? [1, 2, 3, 4, 5], s.trabalha_feriados ?? false)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (confirm(`Remover horário "${s.nome}"?`)) remove.mutate(s.id);
                    }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Horário" : "Novo Horário"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Comercial 9h–18h" />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Horário varia por dia da semana</Label>
                <p className="text-xs text-muted-foreground">Use para escalas como Seg–Qui 09:00–18:30 e Sex 09:00–15:00.</p>
              </div>
              <Switch checked={variaPorDia} onCheckedChange={onToggleVaria} />
            </div>

            {!variaPorDia && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Entrada Manhã</Label>
                    <Input type="time" value={form.entrada_manha || ""} onChange={(e) => setForm({ ...form, entrada_manha: e.target.value || null })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Saída Manhã</Label>
                    <Input type="time" value={form.saida_manha || ""} onChange={(e) => setForm({ ...form, saida_manha: e.target.value || null })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Entrada Tarde</Label>
                    <Input type="time" value={form.entrada_tarde || ""} onChange={(e) => setForm({ ...form, entrada_tarde: e.target.value || null })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Saída Tarde</Label>
                    <Input type="time" value={form.saida_tarde || ""} onChange={(e) => setForm({ ...form, saida_tarde: e.target.value || null })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Carga Diária (min)</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={form.carga_diaria_minutos}
                      onChange={(e) => setForm({ ...form, carga_diaria_minutos: Number(e.target.value) })} />
                    <Button type="button" variant="outline" onClick={autoCalc}>Calcular</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.floor(form.carga_diaria_minutos / 60)}h{form.carga_diaria_minutos % 60 ? ` ${form.carga_diaria_minutos % 60}min` : ""}</p>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label>Tolerância (minutos)</Label>
              <Input
                type="number"
                min={0}
                max={60}
                value={form.tolerancia_minutos ?? 0}
                onChange={(e) =>
                  setForm({ ...form, tolerancia_minutos: Math.max(0, Number(e.target.value) || 0) })
                }
              />
              <p className="text-xs text-muted-foreground">
                0 = conta minuto a minuto. Ex.: 10 = ignora diferenças de até 10 min para mais ou para menos no saldo do dia e nas horas extras. Vale para banco de horas e horas extras.
              </p>
            </div>


            <div className="space-y-2 pt-2 border-t">
              <Label>Dias de Trabalho</Label>
              <div className="flex gap-1.5">
                {DOW_LABELS.map((label, idx) => {
                  const active = form.dias_semana.includes(idx);
                  return (
                    <Button
                      key={idx}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="w-9 h-9 p-0"
                      onClick={() => {
                        const next = active
                          ? form.dias_semana.filter((d) => d !== idx)
                          : [...form.dias_semana, idx];
                        onChangeDias(next);
                      }}
                      title={DOW_NAMES[idx]}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => onChangeDias([1, 2, 3, 4, 5])}>Seg a Sex</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => onChangeDias([1, 2, 3, 4, 5, 6])}>Seg a Sáb</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => onChangeDias([0, 6])}>Sáb e Dom</Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 text-xs"
                  onClick={() => onChangeDias([0, 1, 2, 3, 4, 5, 6])}>Todos os dias</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Em dias fora dessa escala, o colaborador não terá falta nem horas previstas.
              </p>
            </div>

            {variaPorDia && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>Horários por dia</Label>
                  {form.dias_semana.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={copiarParaTodos}>
                      Copiar 1º dia para todos
                    </Button>
                  )}
                </div>
                {form.dias_semana.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Selecione ao menos um dia acima.</p>
                ) : (
                  <div className="space-y-2">
                    {[...form.dias_semana].sort((a, b) => a - b).map((dow) => {
                      const dia: HorarioDia = hp[String(dow)] ?? {};
                      const carga = dia.carga ?? cargaFromDia(dia);
                      return (
                        <div key={dow} className="rounded-md border p-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{DOW_NAMES[dow]}</span>
                            <span className="text-xs text-muted-foreground">
                              {Math.floor(carga / 60)}h{carga % 60 ? ` ${carga % 60}min` : ""}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Entr. Manhã</Label>
                              <Input type="time" value={dia.em || ""} onChange={(e) => setDia(dow, { em: e.target.value || null })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Saída Manhã</Label>
                              <Input type="time" value={dia.sm || ""} onChange={(e) => setDia(dow, { sm: e.target.value || null })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Entr. Tarde</Label>
                              <Input type="time" value={dia.et || ""} onChange={(e) => setDia(dow, { et: e.target.value || null })} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Saída Tarde</Label>
                              <Input type="time" value={dia.st || ""} onChange={(e) => setDia(dow, { st: e.target.value || null })} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <Label>Trabalha em Feriados</Label>
                <p className="text-xs text-muted-foreground">Se ativo, feriados contam como dia normal de trabalho.</p>
              </div>
              <Switch checked={form.trabalha_feriados} onCheckedChange={(v) => setForm({ ...form, trabalha_feriados: v })} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
