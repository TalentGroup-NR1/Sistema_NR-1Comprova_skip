import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from "recharts";
import type { ExecutiveReportData } from "@/hooks/useExecutiveReport";

const TALENT_NAVY = "#0A1628";
const TALENT_RED = "#8B0000";
const TALENT_GOLD = "#C5A572";
const TALENT_GRAY = "#6B7280";
const TALENT_BORDER = "#E5E7EB";
const TALENT_BG = "#F8F9FA";

const BAR_COLORS = [TALENT_RED, "#2563EB", TALENT_GOLD, "#059669", TALENT_GRAY, "#7C3AED", "#DB2777"];

interface Props {
  data: ExecutiveReportData;
  year: number;
}

function GenderIcon({ gender, count, color }: { gender: string; count: number; color: string }) {
  const isMale = gender.toLowerCase().includes("masculino");
  const isFemale = gender.toLowerCase().includes("feminino");

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {isMale ? (
          <>
            <circle cx="24" cy="12" r="7" fill={color} />
            <rect x="18" y="20" width="12" height="16" rx="3" fill={color} />
            <rect x="14" y="22" width="6" height="3" rx="1.5" fill={color} />
            <rect x="28" y="22" width="6" height="3" rx="1.5" fill={color} />
            <rect x="18" y="36" width="5" height="10" rx="2" fill={color} />
            <rect x="25" y="36" width="5" height="10" rx="2" fill={color} />
          </>
        ) : isFemale ? (
          <>
            <circle cx="24" cy="10" r="7" fill={color} />
            <path d="M18 20 C18 20 15 36 15 36 L21 36 L21 46 L27 46 L27 36 L33 36 C33 36 30 20 30 20 Z" fill={color} />
          </>
        ) : (
          <>
            <circle cx="24" cy="12" r="7" fill={color} />
            <rect x="18" y="20" width="12" height="14" rx="3" fill={color} />
            <rect x="18" y="34" width="5" height="10" rx="2" fill={color} />
            <rect x="25" y="34" width="5" height="10" rx="2" fill={color} />
          </>
        )}
      </svg>
      <span className="text-2xl font-bold" style={{ color }}>{count}</span>
      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: TALENT_GRAY }}>{gender}</span>
    </div>
  );
}

export function ReportPeopleAnalyticsPage({ data, year }: Props) {
  const { demografia_sexo, demografia_raca, faixas_etarias, geografia, tempo_casa, escolaridade } = data;

  const genderColors: Record<string, string> = {
    masculino: "#2563EB",
    feminino: TALENT_RED,
  };

  return (
    <div className="min-h-[842px] bg-white p-8 print-break-after" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6 pb-3 border-b-2" style={{ borderColor: TALENT_GOLD }}>
        <div className="w-1 h-8 rounded-full" style={{ background: TALENT_GOLD }} />
        <h2 className="text-2xl font-bold" style={{ color: TALENT_NAVY }}>
          People Analytics — Perfil Demográfico
        </h2>
        <span className="ml-auto text-sm font-medium" style={{ color: TALENT_GRAY }}>{year === 0 ? "Todos os anos" : year}</span>
      </div>

      {/* Row 1: Tempo de Casa + Escolaridade */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Tempo de Casa - Horizontal bars */}
        <div className="rounded-xl p-4 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}`, background: TALENT_BG }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TALENT_NAVY }}>
            Tempo de Casa
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={tempo_casa} layout="vertical" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
              <YAxis dataKey="faixa" type="category" width={70} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="total" fill="#2563EB" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 10, fontWeight: 700, fill: TALENT_NAVY }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Escolaridade - Horizontal bars */}
        <div className="rounded-xl p-4 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}`, background: TALENT_BG }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TALENT_NAVY }}>
            Escolaridade
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(150, (escolaridade ?? []).length * 28)}>
            <BarChart data={escolaridade ?? []} layout="vertical" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
              <YAxis dataKey="formacao" type="category" width={120} tick={{ fontSize: 8 }} />
              <Tooltip />
              <Bar dataKey="total" fill={TALENT_GOLD} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 10, fontWeight: 700, fill: TALENT_NAVY }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Geografia + Faixas Etárias */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Geografia - Horizontal bars */}
        <div className="rounded-xl p-4 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}`, background: TALENT_BG }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TALENT_NAVY }}>
            Distribuição por Estado (Top 5)
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={geografia.slice(0, 5)} layout="vertical" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
              <YAxis dataKey="estado" type="category" width={60} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="total" fill={TALENT_RED} radius={[0, 4, 4, 0]}>
                <LabelList dataKey="total" position="right" style={{ fontSize: 10, fontWeight: 700, fill: TALENT_NAVY }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Faixas Etárias - Vertical bars */}
        <div className="rounded-xl p-4 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}`, background: TALENT_BG }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TALENT_NAVY }}>
            Faixas Etárias
          </h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={faixas_etarias}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="faixa" tick={{ fontSize: 9 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="total" fill={TALENT_GOLD} radius={[4, 4, 0, 0]}>
                <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: TALENT_NAVY }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Gênero (icons) + Raça/Etnia (bars) */}
      <div className="grid grid-cols-2 gap-5">
        {/* Gênero - Icons */}
        <div className="rounded-xl p-4 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}`, background: TALENT_BG }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: TALENT_NAVY }}>
            Diversidade — Gênero
          </h3>
          <div className="flex items-end justify-center gap-8 py-2">
            {demografia_sexo.map((item, idx) => (
              <GenderIcon
                key={item.sexo}
                gender={item.sexo}
                count={item.total}
                color={genderColors[item.sexo.toLowerCase()] || BAR_COLORS[idx % BAR_COLORS.length]}
              />
            ))}
          </div>
        </div>

        {/* Raça/Etnia - Horizontal bars */}
        <div className="rounded-xl p-4 avoid-break" style={{ border: `1px solid ${TALENT_BORDER}`, background: TALENT_BG }}>
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: TALENT_NAVY }}>
            Diversidade — Raça/Etnia
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(130, demografia_raca.length * 28)}>
            <BarChart data={demografia_raca} layout="vertical" margin={{ right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
              <YAxis dataKey="raca" type="category" width={100} tick={{ fontSize: 8 }} />
              <Tooltip />
              <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                {demografia_raca.map((_, idx) => (
                  <Cell key={idx} fill={BAR_COLORS[idx % BAR_COLORS.length]} />
                ))}
                <LabelList dataKey="total" position="right" style={{ fontSize: 10, fontWeight: 700, fill: TALENT_NAVY }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
