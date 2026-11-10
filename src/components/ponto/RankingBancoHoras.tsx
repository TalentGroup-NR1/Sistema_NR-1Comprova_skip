import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Wallet, Search, Trophy, Lock, Unlock } from "lucide-react";
import { useFechamentoStatusByColaborador } from "@/hooks/useFechamentos";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { usePontoConfig } from "@/hooks/usePontoConfig";
import { usePontoCompensacoes } from "@/hooks/usePontoCompensacoes";
import { useFeriados } from "@/hooks/useFeriados";
import { calcularResumoDiario, formatMinutes } from "@/hooks/usePontoResumo";
import { aplicarResumoDB, type ResumoDBLookup, type DBResumoRow } from "@/hooks/usePontoResumoDB";
import { PontoRegistro } from "@/hooks/usePontoRegistros";
import { getCicloVigente, getPeriodoLabel } from "@/lib/bancoHorasCiclo";
import { format, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

type FiltroTab = "todos" | "credito" | "debito";

interface RankingRow {
  id: string;
  nome: string;
  matricula?: string | null;
  department?: string | null;
  job_title?: string | null;
  avatar_url?: string | null;
  saldoMesAtual: number;
  saldoMesAnterior: number;
  saldoCiclo: number;
}

export function RankingBancoHoras() {
  const companyId = useEffectiveCompanyId();
  const { config } = usePontoConfig();
  const { compensacoes } = usePontoCompensacoes();
  const today = useMemo(() => new Date(), []);
  const ciclo = useMemo(() => getCicloVigente(config, today), [config, today]);

  const [tab, setTab] = useState<FiltroTab>("todos");
  const [busca, setBusca] = useState("");
  const [departamento, setDepartamento] = useState<string>("__all__");

  const todayStr = format(today, "yyyy-MM-dd");
  const mesAtualInicio = format(startOfMonth(today), "yyyy-MM-dd");
  const mesAnteriorInicio = format(startOfMonth(subMonths(today, 1)), "yyyy-MM-dd");
  const mesAnteriorFim = format(endOfMonth(subMonths(today, 1)), "yyyy-MM-dd");

  // O range de busca cobre o ciclo todo OU o mês anterior se este for fora do ciclo
  const rangeInicio = ciclo.inicio < mesAnteriorInicio ? ciclo.inicio : mesAnteriorInicio;
  const rangeFim = ciclo.fim < todayStr ? ciclo.fim : todayStr;

  const { feriadosMap } = useFeriados(parseISO(rangeInicio).getFullYear());

  // 1. Colaboradores ativos com banco de horas
  const { data: colaboradores = [], isLoading: loadingColabs } = useQuery({
    queryKey: ["ranking-banco-colabs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, full_name, matricula, department, job_title, avatar_url, jornada_diaria_minutos, work_schedule_id, is_banco_horas, admission_date")
        .eq("company_id", companyId)
        .eq("status", "ATIVO")
        .eq("is_banco_horas", true)
        .in("contract_type", ["CLT", "Estágio", "Aprendiz", "Temporário"])
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const colabIds = colaboradores.map((c) => c.id);
  const { data: fechamentoStatusMap = {} } = useFechamentoStatusByColaborador(colabIds, ciclo.inicio, ciclo.fim);

  // 2. Registros de ponto de todos os colaboradores no período
  const { data: registros = [], isLoading: loadingRegs } = useQuery({
    queryKey: ["ranking-banco-registros", companyId, rangeInicio, rangeFim, colabIds.length],
    queryFn: async () => {
      if (!colabIds.length) return [] as PontoRegistro[];
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*")
        .in("colaborador_id", colabIds)
        .gte("data_hora", `${rangeInicio}T00:00:00`)
        .lte("data_hora", `${rangeFim}T23:59:59`)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return (data || []) as PontoRegistro[];
    },
    enabled: !!companyId && colabIds.length > 0,
  });

  // 3. Work schedules (para escala de cada colaborador)
  const wsIds = Array.from(new Set(colaboradores.map((c) => c.work_schedule_id).filter(Boolean) as string[]));
  const { data: workSchedules = [] } = useQuery({
    queryKey: ["ranking-banco-ws", wsIds],
    queryFn: async () => {
      if (!wsIds.length) return [];
      const { data, error } = await supabase
        .from("work_schedules")
        .select("id, dias_semana, trabalha_feriados")
        .in("id", wsIds);
      if (error) throw error;
      return data || [];
    },
    enabled: wsIds.length > 0,
  });
  const wsMap = useMemo(() => {
    const m = new Map<string, { dias_semana: number[] | null; trabalha_feriados: boolean | null }>();
    for (const w of workSchedules) m.set(w.id, { dias_semana: w.dias_semana as any, trabalha_feriados: w.trabalha_feriados });
    return m;
  }, [workSchedules]);

  // 4. Férias ativas no período (todos colaboradores em uma query)
  const { data: feriasMap = new Map<string, Set<string>>() } = useQuery({
    queryKey: ["ranking-banco-ferias", colabIds, rangeInicio, rangeFim],
    queryFn: async () => {
      const map = new Map<string, Set<string>>();
      if (!colabIds.length) return map;
      const { data, error } = await supabase
        .from("ferias_gozo")
        .select("colaborador_id, data_inicio_gozo, data_fim_gozo, status")
        .in("colaborador_id", colabIds)
        .in("status", ["planejado", "aprovado", "gozado"])
        .lte("data_inicio_gozo", rangeFim)
        .gte("data_fim_gozo", rangeInicio);
      if (error) throw error;
      for (const f of data || []) {
        const set = map.get(f.colaborador_id) || new Set<string>();
        const days = eachDayOfInterval({ start: parseISO(f.data_inicio_gozo), end: parseISO(f.data_fim_gozo) });
        for (const d of days) set.add(format(d, "yyyy-MM-dd"));
        map.set(f.colaborador_id, set);
      }
      return map;
    },
    enabled: colabIds.length > 0,
  });

  // 4b. Resumos diários canônicos do banco (preserva ABONADO + valores recalculados)
  const { data: resumoDBMap = new Map<string, ResumoDBLookup>() } = useQuery({
    queryKey: ["ranking-banco-resumo-db", colabIds, rangeInicio, rangeFim],
    queryFn: async () => {
      const map = new Map<string, ResumoDBLookup>();
      if (!colabIds.length) return map;
      const [resumoRes, abonoRes] = await Promise.all([
        supabase
          .from("ponto_resumo_diario")
          .select("colaborador_id, data, horas_previstas_minutos, horas_trabalhadas_minutos, horas_noturnas_minutos, horas_extras_minutos, horas_intervalo_minutos, saldo_minutos, status")
          .in("colaborador_id", colabIds)
          .gte("data", rangeInicio)
          .lte("data", rangeFim),
        supabase
          .from("ponto_abonos")
          .select("colaborador_id, data_inicio, data_fim, status, ponto_tipos_abono(nome)")
          .in("colaborador_id", colabIds)
          .eq("status", "aprovado")
          .lte("data_inicio", rangeFim)
          .gte("data_fim", rangeInicio),
      ]);
      if (resumoRes.error) throw resumoRes.error;
      if (abonoRes.error) throw abonoRes.error;
      for (const r of (resumoRes.data || []) as any[]) {
        const cid = r.colaborador_id as string;
        const lookup = map.get(cid) || { rows: new Map(), abonos: new Map() };
        lookup.rows.set(r.data as string, r as DBResumoRow);
        map.set(cid, lookup);
      }
      for (const a of (abonoRes.data || []) as any[]) {
        const cid = a.colaborador_id as string;
        const lookup = map.get(cid) || { rows: new Map(), abonos: new Map() };
        const nome = a.ponto_tipos_abono?.nome ?? "Abonado";
        const start = parseISO(a.data_inicio);
        const end = parseISO(a.data_fim);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          lookup.abonos.set(format(d, "yyyy-MM-dd"), nome);
        }
        map.set(cid, lookup);
      }
      return map;
    },
    enabled: colabIds.length > 0,
  });

  // 4c. Fechamentos com status fechado/assinado no range (para zerar dias já fechados)
  const { data: fechamentosMap = new Map<string, Array<{ ini: string; fim: string }>>() } = useQuery({
    queryKey: ["ranking-banco-fechamentos-range", companyId, colabIds, rangeInicio, rangeFim],
    queryFn: async () => {
      const map = new Map<string, Array<{ ini: string; fim: string }>>();
      if (!companyId || !colabIds.length) return map;
      const { data, error } = await supabase
        .from("banco_horas_fechamentos")
        .select("colaborador_id, periodo_inicio, periodo_fim, status")
        .eq("company_id", companyId)
        .in("colaborador_id", colabIds)
        .in("status", ["fechado", "assinado"])
        .lte("periodo_inicio", rangeFim)
        .gte("periodo_fim", rangeInicio);
      if (error) throw error;
      for (const f of data || []) {
        const arr = map.get((f as any).colaborador_id) || [];
        arr.push({ ini: (f as any).periodo_inicio, fim: (f as any).periodo_fim });
        map.set((f as any).colaborador_id, arr);
      }
      return map;
    },
    enabled: !!companyId && colabIds.length > 0,
  });

  const ranking: RankingRow[] = useMemo(() => {
    if (!colaboradores.length) return [];
    const feriadosLookup = new Map<string, { nome: string }>();
    feriadosMap.forEach((v, k) => feriadosLookup.set(k, { nome: v.nome }));

    // Agrupa registros por colaborador
    const regsPorColab = new Map<string, PontoRegistro[]>();
    for (const r of registros) {
      const arr = regsPorColab.get(r.colaborador_id) || [];
      arr.push(r);
      regsPorColab.set(r.colaborador_id, arr);
    }

    return colaboradores.map((c) => {
      const colabRegs = regsPorColab.get(c.id) || [];
      const ws = c.work_schedule_id ? wsMap.get(c.work_schedule_id) : null;
      const feriasDates = feriasMap.get(c.id) || new Set<string>();
      const dbLookup = resumoDBMap.get(c.id);
      const fechamentos = fechamentosMap.get(c.id) || [];
      const isDiaFechado = (dayStr: string) =>
        fechamentos.some((f) => dayStr >= f.ini && dayStr <= f.fim);

      let saldoMesAtual = 0;
      let saldoMesAnterior = 0;
      let saldoCiclo = 0;

      // Iterar por dias entre rangeInicio e rangeFim
      const days = eachDayOfInterval({
        start: parseISO(rangeInicio),
        end: parseISO(rangeFim),
      });

      for (const day of days) {
        const dayStr = format(day, "yyyy-MM-dd");
        const client = calcularResumoDiario(
          colabRegs,
          config || null,
          dayStr,
          c.jornada_diaria_minutos,
          compensacoes,
          feriadosLookup,
          feriasDates,
          ws ?? null,
          (c as any).admission_date ?? null,
        );
        const resumo = aplicarResumoDB(client, dbLookup);
        // Não somar o dia em curso (hoje) — ainda em andamento, pode estar
        // INCONSISTENTE por falta de saída e gerar -jornada enganoso.
        if (dayStr === todayStr) continue;
        // Dias dentro de um período já fechado/assinado têm saldo zerado
        // pela tratativa de fechamento — não recompor débito/crédito histórico.
        const s = isDiaFechado(dayStr) ? 0 : resumo.saldoMin;
        if (dayStr >= ciclo.inicio && dayStr <= ciclo.fim) saldoCiclo += s;
        if (dayStr >= mesAtualInicio && dayStr <= todayStr) saldoMesAtual += s;
        if (dayStr >= mesAnteriorInicio && dayStr <= mesAnteriorFim) saldoMesAnterior += s;
      }


      return {
        id: c.id,
        nome: c.full_name,
        matricula: c.matricula,
        department: c.department,
        job_title: c.job_title,
        avatar_url: c.avatar_url,
        saldoMesAtual,
        saldoMesAnterior,
        saldoCiclo,
      };
    });
  }, [colaboradores, registros, wsMap, feriasMap, feriadosMap, config, compensacoes, ciclo, rangeInicio, rangeFim, mesAtualInicio, mesAnteriorInicio, mesAnteriorFim, todayStr, resumoDBMap, fechamentosMap]);

  // Filtros
  const departamentos = useMemo(() => {
    const set = new Set<string>();
    for (const r of ranking) if (r.department) set.add(r.department);
    return Array.from(set).sort();
  }, [ranking]);

  const filtrado = useMemo(() => {
    let arr = ranking;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      arr = arr.filter((r) => r.nome.toLowerCase().includes(q) || (r.matricula || "").toLowerCase().includes(q));
    }
    if (departamento !== "__all__") {
      arr = arr.filter((r) => r.department === departamento);
    }
    if (tab === "credito") arr = arr.filter((r) => r.saldoCiclo > 0);
    if (tab === "debito") arr = arr.filter((r) => r.saldoCiclo < 0);
    return [...arr].sort((a, b) => b.saldoCiclo - a.saldoCiclo);
  }, [ranking, busca, departamento, tab]);

  // KPIs gerais
  const totalColabs = ranking.length;
  const totalCredito = ranking.filter((r) => r.saldoCiclo > 0).length;
  const totalDebito = ranking.filter((r) => r.saldoCiclo < 0).length;
  const totalSaldoEmpresa = ranking.reduce((acc, r) => acc + r.saldoCiclo, 0);

  const isLoading = loadingColabs || loadingRegs;

  const initials = (name: string) => name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header ciclo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Ranking — Banco de Horas ({getPeriodoLabel(config?.periodo_fechamento_banco)})
              </p>
              <p className="text-lg font-semibold">
                Ciclo vigente: {format(parseISO(ciclo.inicio), "dd 'de' MMMM", { locale: ptBR })} → {format(parseISO(ciclo.fim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mostra apenas colaboradores ativos com regime de Banco de Horas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Colaboradores</p>
                <p className="text-2xl font-bold">{totalColabs}</p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Em Crédito</p>
                <p className="text-2xl font-bold text-emerald-600">{totalCredito}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Em Débito</p>
                <p className="text-2xl font-bold text-red-600">{totalDebito}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Saldo Líquido Empresa</p>
                <p className={`text-2xl font-bold ${totalSaldoEmpresa >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatMinutes(totalSaldoEmpresa)}
                </p>
              </div>
              <Wallet className={`h-8 w-8 ${totalSaldoEmpresa >= 0 ? "text-emerald-500" : "text-red-500"}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros + tabs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ranking de Saldo</CardTitle>
          <CardDescription>Ordenado pelo saldo do ciclo vigente (maior → menor)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Tabs value={tab} onValueChange={(v) => setTab(v as FiltroTab)}>
              <TabsList>
                <TabsTrigger value="todos">Todos ({ranking.length})</TabsTrigger>
                <TabsTrigger value="credito" className="data-[state=active]:text-emerald-700">
                  Crédito ({totalCredito})
                </TabsTrigger>
                <TabsTrigger value="debito" className="data-[state=active]:text-red-700">
                  Débito ({totalDebito})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou matrícula..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
            {departamentos.length > 0 && (
              <select
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="__all__">Todos os departamentos</option>
                {departamentos.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Calculando saldos...</p>
          ) : filtrado.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum colaborador encontrado</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-center">Mês Anterior</TableHead>
                    <TableHead className="text-center">Mês Atual</TableHead>
                    <TableHead className="text-center">Saldo do Ciclo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtrado.map((r, idx) => {
                    const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-center font-semibold text-muted-foreground">
                          {medal || idx + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {r.avatar_url && <AvatarImage src={r.avatar_url} alt={r.nome} />}
                              <AvatarFallback className="text-xs">{initials(r.nome)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{r.nome}</p>
                              {r.job_title && <p className="text-xs text-muted-foreground truncate">{r.job_title}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.department || "—"}</TableCell>
                        <TableCell className={`text-center font-mono text-sm ${r.saldoMesAnterior >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatMinutes(r.saldoMesAnterior)}
                        </TableCell>
                        <TableCell className={`text-center font-mono text-sm ${r.saldoMesAtual >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {formatMinutes(r.saldoMesAtual)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Badge
                              variant="secondary"
                              className={r.saldoCiclo >= 0 ? "bg-emerald-100 text-emerald-700 font-mono" : "bg-red-100 text-red-700 font-mono"}
                            >
                              {formatMinutes(r.saldoCiclo)}
                            </Badge>
                            {fechamentoStatusMap[r.id] === "fechado" && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1" title="Período fechado">
                                <Lock className="h-3 w-3" />Fechado
                              </Badge>
                            )}
                            {fechamentoStatusMap[r.id] === "reaberto" && (
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 gap-1" title="Período reaberto">
                                <Unlock className="h-3 w-3" />Reaberto
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
