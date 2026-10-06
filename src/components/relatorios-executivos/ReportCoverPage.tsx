const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";

interface ReportCoverPageProps {
  companyName: string;
  year: number;
  logoUrl?: string | null;
}

export function ReportCoverPage({ companyName, year, logoUrl }: ReportCoverPageProps) {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[842px] bg-white print-break-after">
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-2" style={{ background: `linear-gradient(90deg, ${TALENT_NAVY}, ${TALENT_RED})` }} />

      <div className="flex-1 flex flex-col items-center justify-center px-12 py-16 text-center">
        {logoUrl && (
          <img
            src={logoUrl}
            alt={companyName}
            className="h-24 w-auto object-contain mb-12"
          />
        )}

        <div className="space-y-6">
          <h1 className="text-4xl font-bold tracking-tight" style={{ color: TALENT_NAVY }}>
            {companyName}
          </h1>
          <div className="w-24 h-1 mx-auto rounded-full" style={{ background: `linear-gradient(90deg, ${TALENT_RED}, ${TALENT_GOLD})` }} />
          <h2 className="text-xl font-medium" style={{ color: TALENT_GRAY }}>
            Relatório Executivo de Gestão de Pessoas
          </h2>
          <p className="text-5xl font-bold" style={{ color: TALENT_RED }}>
            {year === 0 ? "Histórico Completo" : year}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center space-y-2">
        <div className="w-16 h-0.5 mx-auto" style={{ background: TALENT_GOLD }} />
        <p className="text-sm font-semibold" style={{ color: TALENT_NAVY }}>
          NR-1Comprova — GESTÃO ATIVA
        </p>
        <p className="text-xs" style={{ color: TALENT_GRAY }}>
          Consultoria em Recursos Humanos
        </p>
      </div>
    </div>
  );
}
