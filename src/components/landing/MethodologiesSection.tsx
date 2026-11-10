import { Reveal } from "@/components/landing/Reveal";
import { cn } from "@/lib/utils";

const metodologias = [
  {
    sigla: "COPSOQ III",
    nome: "Copenhagen Psychosocial Questionnaire",
    desc: "Padrão internacional para avaliação de exigências quantitativas, ritmo, previsibilidade e reconhecimento no trabalho.",
    span: "lg:col-span-2 lg:row-span-2",
    dark: true,
  },
  {
    sigla: "HSE-IT",
    nome: "Health and Safety Executive Indicator Tool",
    desc: "Instrumento britânico focado em demanda, controle, suporte, relacionamento, função e mudança.",
  },
  {
    sigla: "PROART",
    nome: "Protocolo de Avaliação dos Riscos Psicossociais no Trabalho",
    desc: "Protocolo brasileiro que avalia organização, estilos de gestão, sofrimento ético e danos relacionados ao trabalho.",
  },
  {
    sigla: "Trabalho Real",
    nome: "Captura ergonômica da atividade",
    desc: "O colaborador descreve o que faz, como faz e por que faz — revelando a distância entre prescrito e real.",
    span: "lg:col-span-2",
  },
];

export function MethodologiesSection() {
  return (
    <section id="metodologias" className="bg-brand-offwhite font-brand">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-gray-dark sm:text-4xl">
            Metodologias nativas, não improvisadas
          </h2>
          <p className="mt-4 text-muted-foreground">
            Os questionários já vêm prontos, validados cientificamente e adaptados ao contexto
            brasileiro.
          </p>
        </Reveal>

        <div className="mt-12 grid auto-rows-[minmax(150px,auto)] gap-5 lg:grid-cols-4">
          {metodologias.map((m, i) => (
            <Reveal
              key={m.sigla}
              delay={i * 80}
              className={cn(
                "flex flex-col justify-between rounded-2xl border p-7 transition-transform duration-300 hover:-translate-y-1",
                m.span,
                m.dark
                  ? "landing-navy border-brand-blue/50 text-white shadow-xl"
                  : "border-border bg-card shadow-sm"
              )}
            >
              <div>
                <p
                  className={cn(
                    "text-2xl font-extrabold tracking-tight",
                    m.dark ? "text-white" : "text-brand-blue"
                  )}
                >
                  {m.sigla}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs font-semibold uppercase tracking-wider",
                    m.dark ? "text-white/60" : "text-muted-foreground"
                  )}
                >
                  {m.nome}
                </p>
              </div>
              <p
                className={cn(
                  "mt-5 text-sm leading-relaxed",
                  m.dark ? "text-white/75" : "text-muted-foreground"
                )}
              >
                {m.desc}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
