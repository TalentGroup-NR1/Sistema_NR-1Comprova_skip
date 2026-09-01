import { differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from "date-fns";
import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";

const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";
const TALENT_BORDER = "#E5E7EB";

function parseLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function calcularPermanencia(admissao: string, desligamento: string): string {
  const inicio = parseLocalDate(admissao);
  const fim = parseLocalDate(desligamento);
  const anos = differenceInYears(fim, inicio);
  const meses = differenceInMonths(fim, addYears(inicio, anos));
  const dias = differenceInDays(fim, addMonths(addYears(inicio, anos), meses));
  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos}a`);
  if (meses > 0) partes.push(`${meses}m`);
  if (dias > 0 || partes.length === 0) partes.push(`${dias}d`);
  return partes.join(" ");
}

function formatDate(dateStr: string) {
  const d = parseLocalDate(dateStr);
  return d.toLocaleDateString("pt-BR");
}

interface Props {
  data: ExecutiveReportData;
  year: number;
}

export function ReportDesligamentosPage({ data, year }: Props) {
  const desligamentos = data.desligamentos_detalhados ?? [];

  if (desligamentos.length === 0) return null;

  return (
    <>
      {/* Table page */}
      <div className="min-h-[842px] bg-white p-8 print-break-after" style={{ fontFamily: "'Manrope', sans-serif" }}>
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2" style={{ borderColor: TALENT_RED }}>
          <div className="w-1 h-8 rounded-full" style={{ background: TALENT_RED }} />
          <h2 className="text-2xl font-bold" style={{ color: TALENT_NAVY }}>
            Desligamentos Detalhados
          </h2>
          <span className="ml-auto text-sm font-medium" style={{ color: TALENT_GRAY }}>{year === 0 ? "Todos os anos" : year}</span>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl p-4 text-center" style={{ border: `1px solid ${TALENT_BORDER}`, background: "#F8F9FA" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: TALENT_GRAY }}>Total Desligamentos</p>
            <p className="text-3xl font-bold" style={{ color: TALENT_RED }}>{desligamentos.length}</p>
          </div>
          {(() => {
            const tipos = desligamentos.reduce((acc, d) => {
              acc[d.tipo_desligamento] = (acc[d.tipo_desligamento] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
            const sorted = Object.entries(tipos).sort((a, b) => b[1] - a[1]);
            return sorted.slice(0, 2).map(([tipo, count]) => (
              <div key={tipo} className="rounded-xl p-4 text-center" style={{ border: `1px solid ${TALENT_BORDER}`, background: "#F8F9FA" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: TALENT_GRAY }}>{tipo}</p>
                <p className="text-3xl font-bold" style={{ color: TALENT_NAVY }}>{count}</p>
              </div>
            ));
          })()}
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${TALENT_BORDER}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F8F9FA" }}>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: TALENT_GRAY }}>Nome</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: TALENT_GRAY }}>Admissão</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: TALENT_GRAY }}>Desligamento</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: TALENT_GRAY }}>Permanência</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs uppercase tracking-wider" style={{ color: TALENT_GRAY }}>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {desligamentos.map((d, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${TALENT_BORDER}` }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: TALENT_NAVY }}>{d.nome_colaborador}</td>
                  <td className="px-4 py-2.5" style={{ color: TALENT_GRAY }}>{formatDate(d.data_admissao)}</td>
                  <td className="px-4 py-2.5" style={{ color: TALENT_GRAY }}>{formatDate(d.data_desligamento)}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "#FEF3C7", color: "#92400E" }}>
                      {calcularPermanencia(d.data_admissao, d.data_desligamento)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5" style={{ color: TALENT_GRAY }}>{d.tipo_desligamento}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Motivos page */}
      <div className="min-h-[842px] bg-white p-8 print-break-after" style={{ fontFamily: "'Manrope', sans-serif" }}>
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2" style={{ borderColor: TALENT_GOLD }}>
          <div className="w-1 h-8 rounded-full" style={{ background: TALENT_GOLD }} />
          <h2 className="text-2xl font-bold" style={{ color: TALENT_NAVY }}>
            Motivos dos Desligamentos
          </h2>
          <span className="ml-auto text-sm font-medium" style={{ color: TALENT_GRAY }}>{year === 0 ? "Todos os anos" : year}</span>
        </div>

        <div className="space-y-3">
          {desligamentos.map((d, i) => (
            <div
              key={i}
              className="rounded-xl p-4 avoid-break"
              style={{ border: `1px solid ${TALENT_BORDER}`, background: "#FAFAFA" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm" style={{ color: TALENT_NAVY }}>{d.nome_colaborador}</span>
                {(d.cargo || d.nivel) && (
                  <span className="text-xs" style={{ color: TALENT_NAVY }}>
                    — {d.cargo}{d.nivel ? ` (${d.nivel})` : ''}
                  </span>
                )}
                <span className="text-xs" style={{ color: TALENT_GRAY }}>— {formatDate(d.data_desligamento)}</span>
              </div>
              <p className="text-sm" style={{ color: TALENT_GRAY }}>
                {d.motivo_desligamento || "Motivo não informado"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
