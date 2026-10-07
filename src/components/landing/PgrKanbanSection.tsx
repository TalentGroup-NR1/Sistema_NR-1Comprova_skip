import { useEffect, useState } from "react";
import {
  ArrowRight,
  BellRing,
  Brain,
  CheckCircle2,
  FileText,
  KanbanSquare,
  Paperclip,
  ScanLine,
  Sparkles,
  UploadCloud,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/landing/Reveal";
import { Eyebrow } from "@/components/landing/premium";

const COLUMNS = [
  { name: "A Fazer", dot: "bg-white/40" },
  { name: "Em Andamento", dot: "bg-[#00E5FF]" },
  { name: "Aguardando Evidência", dot: "bg-amber-400" },
  { name: "Concluído", dot: "bg-[#00E676]" },
];

const OLD_WAY = [
  "Planilhas soltas e PDFs estáticos esquecidos após a auditoria.",
  "Descrições de cargos teóricas baseadas no que o RH acha que é feito.",
  "Sem participação do trabalhador gerando riscos em fiscalizações.",
  "Ações sem acompanhamento de prazos, responsáveis ou evidências.",
];

const NEW_WAY = [
  {
    title: "Upload Inteligente do PGR",
    text: "Leitura automática de laudos e conversão em Kanban vivo.",
  },
  {
    title: "Mapeamento do Trabalho Real",
    text: "O colaborador descreve a rotina real e aponta gargalos.",
  },
  {
    title: "Gestão Ativa do Plano de Ação",
    text: "Quadros visuais (5W2H) com acompanhamento em tempo real.",
  },
  {
    title: "Validação Contínua",
    text: "Pulsos do Cuidar+ medem se a ação reduziu o estresse.",
  },
];

const STATIC_CARDS: Record<number, { title: string; who: string }[]> = {
  0: [{ title: "Revisar metas de produtividade", who: "Gestor · Logística" }],
  1: [{ title: "Redesenho da escala de turnos", who: "RH · Operações" }],
  2: [{ title: "Pausas ativas no setor fiscal", who: "SST · Financeiro" }],
  3: [{ title: "Canal de escuta implantado", who: "RH · Corporativo" }],
};

const EXTRACTED = [
  { label: "Sobrecarga de trabalho", tone: "border-[#FF5252]/40 bg-[#FF5252]/10 text-[#FF8A80]" },
  { label: "Metas excessivas", tone: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
  { label: "Baixa autonomia", tone: "border-amber-400/40 bg-amber-400/10 text-amber-200" },
  { label: "12 ações 5W2H", tone: "border-[#00E676]/40 bg-[#00E676]/10 text-[#69F0AE]" },
];

const STEPS = [
  { icon: UploadCloud, label: "Arraste o PDF" },
  { icon: ScanLine, label: "IA lê o laudo" },
  { icon: Brain, label: "Extrai riscos & 5W2H" },
  { icon: KanbanSquare, label: "Kanban vivo" },
];

function usePipelineTick(interval = 2200) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTick(3);
      return;
    }
    const id = window.setInterval(() => setTick((t) => (t + 1) % 4), interval);
    return () => window.clearInterval(id);
  }, [interval]);
  return tick;
}

function PipelineDemo() {
  const step = usePipelineTick();

  return (
    <div className="lp-beam rounded-[28px] bg-[#0E1834] p-1.5 shadow-[0_50px_140px_-40px_rgba(0,229,255,0.45)]">
      <div className="rounded-[22px] border border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent p-5 sm:p-7">
        {/* Stepper */}
        <div className="relative grid grid-cols-4 gap-2">
          <div className="absolute left-[12.5%] right-[12.5%] top-5 h-0.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#00E676] to-[#00E5FF] transition-all duration-700"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
          {STEPS.map((s, i) => (
            <div key={s.label} className="relative z-10 flex flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-500",
                  i <= step
                    ? "border-transparent bg-gradient-to-br from-[#00E676] to-[#00E5FF] text-[#0B132B] shadow-[0_0_24px_rgba(0,229,255,0.55)]"
                    : "border-white/10 bg-[#121D3D] text-white/40"
                )}
              >
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider transition-colors sm:text-[11px]",
                  i <= step ? "text-white" : "text-white/35"
                )}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[0.8fr_auto_0.9fr_auto_1.6fr] lg:items-center">
          {/* PDF */}
          <div className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-white p-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF5252] text-[10px] font-extrabold text-white">
                PDF
              </span>
              <div className="leading-tight">
                <p className="text-[11px] font-bold text-[#0B132B]">PGR_2026.pdf</p>
                <p className="text-[9px] text-[#0B132B]/50">48 páginas · 3,2 MB</p>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {[100, 85, 92, 70, 95, 60, 88, 76, 90, 55].map((w, i) => (
                <div key={i} className="h-1.5 rounded-full bg-[#0B132B]/10" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-3 rounded-sm bg-[#0B132B]/[0.07]" />
              ))}
            </div>
            {step >= 1 && (
              <div className="lp-scan absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-[#00E5FF]/35 to-transparent">
                <div className="absolute inset-x-0 top-1/2 h-px bg-[#00E5FF] shadow-[0_0_12px_#00E5FF]" />
              </div>
            )}
          </div>

          <ArrowRight className="mx-auto hidden h-5 w-5 text-[#00E5FF]/60 lg:block" />

          {/* Extração IA */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#00E5FF]">
              <Sparkles className="h-3.5 w-3.5" />
              Extração com IA
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {EXTRACTED.map((e, i) => (
                <span
                  key={e.label}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all duration-500",
                    e.tone,
                    step >= 2 ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                  )}
                  style={{ transitionDelay: step >= 2 ? `${i * 120}ms` : "0ms" }}
                >
                  {e.label}
                </span>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 font-mono text-[10px] text-white/45">
              <p className={cn("transition-opacity", step >= 1 ? "opacity-100" : "opacity-30")}>
                › lendo tabelas do inventário…
              </p>
              <p className={cn("transition-opacity", step >= 2 ? "opacity-100" : "opacity-30")}>
                › mapeando What / Who / When…
              </p>
              <p className={cn("transition-opacity", step >= 3 ? "text-[#00E676]" : "opacity-30")}>
                ✓ 12 cartões criados
              </p>
            </div>
          </div>

          <ArrowRight className="mx-auto hidden h-5 w-5 text-[#00E5FF]/60 lg:block" />

          {/* Kanban */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {COLUMNS.map((col, ci) => (
              <div key={col.name} className="min-h-[170px] rounded-xl border border-white/10 bg-[#0B132B]/60 p-2">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                  <span className="truncate text-[9px] font-bold uppercase tracking-wider text-white/55">
                    {col.name}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {STATIC_CARDS[ci].map((c) => (
                    <div key={c.title} className="rounded-lg border border-white/10 bg-white/[0.04] p-2">
                      <p className="text-[10px] font-semibold leading-tight text-white/80">{c.title}</p>
                      <p className="mt-1 text-[8px] text-white/40">{c.who}</p>
                    </div>
                  ))}
                  {step === ci && (
                    <div
                      key={`live-${step}`}
                      className="animate-scale-in rounded-lg border border-[#00E5FF]/60 bg-gradient-to-br from-[#00E5FF]/15 to-[#00E676]/10 p-2 shadow-[0_0_24px_rgba(0,229,255,0.35)]"
                    >
                      <p className="text-[10px] font-bold leading-tight text-white">
                        Treinar lideranças em gestão de carga
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[8px] text-white/55">Ana · RH · 30/11</span>
                        {ci === 3 ? (
                          <CheckCircle2 className="h-3 w-3 text-[#00E676]" />
                        ) : ci === 2 ? (
                          <Paperclip className="h-3 w-3 text-amber-300" />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


export function PgrKanbanSection() {
  return (
    <section id="pgr-inteligente" className="lp-dark lp-aurora lp-grid relative font-brand">
      <div className="mx-auto max-w-7xl px-5 py-24 lg:py-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>
            <FileText className="h-3 w-3" /> O módulo estrela
          </Eyebrow>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Dê vida ao seu PGR em PDF em{" "}
            <span className="lp-gradient-text">minutos.</span>
          </h2>
          <p className="mt-5 text-base text-white/60 sm:text-lg">
            Sem redigitação. Sem processos manuais. Arraste seu laudo atual e veja a mágica
            acontecer.
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-14">
          <PipelineDemo />
        </Reveal>


        <Reveal delay={200} className="mt-8 flex items-center justify-center gap-2 text-xs text-white/45">
          <BellRing className="h-3.5 w-3.5 text-[#00E5FF]" />
          Alertas automáticos de prazo para cada responsável — nenhuma ação fica esquecida.
        </Reveal>

        {/* Bloco Comparativo integrado */}
        <Reveal delay={240} className="mt-20">
          <div className="mx-auto max-w-3xl text-center mb-10">
            <h3 className="text-2xl font-extrabold text-white sm:text-4xl">
              O jeito antigo <span className="text-white/30">vs.</span> A Gestão Ativa
            </h3>
          </div>
          
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] items-stretch">
            <div className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 shadow-sm p-8 backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FF5252]">Como o mercado faz</p>
                <h3 className="mt-2 text-xl font-extrabold text-white/90">O PGR de Gaveta</h3>
                <ul className="mt-6 space-y-4">
                  {OLD_WAY.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FF5252]/10">
                        <X className="h-3 w-3 text-[#FF5252]" />
                      </span>
                      <span className="text-sm leading-relaxed text-white/50 line-through decoration-[#FF5252]/30">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl border border-[#00E676]/20 bg-gradient-to-br from-[#00E676]/10 to-transparent p-8 shadow-[0_0_40px_rgba(0,230,118,0.1)] backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00E676]">Como sua empresa ficará</p>
              <h3 className="mt-2 text-xl font-extrabold text-white">NR-1Comprova</h3>
              <ul className="mt-6 space-y-4">
                {NEW_WAY.map((item) => (
                  <li key={item.title} className="group flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00E676] to-[#00E5FF] shadow-[0_0_10px_rgba(0,230,118,0.3)] transition-transform group-hover:scale-110">
                      <Check className="h-3 w-3 text-[#0B132B]" strokeWidth={3} />
                    </span>
                    <span className="text-sm leading-relaxed text-white/80">
                      <strong className="font-bold text-white">{item.title}:</strong> {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
