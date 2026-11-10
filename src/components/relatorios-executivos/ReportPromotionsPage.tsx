import { ArrowRight, Award } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";

const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";
const TALENT_BORDER = "#E5E7EB";

interface Props {
  data: ExecutiveReportData;
  year: number;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd MMM yyyy", { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function ReportPromotionsPage({ data, year }: Props) {
  const promocoes = data.promocoes_detalhadas || [];

  return (
    <div className="min-h-[842px] bg-white p-8 print-break-after" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b-2" style={{ borderColor: TALENT_GOLD }}>
        <div className="w-1 h-8 rounded-full" style={{ background: TALENT_GOLD }} />
        <h2 className="text-2xl font-bold" style={{ color: TALENT_NAVY }}>
          Reconhecimento e Evolução de Carreira
        </h2>
        <span className="ml-auto text-sm font-medium" style={{ color: TALENT_GRAY }}>{year === 0 ? "Todos os anos" : year}</span>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="flex items-center gap-4 rounded-xl p-5" style={{ background: '#FDF8F0', border: `1px solid ${TALENT_GOLD}40` }}>
          <div className="flex items-center justify-center w-14 h-14 rounded-full" style={{ background: `${TALENT_GOLD}20` }}>
            <Award className="w-7 h-7" style={{ color: TALENT_GOLD }} />
          </div>
          <div>
            <p className="text-3xl font-bold" style={{ color: TALENT_NAVY }}>{promocoes.length}</p>
            <p className="text-sm font-medium" style={{ color: TALENT_GRAY }}>Promoções no Ano</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl p-5" style={{ background: '#F0F4FF', border: `1px solid #2563EB30` }}>
          <div className="flex items-center justify-center w-14 h-14 rounded-full" style={{ background: '#2563EB15' }}>
            <Award className="w-7 h-7" style={{ color: '#2563EB' }} />
          </div>
          <div>
            <p className="text-3xl font-bold" style={{ color: TALENT_NAVY }}>
              {data.headcount.ativos > 0 ? ((promocoes.length / data.headcount.ativos) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="text-sm font-medium" style={{ color: TALENT_GRAY }}>do Headcount Promovido</p>
          </div>
        </div>
      </div>

      {promocoes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-lg italic" style={{ color: TALENT_GRAY }}>
            Nenhuma promoção registrada para este período.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {promocoes.map((promo, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 rounded-lg p-4 avoid-break"
              style={{ border: `1px solid ${TALENT_BORDER}`, background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}
            >
              {/* Avatar initials */}
              <div
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full text-sm font-bold text-white"
                style={{ background: TALENT_RED }}
              >
                {getInitials(promo.nome_colaborador)}
              </div>

              {/* Name + Date */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: TALENT_NAVY }}>
                  {promo.nome_colaborador}
                </p>
                <p className="text-xs" style={{ color: TALENT_GRAY }}>
                  {formatDate(promo.data_promocao)}
                </p>
              </div>

              {/* From */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs" style={{ color: TALENT_GRAY }}>De:</p>
                <p className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>
                  {promo.cargo_anterior}
                  {promo.nivel_anterior && <span className="font-normal text-xs" style={{ color: TALENT_GRAY }}> ({promo.nivel_anterior})</span>}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="flex-shrink-0 w-5 h-5" style={{ color: TALENT_GOLD }} />

              {/* To */}
              <div className="flex-shrink-0">
                <p className="text-xs" style={{ color: TALENT_GRAY }}>Para:</p>
                <p className="text-xs font-bold" style={{ color: TALENT_RED }}>
                  {promo.cargo_novo}
                  {promo.nivel_novo && <span className="font-normal text-xs" style={{ color: TALENT_GRAY }}> ({promo.nivel_novo})</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
