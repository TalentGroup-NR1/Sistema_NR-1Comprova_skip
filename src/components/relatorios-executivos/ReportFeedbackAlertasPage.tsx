import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, MessageSquare } from "lucide-react";

const TALENT_NAVY = "#0A1B3D";
const TALENT_RED = "#E41936";
const TALENT_GOLD = "#D4A843";

interface Props {
  data: ExecutiveReportData;
  year: number;
}

export function ReportFeedbackAlertasPage({ data, year }: Props) {
  const alertas = data.feedbacks_alertas || [];

  if (alertas.length === 0) return null;

  const totalFeedbacks = alertas.reduce((s, g) => s + g.total_feedbacks, 0);
  const totalAlertas = alertas.reduce((s, g) => s + g.total_alertas, 0);
  const pctAlertas = totalFeedbacks > 0 ? ((totalAlertas / totalFeedbacks) * 100).toFixed(1) : "0";

  return (
    <div className="report-page bg-white p-6" style={{ fontFamily: "'Manrope', sans-serif", maxWidth: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6" style={{ borderBottom: `3px solid ${TALENT_RED}`, paddingBottom: 12 }}>
        <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: TALENT_RED }} />
        <h2 className="text-lg font-bold tracking-tight" style={{ color: TALENT_NAVY }}>
          Feedbacks & Alertas por Gestão Técnica
        </h2>
        <span className="ml-auto text-xs font-medium flex-shrink-0" style={{ color: "#64748b" }}>
          {year === 0 ? "Todos os anos" : year}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total de Feedbacks", value: totalFeedbacks, color: TALENT_NAVY, icon: MessageSquare },
          { label: "Total de Alertas", value: totalAlertas, color: TALENT_RED, icon: AlertTriangle },
          { label: "% Alertas", value: `${pctAlertas}%`, color: TALENT_GOLD, icon: AlertTriangle },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg p-3 text-center"
            style={{ border: `1px solid ${kpi.color}22`, background: `${kpi.color}08` }}
          >
            <kpi.icon className="h-4 w-4 mx-auto mb-1" style={{ color: kpi.color }} />
            <div className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[9px] font-medium uppercase tracking-wider" style={{ color: "#64748b" }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Tables by Gestão Técnica */}
      {alertas.map((grupo) => (
        <div key={grupo.gestao_tecnica} className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold" style={{ color: TALENT_NAVY }}>
              {grupo.gestao_tecnica}
            </h3>
            <div className="flex gap-3 text-[10px] font-medium" style={{ color: "#64748b" }}>
              <span>Feedbacks: <strong style={{ color: TALENT_NAVY }}>{grupo.total_feedbacks}</strong></span>
              <span>Alertas: <strong style={{ color: TALENT_RED }}>{grupo.total_alertas}</strong></span>
            </div>
          </div>

          <div className="overflow-hidden">
            <table className="w-full text-xs" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "30%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "17%" }} />
              </colgroup>
              <thead>
                <tr style={{ background: `${TALENT_NAVY}0A` }}>
                  <th className="text-left py-1.5 px-2 font-semibold" style={{ color: TALENT_NAVY, borderBottom: `1px solid ${TALENT_NAVY}20` }}>Colaborador</th>
                  <th className="text-left py-1.5 px-2 font-semibold" style={{ color: TALENT_NAVY, borderBottom: `1px solid ${TALENT_NAVY}20` }}>Cargo</th>
                  <th className="text-left py-1.5 px-2 font-semibold" style={{ color: TALENT_NAVY, borderBottom: `1px solid ${TALENT_NAVY}20` }}>Data</th>
                  <th className="text-center py-1.5 px-2 font-semibold" style={{ color: TALENT_NAVY, borderBottom: `1px solid ${TALENT_NAVY}20` }}>Alerta</th>
                </tr>
              </thead>
              <tbody>
                {grupo.colaboradores.map((col, idx) => {
                  let dataFormatted = col.data_feedback;
                  try {
                    dataFormatted = format(parseISO(col.data_feedback), "dd/MM/yyyy", { locale: ptBR });
                  } catch { /* keep raw */ }

                  return (
                    <tr key={idx} style={{ borderBottom: `1px solid ${TALENT_NAVY}10` }}>
                      <td className="py-1.5 px-2 font-medium truncate" style={{ color: TALENT_NAVY }}>{col.nome}</td>
                      <td className="py-1.5 px-2 truncate" style={{ color: "#475569" }}>{col.cargo}</td>
                      <td className="py-1.5 px-2" style={{ color: "#475569" }}>{dataFormatted}</td>
                      <td className="py-1.5 px-2 text-center">
                        {col.alerta ? (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                            style={{ background: `${TALENT_RED}15`, color: TALENT_RED }}
                          >
                            <AlertTriangle className="h-3 w-3" /> Alerta
                          </span>
                        ) : (
                          <span className="text-[10px]" style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
