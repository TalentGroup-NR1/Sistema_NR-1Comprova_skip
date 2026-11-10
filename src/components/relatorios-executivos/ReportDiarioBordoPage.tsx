import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";

const TALENT_NAVY = "#0A1B3D";
const TALENT_RED = "#C4161C";
const TALENT_GOLD = "#D4A843";

const milestoneLabel: Record<string, string> = {
  "30_DIAS": "30 dias",
  "80_DIAS": "80 dias",
  "120_DIAS": "120 dias",
};

interface Props {
  data: ExecutiveReportData;
  year: number;
}

export function ReportDiarioBordoPage({ data, year }: Props) {
  const resultados = data.diario_bordo_resultados ?? [];

  if (resultados.length === 0) return null;

  const ROWS_PER_PAGE = 18;
  const pages: typeof resultados[] = [];
  for (let i = 0; i < resultados.length; i += ROWS_PER_PAGE) {
    pages.push(resultados.slice(i, i + ROWS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageRows, pageIdx) => (
        <div
          key={pageIdx}
          className="report-page bg-white"
          style={{
            width: "210mm",
            minHeight: "297mm",
            padding: "15mm 18mm",
            pageBreakAfter: "always",
            position: "relative",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold" style={{ color: TALENT_NAVY }}>
                Diário de Bordo — Resultados
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Médias de satisfação por colaborador e ciclo
                {year === 0 ? " — Histórico Consolidado" : ` — ${year}`}
              </p>
            </div>
            <div
              className="text-xs font-semibold px-3 py-1 rounded-full"
              style={{ backgroundColor: TALENT_GOLD + "22", color: TALENT_GOLD }}
            >
              Pág. {pageIdx + 1}/{pages.length}
            </div>
          </div>

          {/* Barra decorativa */}
          <div className="flex gap-1 mb-6">
            <div className="h-1 flex-1 rounded-full" style={{ backgroundColor: TALENT_NAVY }} />
            <div className="h-1 w-16 rounded-full" style={{ backgroundColor: TALENT_RED }} />
            <div className="h-1 w-10 rounded-full" style={{ backgroundColor: TALENT_GOLD }} />
          </div>

          {/* Tabela */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr style={{ backgroundColor: TALENT_NAVY }}>
                <th className="text-left text-white py-2 px-3 font-semibold rounded-tl-lg">
                  Colaborador
                </th>
                <th className="text-center text-white py-2 px-3 font-semibold">Ciclo</th>
                <th className="text-center text-white py-2 px-3 font-semibold">
                  Média Colaborador
                </th>
                <th className="text-center text-white py-2 px-3 font-semibold rounded-tr-lg">
                  Média Gestor
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-gray-100"
                  style={{ backgroundColor: i % 2 === 0 ? "#F8F9FC" : "white" }}
                >
                  <td className="py-2 px-3 font-medium" style={{ color: TALENT_NAVY }}>
                    {r.nome_colaborador}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600">
                    {milestoneLabel[r.milestone_type] ?? r.milestone_type}
                  </td>
                  <td className="py-2 px-3 text-center font-semibold" style={{ color: TALENT_NAVY }}>
                    {r.media_colaborador != null ? r.media_colaborador.toFixed(2) : "—"}
                  </td>
                  <td className="py-2 px-3 text-center font-semibold" style={{ color: TALENT_RED }}>
                    {r.media_gestor != null ? r.media_gestor.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
