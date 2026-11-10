import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";
import { calcTurnoverRate } from "@/lib/calcTurnover";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";
const TALENT_BORDER = "#E5E7EB";

interface Props {
  data: ExecutiveReportData;
  year: number;
}

function buildMonthlyData(admissoes: ExecutiveReportData["admissoes_mes"], desligamentos: ExecutiveReportData["desligamentos_mes"]) {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = i + 1;
    return {
      mes: MONTH_NAMES[i],
      admissoes: admissoes.filter(a => a.mes === mes).reduce((s, a) => s + a.total, 0),
      desligamentos: desligamentos.filter(d => d.mes === mes).reduce((s, d) => s + d.total, 0),
    };
  });
}

function renderMonthlyChart(monthlyData: ReturnType<typeof buildMonthlyData>, title: string) {
  return (
    <div className="rounded-xl p-5 mb-6 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}` }}>
      <h3 className="text-sm font-semibold mb-4" style={{ color: TALENT_NAVY }}>
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="admissoes" name="Admissões" fill="#059669" radius={[3, 3, 0, 0]}>
            <LabelList dataKey="admissoes" position="top" style={{ fontSize: 9, fontWeight: 600, fill: '#059669' }} formatter={(v: number) => v > 0 ? v : ''} />
          </Bar>
          <Bar dataKey="desligamentos" name="Desligamentos" fill={TALENT_RED} radius={[3, 3, 0, 0]}>
            <LabelList dataKey="desligamentos" position="top" style={{ fontSize: 9, fontWeight: 600, fill: TALENT_RED }} formatter={(v: number) => v > 0 ? v : ''} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ReportSummaryPage({ data, year }: Props) {
  const { headcount, admissoes_mes, desligamentos_mes, gestor_interno } = data;

  const totalAdmissoes = admissoes_mes.reduce((s, m) => s + m.total, 0);
  const totalDesligamentos = desligamentos_mes.reduce((s, m) => s + m.total, 0);

  const isAllYears = year === 0;

  // Fórmula única: ((Admissões + Desligamentos) / 2) / Total Funcionários × 100
  const turnoverRate = calcTurnoverRate({
    admissoes: totalAdmissoes,
    desligamentos: totalDesligamentos,
    totalFuncionarios: headcount.ativos,
  });

  const years = isAllYears
    ? [...new Set([
        ...admissoes_mes.map(a => a.ano).filter(Boolean),
        ...desligamentos_mes.map(d => d.ano).filter(Boolean),
      ])].sort() as number[]
    : [year];

  return (
    <div className="min-h-[842px] bg-white p-8 print-break-after" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b-2" style={{ borderColor: TALENT_RED }}>
        <div className="w-1 h-8 rounded-full" style={{ background: TALENT_RED }} />
        <h2 className="text-2xl font-bold" style={{ color: TALENT_NAVY }}>
          Resumo Executivo — Pessoas
        </h2>
        <span className="ml-auto text-sm font-medium" style={{ color: TALENT_GRAY }}>{year === 0 ? "Todos os anos" : year}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Colaboradores Ativos", value: headcount.ativos, color: TALENT_NAVY },
          { label: "Admissões no Período", value: totalAdmissoes, color: "#059669" },
          { label: "Desligamentos", value: totalDesligamentos, color: TALENT_RED },
          { label: "Turnover Rate", value: `${turnoverRate}%`, color: TALENT_GOLD },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl p-5 text-center avoid-break"
            style={{ border: `1px solid ${TALENT_BORDER}`, background: '#F8F9FA' }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: TALENT_GRAY }}>
              {kpi.label}
            </p>
            <p className="text-3xl font-bold" style={{ color: kpi.color }}>
              {kpi.value}
            </p>
            <p className="text-[10px] mt-1 italic" style={{ color: '#D1D5DB' }}>
              — sem comparativo
            </p>
          </div>
        ))}
      </div>

      {/* Monthly Charts - separated by year */}
      {years.map((y) => {
        const yearAdmissoes = isAllYears ? admissoes_mes.filter(a => a.ano === y) : admissoes_mes;
        const yearDesligamentos = isAllYears ? desligamentos_mes.filter(d => d.ano === y) : desligamentos_mes;
        const monthlyData = buildMonthlyData(yearAdmissoes, yearDesligamentos);
        const title = isAllYears
          ? `Admissões vs Desligamentos por Mês — ${y}`
          : "Admissões vs Desligamentos por Mês";
        return renderMonthlyChart(monthlyData, title);
      })}

      {/* Gestor Interno - Horizontal Bars */}
      <div className="rounded-xl overflow-hidden avoid-break" style={{ border: `1px solid ${TALENT_BORDER}` }}>
        <h3 className="text-sm font-semibold px-5 py-3" style={{ color: TALENT_NAVY, background: '#F8F9FA' }}>
          Distribuição por Gestor Interno
        </h3>
        {gestor_interno && gestor_interno.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(140, gestor_interno.length * 36)}>
            <BarChart data={gestor_interno} layout="vertical" margin={{ left: 30, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis dataKey="gestor" type="category" width={180} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="total" name="Colaboradores" fill={TALENT_NAVY} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 10, fontWeight: 700, fill: TALENT_NAVY }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="px-5 py-4 text-sm italic" style={{ color: TALENT_GRAY }}>Nenhum dado de gestor interno disponível.</p>
        )}
      </div>
    </div>
  );
}
