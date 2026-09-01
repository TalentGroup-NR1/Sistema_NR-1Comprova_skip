import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Save, CalendarIcon } from "lucide-react";
import { CompensacaoCard } from "./CompensacaoCard";
import { WorkSchedulesManager } from "./WorkSchedulesManager";
import { FeriadosManager } from "./FeriadosManager";
import { TiposAbonoManager } from "./TiposAbonoManager";
import { FaixasHoraExtraEditor } from "./FaixasHoraExtraEditor";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { PerfisBancoHorasManager } from "./PerfisBancoHorasManager";
import { format, addMonths, subDays, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { getCicloVigente } from "@/lib/bancoHorasCiclo";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { z } from "zod";
import { toast } from "sonner";
import {
  defaultFaixas,
  normalizeFaixas,
  validateFaixas,
  faixasEqual,
  type FaixasHoraExtra,
} from "@/lib/faixasHoraExtra";

const jornadaSchema = z.object({
  jornada_diaria_minutos: z.number().int().min(60, "Mínimo 1h (60 min)").max(1440, "Máximo 24h (1440 min)"),
  tolerancia_minutos: z.number().int().min(0).max(60, "Máximo 60 min"),
  intervalo_minutos: z.number().int().min(0).max(240, "Máximo 240 min"),
});

const HORA_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const noturnoSchema = z.object({
  inicio_noturno: z.string().regex(HORA_REGEX, "Horário inválido (HH:MM)"),
  fim_noturno: z.string().regex(HORA_REGEX, "Horário inválido (HH:MM)"),
  adicional_noturno_pct: z.number().min(0, "Mínimo 0%").max(100, "Máximo 100%"),
});

const bonusSchema = z.object({
  bonus_fora_escala_ativo: z.boolean(),
  bonus_sabado_pct: z.number().min(0).max(500, "Máximo 500%"),
  bonus_domingo_pct: z.number().min(0).max(500, "Máximo 500%"),
  bonus_feriado_pct: z.number().min(0).max(500, "Máximo 500%"),
});


const buildDefaultForm = () => {
  const periodo = "quadrimestral";
  const ciclo = getCicloVigente({ periodo_fechamento_banco: periodo, banco_horas_inicio: null }, new Date());

  return {
    jornada_diaria_minutos: 480,
    tolerancia_minutos: 10,
    intervalo_minutos: 60,
    inicio_noturno: "22:00",
    fim_noturno: "05:00",
    adicional_noturno_pct: 20,
    adicional_hora_extra_pct: 50,
    adicional_hora_extra_domingo_pct: 100,
    geolocation_required: false,
    periodo_fechamento_banco: periodo,
    banco_horas_inicio: ciclo.inicio as string | null,
    banco_horas_fim: ciclo.fim as string | null,
  };
};


export function PontoConfiguracao() {
  const companyId = useEffectiveCompanyId();
  const { config, isLoading, upsertConfig } = usePontoConfig();

  const [form, setForm] = useState(buildDefaultForm);
  const [jornadaInitial, setJornadaInitial] = useState({
    jornada_diaria_minutos: 480,
    tolerancia_minutos: 10,
    intervalo_minutos: 60,
  });
  const [noturnoInitial, setNoturnoInitial] = useState({
    inicio_noturno: "22:00",
    fim_noturno: "05:00",
    adicional_noturno_pct: 20,
  });
  const [faixasHE, setFaixasHE] = useState<FaixasHoraExtra>(() => defaultFaixas());
  const [faixasInitial, setFaixasInitial] = useState<FaixasHoraExtra>(() => defaultFaixas());
  const defaultBonus = {
    bonus_fora_escala_ativo: false,
    bonus_sabado_pct: 0,
    bonus_domingo_pct: 0,
    bonus_feriado_pct: 0,
  };
  const [bonus, setBonus] = useState(defaultBonus);
  const [bonusInitial, setBonusInitial] = useState(defaultBonus);

  useEffect(() => {
    if (!companyId || isLoading) return;

    if (config) {
      const periodo = (config as any).periodo_fechamento_banco || "quadrimestral";
      const inicio: string | null = (config as any).banco_horas_inicio || null;
      const fim: string | null = (config as any).banco_horas_fim || null;

      setForm({
        jornada_diaria_minutos: config.jornada_diaria_minutos,
        tolerancia_minutos: config.tolerancia_minutos,
        intervalo_minutos: config.intervalo_minutos,
        inicio_noturno: config.inicio_noturno?.substring(0, 5) || "22:00",
        fim_noturno: config.fim_noturno?.substring(0, 5) || "05:00",
        adicional_noturno_pct: Number(config.adicional_noturno_pct),
        adicional_hora_extra_pct: Number(config.adicional_hora_extra_pct),
        adicional_hora_extra_domingo_pct: Number(config.adicional_hora_extra_domingo_pct),
        geolocation_required: config.geolocation_required,
        periodo_fechamento_banco: periodo,
        banco_horas_inicio: inicio,
        banco_horas_fim: fim,
      });
      setJornadaInitial({
        jornada_diaria_minutos: config.jornada_diaria_minutos,
        tolerancia_minutos: config.tolerancia_minutos,
        intervalo_minutos: config.intervalo_minutos,
      });
      setNoturnoInitial({
        inicio_noturno: config.inicio_noturno?.substring(0, 5) || "22:00",
        fim_noturno: config.fim_noturno?.substring(0, 5) || "05:00",
        adicional_noturno_pct: Number(config.adicional_noturno_pct),
      });
      const fallback = defaultFaixas(
        Number(config.adicional_hora_extra_pct) || 50,
        Number(config.adicional_hora_extra_domingo_pct) || 100,
      );
      const loaded = normalizeFaixas((config as any).faixas_hora_extra, fallback);
      setFaixasHE(loaded);
      setFaixasInitial(loaded);
      const loadedBonus = {
        bonus_fora_escala_ativo: !!(config as any).bonus_fora_escala_ativo,
        bonus_sabado_pct: Number((config as any).bonus_sabado_pct ?? 0),
        bonus_domingo_pct: Number((config as any).bonus_domingo_pct ?? 0),
        bonus_feriado_pct: Number((config as any).bonus_feriado_pct ?? 0),
      };
      setBonus(loadedBonus);
      setBonusInitial(loadedBonus);
      return;
    }

    setForm(buildDefaultForm());
  }, [companyId, config, isLoading]);


  const jornadaDirty =
    form.jornada_diaria_minutos !== jornadaInitial.jornada_diaria_minutos ||
    form.tolerancia_minutos !== jornadaInitial.tolerancia_minutos ||
    form.intervalo_minutos !== jornadaInitial.intervalo_minutos;

  const noturnoDirty =
    form.inicio_noturno !== noturnoInitial.inicio_noturno ||
    form.fim_noturno !== noturnoInitial.fim_noturno ||
    form.adicional_noturno_pct !== noturnoInitial.adicional_noturno_pct;

  const handleSaveJornada = () => {
    const parsed = jornadaSchema.safeParse({
      jornada_diaria_minutos: Number(form.jornada_diaria_minutos),
      tolerancia_minutos: Number(form.tolerancia_minutos),
      intervalo_minutos: Number(form.intervalo_minutos),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Valores inválidos");
      return;
    }
    upsertConfig.mutate(parsed.data as any, {
      onSuccess: () => {
        setJornadaInitial(parsed.data as typeof jornadaInitial);
        console.info("[ponto-config] jornada updated", { action: "update_jornada" });
      },
    });
  };

  const handleSaveNoturno = () => {
    const parsed = noturnoSchema.safeParse({
      inicio_noturno: form.inicio_noturno,
      fim_noturno: form.fim_noturno,
      adicional_noturno_pct: Number(form.adicional_noturno_pct),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Valores inválidos");
      return;
    }
    upsertConfig.mutate({
      inicio_noturno: parsed.data.inicio_noturno + ":00",
      fim_noturno: parsed.data.fim_noturno + ":00",
      adicional_noturno_pct: parsed.data.adicional_noturno_pct,
    } as any, {
      onSuccess: () => {
        setNoturnoInitial(parsed.data as typeof noturnoInitial);
        console.info("[ponto-config] noturno updated", { action: "update_noturno" });
      },
    });
  };

  const faixasDirty = !faixasEqual(faixasHE, faixasInitial);

  const handleSaveFaixas = () => {
    const v = validateFaixas(faixasHE);
    if (v.ok === false) {
      toast.error(v.error);
      return;
    }
    // Sincroniza colunas planas com a 1ª faixa de cada grupo (retrocompat)
    const diaUtilPct = faixasHE.dia_util[0]?.percentual ?? 50;
    const domPct = faixasHE.domingo_feriado[0]?.percentual ?? 100;
    upsertConfig.mutate({
      faixas_hora_extra: faixasHE,
      adicional_hora_extra_pct: diaUtilPct,
      adicional_hora_extra_domingo_pct: domPct,
    } as any, {
      onSuccess: () => {
        setFaixasInitial(faixasHE);
        console.info("[ponto-config] faixas_hora_extra updated", { action: "update_faixas_he" });
      },
    });
  };

  const bonusDirty =
    bonus.bonus_fora_escala_ativo !== bonusInitial.bonus_fora_escala_ativo ||
    bonus.bonus_sabado_pct !== bonusInitial.bonus_sabado_pct ||
    bonus.bonus_domingo_pct !== bonusInitial.bonus_domingo_pct ||
    bonus.bonus_feriado_pct !== bonusInitial.bonus_feriado_pct;

  const handleSaveBonus = () => {
    const parsed = bonusSchema.safeParse(bonus);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Valores inválidos");
      return;
    }
    upsertConfig.mutate(parsed.data as any, {
      onSuccess: () => {
        setBonusInitial(parsed.data as typeof bonusInitial);
        console.info("[ponto-config] bonus_fora_escala updated", { action: "update_bonus_fora_escala" });
      },
    });
  };




  const handleSave = () => {
    upsertConfig.mutate({
      jornada_diaria_minutos: form.jornada_diaria_minutos,
      tolerancia_minutos: form.tolerancia_minutos,
      intervalo_minutos: form.intervalo_minutos,
      inicio_noturno: form.inicio_noturno + ":00",
      fim_noturno: form.fim_noturno + ":00",
      adicional_noturno_pct: form.adicional_noturno_pct,
      adicional_hora_extra_pct: form.adicional_hora_extra_pct,
      adicional_hora_extra_domingo_pct: form.adicional_hora_extra_domingo_pct,
      geolocation_required: form.geolocation_required,
      periodo_fechamento_banco: form.periodo_fechamento_banco,
      banco_horas_inicio: form.banco_horas_inicio,
      banco_horas_fim: form.banco_horas_fim,
    } as any);
  };

  const periodMonths: Record<string, number> = {
    mensal: 1, bimestral: 2, trimestral: 3, quadrimestral: 4, semestral: 6,
  };

  const handleInicioChange = (date: Date | undefined) => {
    if (!date) return;
    const inicio = format(date, "yyyy-MM-dd");
    const months = periodMonths[form.periodo_fechamento_banco] || 4;
    const fim = format(subDays(addMonths(date, months), 1), "yyyy-MM-dd");
    setForm({ ...form, banco_horas_inicio: inicio, banco_horas_fim: fim });
  };

  const handlePeriodoChange = (v: string) => {
    const updated = { ...form, periodo_fechamento_banco: v };
    const baseStr = form.banco_horas_inicio || format(startOfMonth(new Date()), "yyyy-MM-dd");
    const months = periodMonths[v] || 4;
    const baseDate = parseISO(baseStr);
    updated.banco_horas_inicio = baseStr;
    updated.banco_horas_fim = format(subDays(addMonths(baseDate, months), 1), "yyyy-MM-dd");
    setForm(updated);
  };


  const isCicloAtivo = form.banco_horas_inicio && form.banco_horas_fim &&
    isWithinInterval(new Date(), { start: parseISO(form.banco_horas_inicio), end: parseISO(form.banco_horas_fim) });

  const jornadaHoras = Math.floor(form.jornada_diaria_minutos / 60);
  const jornadaMin = form.jornada_diaria_minutos % 60;

  if (isLoading) return <p className="text-muted-foreground p-4">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jornada de Trabalho</CardTitle>
          <CardDescription>Configuração padrão da jornada CLT para esta empresa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Jornada Diária (minutos)</Label>
              <Input
                type="number"
                value={form.jornada_diaria_minutos}
                onChange={(e) => setForm({ ...form, jornada_diaria_minutos: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">{jornadaHoras}h{jornadaMin > 0 ? ` ${jornadaMin}min` : ""}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Tolerância padrão (fallback)</Label>
              <Input
                type="number"
                value={form.tolerancia_minutos}
                onChange={(e) => setForm({ ...form, tolerancia_minutos: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Usada apenas para colaboradores sem horário vinculado. Para regra individual, configure a tolerância no cadastro do Horário de Trabalho — vale para banco de horas e horas extras.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Intervalo (minutos)</Label>
              <Input
                type="number"
                value={form.intervalo_minutos}
                onChange={(e) => setForm({ ...form, intervalo_minutos: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Mínimo 60 min para jornada &gt; 6h</p>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={handleSaveJornada}
              disabled={!jornadaDirty || upsertConfig.isPending || !companyId}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {upsertConfig.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicional Noturno</CardTitle>
          <CardDescription>Configuração do período noturno e adicional (CLT Art. 73)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Início Noturno</Label>
              <Input
                type="time"
                value={form.inicio_noturno}
                onChange={(e) => setForm({ ...form, inicio_noturno: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fim Noturno</Label>
              <Input
                type="time"
                value={form.fim_noturno}
                onChange={(e) => setForm({ ...form, fim_noturno: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Adicional Noturno (%)</Label>
              <Input
                type="number"
                value={form.adicional_noturno_pct}
                onChange={(e) => setForm({ ...form, adicional_noturno_pct: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={handleSaveNoturno}
              disabled={!noturnoDirty || upsertConfig.isPending || !companyId}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {upsertConfig.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horas Extras</CardTitle>
          <CardDescription>
            Configure faixas escalonadas por tipo de dia. Ex.: até 2h → 75%, acima de 2h → 100%.
            A última faixa é sempre "sem teto".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FaixasHoraExtraEditor
            value={faixasHE}
            onChange={setFaixasHE}
            onSave={handleSaveFaixas}
            dirty={faixasDirty}
            saving={upsertConfig.isPending}
            disabled={!companyId}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bônus banco de horas em dias fora da escala</CardTitle>
          <CardDescription>
            Quando o colaborador trabalha em um sábado, domingo ou feriado que <strong>não faz parte da escala dele</strong>,
            o saldo do banco e as horas extras do dia recebem um acréscimo percentual por hora trabalhada.
            Ex.: 40% = +24 min por hora (2h viram 2h48 no banco).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar bônus em dias fora da escala</Label>
              <p className="text-xs text-muted-foreground">Desativado: o saldo segue só com as horas efetivas.</p>
            </div>
            <Switch
              checked={bonus.bonus_fora_escala_ativo}
              onCheckedChange={(v) => setBonus({ ...bonus, bonus_fora_escala_ativo: v })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Sábado fora da escala (%)</Label>
              <Input
                type="number"
                min={0}
                max={500}
                step="0.01"
                disabled={!bonus.bonus_fora_escala_ativo}
                value={bonus.bonus_sabado_pct}
                onChange={(e) => setBonus({ ...bonus, bonus_sabado_pct: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Domingo fora da escala (%)</Label>
              <Input
                type="number"
                min={0}
                max={500}
                step="0.01"
                disabled={!bonus.bonus_fora_escala_ativo}
                value={bonus.bonus_domingo_pct}
                onChange={(e) => setBonus({ ...bonus, bonus_domingo_pct: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Feriado fora da escala (%)</Label>
              <Input
                type="number"
                min={0}
                max={500}
                step="0.01"
                disabled={!bonus.bonus_fora_escala_ativo}
                value={bonus.bonus_feriado_pct}
                onChange={(e) => setBonus({ ...bonus, bonus_feriado_pct: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={handleSaveBonus}
              disabled={!bonusDirty || upsertConfig.isPending || !companyId}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {upsertConfig.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Opções Gerais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Geolocalização Obrigatória</Label>
              <p className="text-xs text-muted-foreground">Exigir captura de localização ao bater ponto</p>
            </div>
            <Switch
              checked={form.geolocation_required}
              onCheckedChange={(v) => setForm({ ...form, geolocation_required: v })}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Período de Fechamento do Banco de Horas</Label>
                <p className="text-xs text-muted-foreground">Define o ciclo de fechamento para colaboradores com banco de horas</p>
              </div>
              <Select value={form.periodo_fechamento_banco} onValueChange={handlePeriodoChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="bimestral">Bimestral</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="quadrimestral">Quadrimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label>Início do Ciclo Atual</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.banco_horas_inicio && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.banco_horas_inicio ? format(parseISO(form.banco_horas_inicio), "dd/MM/yyyy") : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.banco_horas_inicio ? parseISO(form.banco_horas_inicio) : undefined}
                      onSelect={handleInicioChange}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label>Fim do Ciclo Atual</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.banco_horas_fim && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.banco_horas_fim ? format(parseISO(form.banco_horas_fim), "dd/MM/yyyy") : "Calculado automaticamente"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.banco_horas_fim ? parseISO(form.banco_horas_fim) : undefined}
                      onSelect={(date) => date && setForm({ ...form, banco_horas_fim: format(date, "yyyy-MM-dd") })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            {form.banco_horas_inicio && form.banco_horas_fim && (
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="secondary" className={isCicloAtivo ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {isCicloAtivo ? "Ciclo Vigente" : "Ciclo Futuro/Encerrado"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(form.banco_horas_inicio), "dd/MM/yyyy")} — {format(parseISO(form.banco_horas_fim), "dd/MM/yyyy")}
                </span>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={upsertConfig.isPending || !companyId} className="gap-2">
                <Save className="h-4 w-4" />
                {upsertConfig.isPending ? "Salvando..." : "Salvar banco de horas"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <PerfisBancoHorasManager />

      <WorkSchedulesManager />


      <FeriadosManager />

      <TiposAbonoManager />

      <CompensacaoCard />

    </div>
  );
}
