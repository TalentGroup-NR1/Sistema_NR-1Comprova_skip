import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

function stripHtml(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

const TALENT_NAVY = "#0A1B3D";
const TALENT_RED = "#E41936";

interface Props {
  data: ExecutiveReportData;
  year: number;
}

export function ReportFeedbacksPage({ data, year }: Props) {
  const feedbacks = data.feedbacks_detalhados || [];

  if (feedbacks.length === 0) return null;

  // Group by collaborator
  const grouped = feedbacks.reduce<Record<string, Array<{ data_feedback: string; assunto: string; detalhes_conversa: string }>>>((acc, f) => {
    if (!acc[f.nome_colaborador]) acc[f.nome_colaborador] = [];
    acc[f.nome_colaborador].push({ data_feedback: f.data_feedback, assunto: f.assunto, detalhes_conversa: f.detalhes_conversa });
    return acc;
  }, {});

  const colaboradores = Object.keys(grouped).sort();

  const formatDate = (d: string) => {
    try {
      return format(parseISO(d), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return d;
    }
  };

  return (
    <div
      className="report-page"
      style={{
        pageBreakBefore: "always",
        padding: "48px 56px",
        fontFamily: "'Manrope', sans-serif",
        minHeight: "297mm",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${TALENT_RED}`, paddingBottom: 12, marginBottom: 32 }}>
        <h2 style={{ color: TALENT_NAVY, fontSize: 22, fontWeight: 800, margin: 0 }}>
          Feedbacks Registrados
        </h2>
        <p style={{ color: "#64748b", fontSize: 12, margin: "4px 0 0" }}>
          {year === 0 ? "Histórico consolidado" : `Ano ${year}`}
        </p>
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {colaboradores.map((nome) => (
          <div
            key={nome}
            style={{
              breakInside: "avoid",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                background: TALENT_NAVY,
                color: "white",
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {nome}
              <span style={{ fontWeight: 400, opacity: 0.7, marginLeft: 8, fontSize: 11 }}>
                ({grouped[nome].length} feedback{grouped[nome].length > 1 ? "s" : ""})
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {grouped[nome].map((fb, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 16px",
                    borderTop: i > 0 ? "1px solid #e2e8f0" : "none",
                    background: i % 2 === 0 ? "white" : "#fafbfc",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "white",
                        background: TALENT_RED,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {formatDate(fb.data_feedback)}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TALENT_NAVY }}>
                      {fb.assunto}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#334155",
                      margin: 0,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {stripHtml(fb.detalhes_conversa)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
