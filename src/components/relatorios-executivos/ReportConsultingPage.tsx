import { sanitizeRichText } from "@/lib/sanitize";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";

interface Props {
  parecerHtml: string;
  companyName: string;
  year: number;
}

export function ReportConsultingPage({ parecerHtml, companyName, year }: Props) {
  const sanitizedHtml = sanitizeRichText(parecerHtml);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="min-h-[842px] bg-white p-8 flex flex-col" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-8 pb-3 border-b-2" style={{ borderColor: TALENT_NAVY }}>
        <div className="w-1 h-8 rounded-full" style={{ background: TALENT_NAVY }} />
        <h2 className="text-2xl font-bold" style={{ color: TALENT_NAVY }}>
          Conclusões e Recomendações Estratégicas
        </h2>
      </div>

      {/* Content */}
      <div className="flex-1">
        {sanitizedHtml ? (
          <div
            className="prose prose-sm max-w-none leading-relaxed"
            style={{ color: TALENT_NAVY, lineHeight: '1.8' }}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <div className="text-center py-16" style={{ color: TALENT_GRAY }}>
            <p className="text-lg italic">Nenhum parecer foi informado.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 border-t" style={{ borderColor: TALENT_GOLD }}>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs font-semibold" style={{ color: TALENT_NAVY }}>
              NR-1Comprova — GESTÃO ATIVA
            </p>
            <p className="text-xs" style={{ color: TALENT_GRAY }}>
              Consultoria em Recursos Humanos
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: TALENT_GRAY }}>
              Relatório emitido em {today}
            </p>
            <p className="text-xs" style={{ color: TALENT_GRAY }}>
              {companyName} — {year === 0 ? "Todos os anos" : year}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
