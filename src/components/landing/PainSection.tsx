import { Check, X } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const mercado = [
  "Planilhas manuais copiadas da internet sem base científica",
  'Descrições de cargos estáticas ("O que o RH acha que o funcionário faz")',
  "Zero participação do colaborador (invalida o documento perante Auditores-Fiscais do MTE)",
  "Exposição do trabalhador, gerando medo de retaliação e respostas mentirosas",
];

const nr1 = [
  "Base científica real: COPSOQ III, HSE-IT e PROART",
  "Captura do Trabalho Real (O Que, Como e Por Que Faz) descrita pelo próprio colaborador",
  "Regra do Limiar: anonimato completo (respostas consolidadas apenas para grupos com mais de 3 ou 5 respondentes)",
  "Matriz 5x5 oficial integrada, gerando cronogramas do Plano de Ação automaticamente",
];

export function PainSection() {
  return (
    <section className="bg-brand-offwhite font-brand">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-brand-gray-dark sm:text-4xl">
            O PGR invisível e perigoso <span className="text-brand-red">vs.</span> A blindagem legal
            ativa
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 lg:gap-0">
          <Reveal className="rounded-2xl bg-muted/70 p-7 lg:rounded-r-none lg:border-r lg:border-border">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Como o mercado faz
            </h3>
            <ul className="mt-6 space-y-5">
              {mercado.map((item) => (
                <li key={item} className="flex gap-3">
                  <X className="mt-0.5 h-5 w-5 shrink-0 text-brand-gray-dark/60" aria-hidden="true" />
                  <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal
            delay={120}
            className="rounded-2xl border border-brand-blue/25 bg-brand-blue/[0.06] p-7 shadow-md lg:rounded-l-none"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-blue">
              Como o NR-1 Pronto faz
            </h3>
            <ul className="mt-6 space-y-5">
              {nr1.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-red">
                    <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-medium leading-relaxed text-brand-gray-dark">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
