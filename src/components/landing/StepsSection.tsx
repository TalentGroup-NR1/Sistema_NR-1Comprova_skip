import { Reveal } from "@/components/landing/Reveal";

const steps = [
  {
    n: "01",
    title: "Configuração da estrutura",
    desc: "Cadastre setores, cargos e GHEs. A plataforma já sugere a estrutura a partir das descrições existentes.",
  },
  {
    n: "02",
    title: "Escuta anônima do colaborador",
    desc: "Envio de links individuais. As respostas são consolidadas apenas em grupos acima do limiar mínimo de respondentes.",
  },
  {
    n: "03",
    title: "Diagnóstico automático",
    desc: "Os índices de risco são calculados por dimensão e cruzados na Matriz 5x5 oficial.",
  },
  {
    n: "04",
    title: "Plano de Ação 5W2H",
    desc: "Riscos altos e críticos viram planos com responsável, prazo, custo e verificação de eficácia.",
  },
  {
    n: "05",
    title: "PGR pronto para auditoria",
    desc: "Documento completo gerado em PDF, versionado e com a identidade visual da sua empresa.",
  },
];

export function StepsSection() {
  return (
    <section id="como-funciona" className="bg-background font-brand">
      <div className="mx-auto max-w-4xl px-5 py-20 lg:py-24">
        <Reveal>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-gray-dark sm:text-4xl">
            A co-construção em cinco passos
          </h2>
          <p className="mt-4 text-muted-foreground">
            Do cadastro inicial ao documento assinado, sem consultoria externa.
          </p>
        </Reveal>

        <ol className="relative mt-12 space-y-8 border-l border-border pl-8">
          {steps.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 80} className="relative">
              <span className="absolute -left-[42px] flex h-7 w-7 items-center justify-center rounded-full bg-brand-red text-[11px] font-bold text-white">
                {s.n}
              </span>
              <h3 className="text-base font-bold text-brand-gray-dark">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
