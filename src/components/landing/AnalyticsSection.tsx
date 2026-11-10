import { useState } from "react";
import { Check, Download, FileCheck2, Layers, LineChart, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/Reveal";
import { Eyebrow } from "@/components/landing/premium";

type Persona = "CHRO" | "CEO" | "SST";

const PERSONAS: Record<
  Persona,
  { title: string; kpis: { label: string; value: string; delta: string; good: boolean }[] }
> = {
  CHRO: {
    title: "Visão Pessoas & Cultura",
    kpis: [
      { label: "Engajamento nos pulsos", value: "87%", delta: "+21 pts", good: true },
      { label: "Retenção pós-120 dias", value: "92%", delta: "+9%", good: true },
      { label: "Clareza de papéis", value: "4,3", delta: "+0,8", good: true },
    ],
  },
  CEO: {
    title: "Visão Estratégica & Risco",
    kpis: [
      { label: "Exposição a passivo", value: "Baixa", delta: "↓ 2 níveis", good: true },
      { label: "Plano 5W2H executado", value: "74%", delta: "+38%", good: true },
      { label: "Setores em risco alto", value: "1", delta: "−4", good: true },
    ],
  },
  SST: {
    title: "Visão Conformidade NR-1 / NR-17",
    kpis: [
      { label: "Ações com evidência", value: "96%", delta: "+44%", good: true },
      { label: "Treinamentos em dia", value: "88%", delta: "+17%", good: true },
      { label: "Prazos vencidos", value: "2", delta: "−11", good: true },
    ],
  },
};

const SETORES = [
  { nome: "Operações", v: [2, 3, 4, 2] },
  { nome: "Logística", v: [3, 4, 5, 3] },
  { nome: "Financeiro", v: [1, 2, 2, 1] },
  { nome: "Comercial", v: [2, 2, 3, 2] },
  { nome: "Atendimento", v: [3, 3, 4, 4] },
];

const HEAT = ["bg-[#00E676]/25", "bg-[#00E676]/50", "bg-amber-400/60", "bg-[#FF5252]/60", "bg-[#FF5252]"];

const FEATURES = [
  {
    icon: Users2,
    title: "Painel unificado",
    text: "Uma só fonte de verdade para CHROs, CEOs e Engenheiros de SST.",
  },
  {
    icon: Layers,
    title: "Cruzamento inteligente",
    text: "Engajamento dos pulsos × progresso de treinamentos × execução do Plano 5W2H.",
  },
  {
    icon: FileCheck2,
    title: "Laudos auditáveis em 1 clique",
    text: "Exportação de relatórios gerenciais e evidências em PDF prontos para fiscalização.",
  },
];

function ExecutiveDashboard() {
  const [persona, setPersona] = useState<Persona>("CHRO");
  const data = PERSONAS[persona];

  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[40px] bg-gradient-to-tr from-[#00E5FF]/20 via-transparent to-[#00E676]/20 blur-3xl"
      />
      <div className="lp-glass relative overflow-hidden rounded-3xl p-5 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Painel Executivo · 2026
            </p>
            <p className="mt-1 text-base font-bold text-white">{data.title}</p>
          </div>
          <div role="tablist" aria-label="Perfil do painel" className="flex rounded-full border border-white/10 bg-white/5 p-1">
            {(Object.keys(PERSONAS) as Persona[]).map((p) => (
              <button
                key={p}
                id={`analytics-persona-${p.toLowerCase()}`}
                type="button"
                role="tab"
                aria-selected={persona === p}
                onClick={() => setPersona(p)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                  persona === p
                    ? "bg-gradient-to-r from-[#00E676] to-[#00E5FF] text-[#0B132B] shadow"
                    : "text-white/55 hover:text-white"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div key={persona} className="mt-5 grid animate-fade-in grid-cols-3 gap-2.5">
          {data.kpis.map((k) => (
            <div key={k.label} className="rounded-2xl border border-white/10 bg-[#0B132B]/60 p-3">
              <p className="text-[10px] font-semibold leading-tight text-white/45">{k.label}</p>
              <p className="mt-2 text-2xl font-extrabold text-white">{k.value}</p>
              <p className={cn("mt-1 text-[11px] font-bold", k.good ? "text-[#00E676]" : "text-[#FF5252]")}>
                {k.delta}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1.25fr_1fr]">
          {/* Gráfico cruzado */}
          <div className="rounded-2xl border border-white/10 bg-[#0B132B]/60 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/55">
                <LineChart className="h-3.5 w-3.5" /> Cruzamento de dados
              </p>
            </div>
            <svg viewBox="0 0 260 110" className="mt-3 h-28 w-full" aria-hidden="true">
              {[20, 50, 80].map((y) => (
                <line key={y} x1="0" x2="260" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
              ))}
              <path className="lp-dash" d="M0 90 C 40 85, 60 70, 90 64 S 150 40, 180 34 S 230 20, 260 14" fill="none" stroke="#00E676" strokeWidth="2.5" strokeLinecap="round" />
              <path className="lp-dash" style={{ animationDelay: "200ms" }} d="M0 96 C 40 92, 70 84, 100 74 S 160 58, 190 48 S 235 38, 260 30" fill="none" stroke="#00E5FF" strokeWidth="2.5" strokeLinecap="round" />
              <path className="lp-dash" style={{ animationDelay: "400ms" }} d="M0 40 C 40 46, 70 56, 100 62 S 160 76, 190 82 S 235 90, 260 94" fill="none" stroke="#FF5252" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-semibold text-white/55">
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded bg-[#00E676]" />Engajamento</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded bg-[#00E5FF]" />Treinamentos</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-3 rounded bg-[#FF5252]" />Risco psicossocial</span>
            </div>
          </div>

          {/* Heatmap por setor */}
          <div className="rounded-2xl border border-white/10 bg-[#0B132B]/60 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">Heatmap por setor</p>
            <div className="mt-3 space-y-1.5">
              {SETORES.map((s) => (
                <div key={s.nome} className="flex items-center gap-2">
                  <span className="w-20 truncate text-[10px] text-white/55">{s.nome}</span>
                  <div className="grid flex-1 grid-cols-4 gap-1">
                    {s.v.map((v, i) => (
                      <span key={i} className={`h-4 rounded ${HEAT[v - 1]}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              aria-hidden="true"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold text-white"
            >
              <Download className="h-3.5 w-3.5 text-[#00E5FF]" /> Exportar laudo PDF
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSection() {
  return (
    <section id="analytics" className="lp-dark lp-aurora relative font-brand">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-32">
        <Reveal>
          <Eyebrow>People Analytics para a diretoria</Eyebrow>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Decisões estratégicas baseadas em{" "}
            <span className="lp-gradient-text">dados reais</span>, não em achismos.
          </h2>
          <ul className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.title} className="group flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#00E5FF] transition-all duration-500 group-hover:border-[#00E5FF]/40 group-hover:bg-[#00E5FF]/10">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-white">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-10 inline-flex items-center gap-2 text-xs text-white/40">
            <Check className="h-3.5 w-3.5 text-[#00E676]" />
            Experimente: alterne entre as visões CHRO, CEO e SST no painel.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <ExecutiveDashboard />
        </Reveal>
      </div>
    </section>
  );
}
