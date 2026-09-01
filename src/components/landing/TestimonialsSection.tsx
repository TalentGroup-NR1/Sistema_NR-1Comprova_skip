import { Quote } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const testimonials = [
  {
    quote:
      "Substituímos três planilhas e uma consultoria externa. O PGR psicossocial saiu em duas semanas, com participação real das equipes.",
    name: "Coordenação de RH",
    context: "Indústria · 320 colaboradores",
  },
  {
    quote:
      "O anonimato garantido pelo limiar de respondentes mudou a qualidade das respostas. Enfim enxergamos o trabalho como ele é.",
    name: "Gerência de SST",
    context: "Serviços · 140 colaboradores",
  },
  {
    quote:
      "A Matriz 5x5 já entregou os planos de ação prontos. A auditoria interna aprovou sem nenhuma ressalva.",
    name: "Diretoria de Operações",
    context: "Logística · 500 colaboradores",
  },
];

export function TestimonialsSection() {
  return (
    <section className="bg-brand-offwhite font-brand">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-gray-dark sm:text-4xl">
            Resultados que falam por si
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Casos baseados em implementações reais
          </p>
        </Reveal>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <Reveal
              key={item.name}
              delay={index * 90}
              className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1"
            >
              <Quote className="h-6 w-6 text-brand-red" aria-hidden="true" />
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-brand-gray-dark">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4">
                <p className="text-sm font-bold text-brand-gray-dark">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.context}</p>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
