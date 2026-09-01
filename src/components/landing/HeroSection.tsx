import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/landing/Reveal";
import { cn } from "@/lib/utils";
import { LANDING_DEMO_REPORT_URL, scrollToMatriz } from "@/lib/landing";
import { NIVEL_CELULA, celula, CELULA_DESTAQUE } from "@/lib/landingMatriz";

const PROBS = [1, 2, 3, 4, 5];
const SEVS = [5, 4, 3, 2, 1];

function MiniHeatmap() {
  return (
    <div className="rounded-2xl border border-brand-blue/60 bg-brand-navy-soft/80 p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Matriz de Risco 5×5
        </p>
        <span className="rounded-full bg-brand-red/20 px-2 py-0.5 text-[10px] font-semibold text-white">
          Heatmap ao vivo
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {SEVS.map((s) =>
          PROBS.map((p) => {
            const { nivel } = celula(p, s);
            const destaque =
              p === CELULA_DESTAQUE.probabilidade && s === CELULA_DESTAQUE.severidade;
            return (
              <div
                key={`${p}-${s}`}
                className={cn(
                  "relative flex h-9 items-center justify-center rounded-md text-[10px] font-semibold sm:h-11",
                  NIVEL_CELULA[nivel],
                  !destaque && "opacity-80"
                )}
              >
                {p * s}
                {destaque && (
                  <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse-dot rounded-full bg-white ring-2 ring-brand-red" />
                )}
              </div>
            );
          })
        )}
      </div>
      <p className="mt-3 text-[11px] text-white/60">
        Probabilidade (horizontal) × Severidade (vertical)
      </p>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="landing-navy landing-diagonals landing-grid-texture relative font-brand">
      <ShieldCheck
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 top-10 hidden h-[420px] w-[420px] text-white/[0.04] lg:block"
      />
      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue-light/60 bg-brand-blue/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/85">
            Riscos psicossociais · NR-1
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            O fim do PGR de gaveta.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            A única plataforma que mapeia o Trabalho Real antes que a fiscalização chegue. Colete a
            percepção dos colaboradores de forma 100% anônima, cruze os dados na Matriz 5x5 oficial
            e gere Planos de Ação 5W2H automaticamente.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={scrollToMatriz}
              className="animate-pulse-soft bg-brand-red text-white transition-transform hover:-translate-y-0.5 hover:bg-brand-red/90"
            >
              Simular Diagnóstico Grátis
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/50 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href={LANDING_DEMO_REPORT_URL} target="_blank" rel="noopener noreferrer">
                Ver Relatório Demonstrativo
              </a>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <div className="rounded-[28px] border border-white/10 bg-white/5 p-3 shadow-2xl">
            <div className="rounded-[20px] bg-brand-navy p-4">
              <div className="mb-3 flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              </div>
              <MiniHeatmap />
            </div>
            <div className="mx-auto mt-3 h-1.5 w-1/3 rounded-full bg-white/15" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
