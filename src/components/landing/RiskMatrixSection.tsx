import { useState } from "react";
import { Reveal } from "@/components/landing/Reveal";
import { cn } from "@/lib/utils";
import {
  CELULA_DESTAQUE,
  EXEMPLOS_RISCO,
  NIVEL_CELULA,
  NIVEL_LABEL,
  NIVEL_TEXTO,
  PROBABILIDADE_LABEL,
  SEVERIDADE_LABEL,
  celula,
} from "@/lib/landingMatriz";
import { MATRIZ_SECTION_ID } from "@/lib/landing";

const PROBS = [1, 2, 3, 4, 5];
const SEVS = [5, 4, 3, 2, 1];

export function RiskMatrixSection() {
  const [ativa, setAtiva] = useState(CELULA_DESTAQUE);
  const detalhe = celula(ativa.probabilidade, ativa.severidade);

  return (
    <section id={MATRIZ_SECTION_ID} className="landing-navy font-brand">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <Reveal className="max-w-3xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Entenda como classificamos o risco psicossocial
          </h2>
          <p className="mt-4 text-white/70">
            Clique em qualquer quadrante para ver o que aquele cruzamento significa e qual ação o
            sistema dispara automaticamente.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <div className="flex gap-3">
              <div className="flex items-center">
                <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-white/60 [writing-mode:vertical-rl] [transform:rotate(180deg)]">
                  Severidade
                </span>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-5 gap-2">
                  {SEVS.map((s) =>
                    PROBS.map((p) => {
                      const info = celula(p, s);
                      const selecionada =
                        ativa.probabilidade === p && ativa.severidade === s;
                      const destaque =
                        p === CELULA_DESTAQUE.probabilidade &&
                        s === CELULA_DESTAQUE.severidade;
                      return (
                        <button
                          key={`${p}-${s}`}
                          type="button"
                          onClick={() => setAtiva({ probabilidade: p, severidade: s })}
                          aria-label={`Probabilidade ${p} por severidade ${s}: ${info.label}`}
                          aria-pressed={selecionada}
                          className={cn(
                            "relative flex h-14 items-center justify-center rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:h-16",
                            NIVEL_CELULA[info.nivel],
                            selecionada
                              ? "scale-[1.06] ring-2 ring-white"
                              : "opacity-85 hover:scale-[1.04] hover:opacity-100",
                            destaque && !selecionada && "animate-pulse-soft"
                          )}
                        >
                          {p * s}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {PROBS.map((p) => (
                    <span
                      key={p}
                      className="text-center text-[10px] font-medium text-white/50"
                    >
                      {PROBABILIDADE_LABEL[p]}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-center text-xs font-semibold uppercase tracking-wider text-white/60">
                  Probabilidade
                </p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-6">
              <span
                className={cn(
                  "inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider",
                  NIVEL_TEXTO[detalhe.nivel]
                )}
              >
                {NIVEL_LABEL[detalhe.nivel]}
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">
                {PROBABILIDADE_LABEL[detalhe.probabilidade]} probabilidade ·{" "}
                {SEVERIDADE_LABEL[detalhe.severidade]} severidade
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">{detalhe.significado}</p>
              <div className="mt-5 rounded-xl bg-brand-navy/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
                  O que o sistema faz
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{detalhe.acao}</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={80} className="mt-12">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/60">
            Exemplos reais de classificação
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {EXEMPLOS_RISCO.map((ex) => (
              <div
                key={ex.risco}
                className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:border-brand-red/50"
              >
                <p className="text-sm font-bold text-white">{ex.risco}</p>
                <p className="mt-2 text-xs text-white/55">{ex.calculo}</p>
                <p className={cn("mt-1 text-xs font-bold", NIVEL_TEXTO[ex.nivel])}>
                  {NIVEL_LABEL[ex.nivel]}
                </p>
                <p className="mt-3 text-sm text-white/75">{ex.acao}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
