import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Reveal } from "@/components/landing/Reveal";

const faq = [
  {
    q: "O que é o NR-1Comprova?",
    a: "É uma plataforma SaaS para gestão de RH, SST e conformidade NR-1, multi-tenant e com white-label.",
  },
  {
    q: "Quem pode usar?",
    a: "Empresas de qualquer porte que precisam gerenciar colaboradores, PGR e obrigações de SST.",
  },
  {
    q: "Como funciona o white-label?",
    a: "Cada empresa cadastra sua logo, cor e nome. O sistema assume a identidade visual da empresa.",
  },
  {
    q: "Os dados estão seguros?",
    a: "Sim. Isolamento por RLS (Row Level Security), MFA para administradores, auditoria LGPD completa e conformidade com a Lei 13.709/2018.",
  },
  {
    q: "Preciso instalar algo?",
    a: "Não. É 100% web. Você acessa pelo navegador, de qualquer dispositivo.",
  },
  {
    q: "Como faço para começar?",
    a: "Solicite uma demonstração pelo formulário de contato. Nossa equipe entra em contato para os próximos passos.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-background font-brand">
      <div className="mx-auto max-w-3xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-gray-dark sm:text-4xl">
            Perguntas frequentes
          </h2>
        </Reveal>

        <Reveal delay={90}>
          <Accordion type="single" collapsible className="mt-8">
            {faq.map((item, index) => (
              <AccordionItem key={item.q} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base font-semibold text-brand-gray-dark">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
