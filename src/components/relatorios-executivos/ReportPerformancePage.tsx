import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";

const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";
const TALENT_BORDER = "#E5E7EB";

const MILESTONE_LABELS: Record<string, string> = {
  "30_DIAS": "30 Dias",
  "80_DIAS": "80 Dias",
  "120_DIAS": "120 Dias",
  "AVALIACAO_EXPERIENCIA": "Avaliação Experiência",
};

interface Props {
  data: ExecutiveReportData;
  year: number;
}

export function ReportPerformancePage({ data, year }: Props) {
  const { feedback, avaliacoes, pdis, treinamentos, promocoes } = data;

  const milestoneData = (feedback.por_milestone || []).map((m) => ({
    name: MILESTONE_LABELS[m.milestone_type] || m.milestone_type,
    total: m.total,
  }));

  const kpis = [
    { label: "Ciclos de Avaliação", value: avaliacoes.ciclos_total, color: TALENT_NAVY },
    { label: "Avaliações Concluídas", value: avaliacoes.autoavaliacoes_concluidas + avaliacoes.avaliacoes_gestor_concluidas, color: "#059669" },
    { label: "PDIs Criados", value: pdis.total, color: TALENT_GOLD },
    { label: "Treinamentos Concluídos", value: treinamentos.concluidos, color: TALENT_RED },
  ];

  return (
    <div className="min-h-[842px] bg-white p-8 print-break-after" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b-2" style={{ borderColor: TALENT_GOLD }}>
        <div className="w-1 h-8 rounded-full" style={{ background: TALENT_GOLD }} />
        <h2 className="text-2xl font-bold" style={{ color: TALENT_NAVY }}>
          Desenvolvimento e Desempenho
        </h2>
        <span className="ml-auto text-sm font-medium" style={{ color: TALENT_GRAY }}>{year === 0 ? "Todos os anos" : year}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => (
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
          </div>
        ))}
      </div>

      {/* Feedback Milestones Chart */}
      {milestoneData.length > 0 && (
        <div className="rounded-xl p-5 mb-8 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: TALENT_NAVY }}>
            Diário de Bordo — Feedbacks por Marco
          </h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={milestoneData} margin={{ bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} interval={0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="total" name="Feedbacks" fill={TALENT_NAVY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl p-5 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: TALENT_NAVY }}>
            Planos de Desenvolvimento (PDI)
          </h3>
          <div className="space-y-3">
            {[
              { label: "Em Andamento", value: pdis.em_andamento, color: TALENT_NAVY },
              { label: "Concluídos", value: pdis.concluidos, color: "#059669" },
              { label: "Rascunho", value: pdis.rascunho, color: TALENT_GRAY },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}` }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: TALENT_NAVY }}>
            Outros Indicadores
          </h3>
          <div className="space-y-3">
            {[
              { label: "Certificados Emitidos", value: treinamentos.certificados, color: TALENT_RED },
              { label: "Promoções no Ano", value: promocoes.total, color: TALENT_GOLD },
              { label: "Diário de Bordo (total)", value: feedback.total, color: TALENT_NAVY },
              { label: "Diário de Bordo (concluídos)", value: feedback.concluidos, color: "#059669" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="text-lg font-bold" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
