import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, BarChart, Bar, AreaChart, Area,
} from "recharts";
import { Download, FileSpreadsheet, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Clock, UserX } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import {
  useRelatorioAbsenteismo,
  useRelatorioJornada,
  useAlertasNR1,
  type FiltrosRelatorio,
  type AbsenteismoData,
} from "@/hooks/useRelatoriosPonto";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

const CATEGORIA_LABEL: Record<string, string> = {
  falta_implicita: "Falta implícita",
  falta_injustificada: "Falta injustificada",
  atestado_medico: "Atestado médico",
  atraso: "Atraso",
  saida_antecipada: "Saída antecipada",
  folga: "Folga",
  ferias: "Férias",
  outros: "Outros",
};
const CATEGORIA_COR: Record<string, string> = {
  falta_implicita: "#DC2626",
  falta_injustificada: "#EF4444",
  atestado_medico: "#F59E0B",
  atraso: "#F97316",
  saida_antecipada: "#EAB308",
  folga: "#3B82F6",
  ferias: "#8B5CF6",
  outros: "#94A3B8",
};

const minToHHMM = (min: number) => {
  const s = min < 0 ? "-" : "";
  const m = Math.abs(Math.round(min));
  return `${s}${Math.floor(m / 60)}h ${(m % 60).toString().padStart(2, "0")}m`;
};
const BRL = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v ?? 0);

function useDeptEmpresaOptions() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["colab-dept-empresa", companyId],
    queryFn: async () => {
      let q = supabase.from("colaboradores").select("department, empresa_cliente").eq("status", "ATIVO");
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      const depts = Array.from(new Set((data || []).map((c: any) => c.department).filter(Boolean))).sort();
      const empresas = Array.from(new Set((data || []).map((c: any) => c.empresa_cliente).filter(Boolean))).sort();
      return { depts, empresas } as { depts: string[]; empresas: string[] };
    },
  });
}

function KpiCard({
  titulo, valor, delta, icon: Icon, variant = "default", subtitulo,
}: {
  titulo: string; valor: string; delta?: number; icon: any;
  variant?: "default" | "danger" | "warning" | "success"; subtitulo?: string;
}) {
  const cores = {
    default: "border-l-primary bg-white",
    danger: "border-l-red-500 bg-red-50/40",
    warning: "border-l-amber-500 bg-amber-50/40",
    success: "border-l-emerald-500 bg-emerald-50/40",
  };
  return (
    <Card className={`border-l-4 ${cores[variant]}`}>
      <CardContent className="pt-6 pb-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{titulo}</p>
            <p className="text-3xl font-bold text-foreground">{valor}</p>
            {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        {typeof delta === "number" && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {delta > 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
            ) : delta < 0 ? (
              <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
            ) : null}
            <span className={delta > 0 ? "text-red-600" : delta < 0 ? "text-emerald-600" : "text-muted-foreground"}>
              {delta > 0 ? "+" : ""}{delta.toFixed(1)}% vs. período anterior
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function exportarExcel(dados: AbsenteismoData, filtros: FiltrosRelatorio) {
  const wb = XLSX.utils.book_new();
  const kpis = [
    ["Período", `${filtros.data_inicio} a ${filtros.data_fim}`],
    ["Índice de Absenteísmo (%)", dados.kpis.ia_pct],
    ["IA período anterior (%)", dados.kpis.ia_pct_anterior],
    ["Horas Extras", minToHHMM(dados.kpis.horas_extras_min)],
    ["Atrasos totais", minToHHMM(dados.kpis.atrasos_min)],
    ["Custo Absenteísmo (R$)", dados.kpis.custo_absenteismo],
    ["Custo Horas Extras (R$)", dados.kpis.custo_horas_extras],
    ["Colaboradores sem salário informado", dados.kpis.colabs_sem_salario],
    ["Total de colaboradores", dados.kpis.total_colabs],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpis), "KPIs");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(dados.detalhado.map(d => ({
      Nome: d.nome,
      Departamento: d.departamento || "",
      "Empresa Cliente": d.empresa_cliente || "",
      "Horas/mês": d.horas_mensais,
      "Valor Hora (R$)": d.valor_hora,
      "Previsto (h)": +(d.prev_min / 60).toFixed(2),
      "Trabalhado (h)": +(d.trab_min / 60).toFixed(2),
      "Extras (h)": +(d.extras_min / 60).toFixed(2),
      "Faltas Implícitas (h)": +(d.falta_implicita_min / 60).toFixed(2),
      "Perdidas (h)": +(d.perdidas_min / 60).toFixed(2),
      "IA (%)": d.ia_pct,
      "Custo Absent. (R$)": d.custo_absent,
      "Custo Extras (R$)": d.custo_extras,
    }))),
    "Detalhado"
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(dados.ranking_departamentos.map(d => ({
      Departamento: d.departamento,
      Colaboradores: d.colabs,
      "IA (%)": d.ia_pct,
      "Horas Perdidas": +(d.perdidas_min / 60).toFixed(2),
    }))),
    "Ranking Depto"
  );

  XLSX.writeFile(wb, `relatorio-ponto-${filtros.data_inicio}-a-${filtros.data_fim}.xlsx`);
}

function exportarPDF(dados: AbsenteismoData, filtros: FiltrosRelatorio) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Relatório Executivo — Ponto Eletrônico", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Período: ${filtros.data_inicio} a ${filtros.data_fim}`, 40, 70);
  doc.setTextColor(0);

  const kpis: [string, string][] = [
    ["Índice de Absenteísmo", `${dados.kpis.ia_pct.toFixed(2)}%`],
    ["Horas Extras", minToHHMM(dados.kpis.horas_extras_min)],
    ["Atrasos", minToHHMM(dados.kpis.atrasos_min)],
    ["Custo Absenteísmo", BRL(dados.kpis.custo_absenteismo)],
    ["Custo Horas Extras", BRL(dados.kpis.custo_horas_extras)],
    ["Colaboradores no escopo", String(dados.kpis.total_colabs)],
  ];
  let y = 110;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Indicadores-Chave", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  kpis.forEach(([k, v]) => {
    doc.text(`${k}:`, 50, y);
    doc.text(v, 250, y);
    y += 16;
  });

  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Ranking por Departamento", 40, y);
  y += 18;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  dados.ranking_departamentos.slice(0, 15).forEach(d => {
    if (y > 780) { doc.addPage(); y = 50; }
    doc.text(`${d.departamento}`, 50, y);
    doc.text(`${d.colabs} colab.`, 260, y);
    doc.text(`IA ${d.ia_pct.toFixed(2)}%`, 340, y);
    doc.text(`${minToHHMM(d.perdidas_min)} perdidas`, 420, y);
    y += 14;
  });

  doc.save(`relatorio-ponto-${filtros.data_inicio}-a-${filtros.data_fim}.pdf`);
}

export function RelatoriosPonto() {
  const hoje = new Date();
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    data_inicio: format(startOfMonth(hoje), "yyyy-MM-dd"),
    data_fim: format(endOfMonth(hoje), "yyyy-MM-dd"),
    departamento: null,
    empresa_cliente: null,
  });

  const { data: opts } = useDeptEmpresaOptions();
  const { data: absent, isLoading: la } = useRelatorioAbsenteismo(filtros);
  const { data: jornada, isLoading: lj } = useRelatorioJornada(filtros);
  const { data: alertas, isLoading: lal } = useAlertasNR1(filtros);

  const deltaIA = absent ? absent.kpis.ia_pct - absent.kpis.ia_pct_anterior : 0;
  const deltaExtras = absent
    ? absent.kpis.horas_extras_min_anterior > 0
      ? ((absent.kpis.horas_extras_min - absent.kpis.horas_extras_min_anterior) /
          absent.kpis.horas_extras_min_anterior) *
        100
      : 0
    : 0;

  const donutData = useMemo(
    () =>
      (absent?.breakdown_categorias || [])
        .filter(b => b.categoria !== "atestado_medico" && b.categoria !== "ferias" && b.categoria !== "folga")
        .map(b => ({
          name: CATEGORIA_LABEL[b.categoria] || b.categoria,
          value: Math.round(b.minutos / 60),
          key: b.categoria,
        })),
    [absent]
  );

  const jornadaSeries = useMemo(
    () =>
      (jornada?.serie_mensal || []).map(m => ({
        mes: m.mes,
        normais: +(m.normais_min / 60).toFixed(1),
        extras: +(m.extras_min / 60).toFixed(1),
        faltantes: +(m.faltantes_min / 60).toFixed(1),
        saldo: +(m.saldo_min / 60).toFixed(1),
      })),
    [jornada]
  );

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros do Relatório</CardTitle>
          <CardDescription>Ajuste o período e o escopo. Os dados são recalculados automaticamente.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Data início</Label>
              <Input type="date" value={filtros.data_inicio}
                onChange={e => setFiltros(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Data fim</Label>
              <Input type="date" value={filtros.data_fim}
                onChange={e => setFiltros(f => ({ ...f, data_fim: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Departamento</Label>
              <Select value={filtros.departamento ?? "__all__"}
                onValueChange={v => setFiltros(f => ({ ...f, departamento: v === "__all__" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {(opts?.depts || []).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Empresa Cliente</Label>
              <Select value={filtros.empresa_cliente ?? "__all__"}
                onValueChange={v => setFiltros(f => ({ ...f, empresa_cliente: v === "__all__" ? null : v }))}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {(opts?.empresas || []).map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!absent}
                onClick={() => absent && exportarExcel(absent, filtros)}>
                <FileSpreadsheet className="h-4 w-4" /> Excel
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" disabled={!absent}
                onClick={() => absent && exportarPDF(absent, filtros)}>
                <Download className="h-4 w-4" /> PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {la ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : absent ? (
        <>
          {absent.kpis.colabs_sem_salario > 0 && (
            <Alert variant="default" className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Custos incompletos</AlertTitle>
              <AlertDescription>
                {absent.kpis.colabs_sem_salario} colaborador(es) sem salário-base cadastrado.
                Os cálculos de custo desconsideram estes colaboradores.
              </AlertDescription>
            </Alert>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard titulo="Índice de Absenteísmo" valor={`${absent.kpis.ia_pct.toFixed(2)}%`}
              delta={deltaIA} icon={UserX}
              variant={absent.kpis.ia_pct > 5 ? "danger" : absent.kpis.ia_pct > 3 ? "warning" : "success"} />
            <KpiCard titulo="Horas Extras" valor={minToHHMM(absent.kpis.horas_extras_min)}
              delta={deltaExtras} icon={Clock}
              subtitulo={BRL(absent.kpis.custo_horas_extras)} />
            <KpiCard titulo="Atrasos no período" valor={minToHHMM(absent.kpis.atrasos_min)}
              subtitulo={`${absent.kpis.atrasos_colabs} colaborador(es)`} icon={AlertTriangle}
              variant={absent.kpis.atrasos_min > 600 ? "warning" : "default"} />
            <KpiCard titulo="Custo do Absenteísmo" valor={BRL(absent.kpis.custo_absenteismo)}
              subtitulo={`Divisor médio ${absent.kpis.divisor_medio}h/mês`} icon={DollarSign}
              variant={absent.kpis.custo_absenteismo > 0 ? "danger" : "default"} />
          </div>

          <Tabs defaultValue="absenteismo" className="w-full">
            <TabsList>
              <TabsTrigger value="absenteismo">Absenteísmo</TabsTrigger>
              <TabsTrigger value="jornada">Jornada & Banco</TabsTrigger>
              <TabsTrigger value="detalhado">Detalhado</TabsTrigger>
              <TabsTrigger value="nr1">Alertas NR1</TabsTrigger>
            </TabsList>

            {/* Absenteísmo */}
            <TabsContent value="absenteismo" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Tendência do IA (últimos 12 meses)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={absent.serie_mensal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Line type="monotone" dataKey="ia_pct" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} name="IA %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Ausências por Tipo (horas)</CardTitle>
                    <CardDescription>Atestado, férias e folgas não entram no IA — mas atestado é acompanhado nos alertas NR1.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {donutData.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-10 text-center">Sem ausências no período.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} label={(e) => `${e.value}h`}>
                            {donutData.map((d, i) => <Cell key={i} fill={CATEGORIA_COR[d.key] || "#94A3B8"} />)}
                          </Pie>
                          <Tooltip formatter={(v: number) => `${v}h`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ranking por Departamento</CardTitle>
                </CardHeader>
                <CardContent>
                  {absent.ranking_departamentos.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Sem dados.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(220, absent.ranking_departamentos.length * 36)}>
                      <BarChart data={absent.ranking_departamentos} layout="vertical" margin={{ left: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="departamento" width={140} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Bar dataKey="ia_pct" fill="#DC2626" name="IA %" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Jornada */}
            <TabsContent value="jornada" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Distribuição da Jornada (horas por mês)</CardTitle>
                </CardHeader>
                <CardContent>
                  {lj ? <Skeleton className="h-64" /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={jornadaSeries}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="normais" stackId="a" fill="#3B82F6" name="Normais" />
                        <Bar dataKey="extras" stackId="a" fill="#F59E0B" name="Extras" />
                        <Bar dataKey="faltantes" stackId="a" fill="#EF4444" name="Faltantes" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Saldo Mensal (banco de horas)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={jornadaSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit="h" />
                      <Tooltip formatter={(v: number) => `${v}h`} />
                      <Area type="monotone" dataKey="saldo" stroke="#0F766E" fill="#14B8A6" fillOpacity={0.25} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Detalhado */}
            <TabsContent value="detalhado">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Detalhado por Colaborador</CardTitle>
                  <CardDescription>Ordenado por índice de absenteísmo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto max-h-[600px]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>Colaborador</TableHead>
                          <TableHead>Depto.</TableHead>
                          <TableHead>Emp. Cliente</TableHead>
                          <TableHead className="text-right">Previsto</TableHead>
                          <TableHead className="text-right">Trabalhado</TableHead>
                          <TableHead className="text-right">Extras</TableHead>
                          <TableHead className="text-right">Perdidas</TableHead>
                          <TableHead className="text-right">IA</TableHead>
                          <TableHead className="text-right">Custo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {absent.detalhado.map(d => (
                          <TableRow key={d.colaborador_id}>
                            <TableCell className="font-medium">{d.nome}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{d.departamento || "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{d.empresa_cliente || "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{minToHHMM(d.prev_min)}</TableCell>
                            <TableCell className="text-right tabular-nums">{minToHHMM(d.trab_min)}</TableCell>
                            <TableCell className="text-right tabular-nums">{minToHHMM(d.extras_min)}</TableCell>
                            <TableCell className="text-right tabular-nums text-red-600">{minToHHMM(d.perdidas_min)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={d.ia_pct > 5 ? "destructive" : d.ia_pct > 3 ? "default" : "secondary"}>
                                {d.ia_pct.toFixed(1)}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {d.custo_absent != null ? BRL(d.custo_absent) : <span className="text-xs text-muted-foreground">sem salário</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                        {absent.detalhado.length === 0 && (
                          <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-6">Sem dados no período.</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* NR1 */}
            <TabsContent value="nr1" className="space-y-4">
              {lal ? <Skeleton className="h-40" /> : (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Faltas Recorrentes (&gt; 3 dias/mês sem abono)
                      </CardTitle>
                      <CardDescription>Indicador de risco psicossocial (NR-1). Requer aproximação do gestor.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {alertas?.faltas_recorrentes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum colaborador em situação crítica.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Colaborador</TableHead>
                              <TableHead>Departamento</TableHead>
                              <TableHead>Mês</TableHead>
                              <TableHead className="text-right">Faltas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alertas?.faltas_recorrentes.map((a, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{a.nome}</TableCell>
                                <TableCell className="text-xs">{a.departamento || "—"}</TableCell>
                                <TableCell className="text-xs">{a.mes}</TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="destructive">{a.qtd_faltas}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Atestados Frequentes (&gt; 5 no período)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {alertas?.atestados_frequentes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum caso identificado.</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Colaborador</TableHead>
                              <TableHead>Departamento</TableHead>
                              <TableHead className="text-right">Atestados</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {alertas?.atestados_frequentes.map((a, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{a.nome}</TableCell>
                                <TableCell className="text-xs">{a.departamento || "—"}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-amber-500">{a.qtd_atestados}</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Selecione um período para gerar o relatório.</p>
      )}
    </div>
  );
}
