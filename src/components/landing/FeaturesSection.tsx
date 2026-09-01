import {
  ClipboardList,
  Grid3x3,
  FileText,
  HeartPulse,
  Users,
  GraduationCap,
  Clock,
  BarChart3,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const modules = [
  {
    icon: ClipboardList,
    title: "Mapa de Riscos NR-1",
    desc: "Questionários dinâmicos com base científica, aplicados de forma anônima e consolidados por GHE.",
  },
  {
    icon: Grid3x3,
    title: "Matriz de Risco 5x5",
    desc: "Cruzamento oficial de probabilidade e severidade com sugestão automática de riscos por cargo e tarefa.",
  },
  {
    icon: FileText,
    title: "PGR Editável",
    desc: "Documento completo, versionado e pronto para auditoria, com identidade visual da sua empresa.",
  },
  {
    icon: HeartPulse,
    title: "Cuidar+",
    desc: "Pulsos semanais de clima e bem-estar com trilha de conteúdo e acompanhamento individual.",
  },
  {
    icon: Users,
    title: "Estrutura Organizacional",
    desc: "Descrições de cargo co-construídas com o colaborador, capturando o Trabalho Real.",
  },
  {
    icon: GraduationCap,
    title: "Treinamentos",
    desc: "Trilhas em vídeo, certificados automáticos e controle de conclusão por colaborador.",
  },
  {
    icon: Clock,
    title: "Ponto Eletrônico",
    desc: "Banco de horas por ciclo, abonos por dia ou hora e fechamento com assinatura digital.",
  },
  {
    icon: BarChart3,
    title: "Relatórios Executivos",
    desc: "Absenteísmo, turnover e indicadores de jornada em painéis prontos para a diretoria.",
  },
];

export function FeaturesSection() {
  return (
    <section id="funcionalidades" className="bg-background font-brand">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-24">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-gray-dark sm:text-4xl">
            Oito módulos, uma única plataforma
          </h2>
          <p className="mt-4 text-muted-foreground">
            Conformidade legal e gestão de pessoas no mesmo lugar — sem planilhas paralelas.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m, i) => (
            <Reveal
              key={m.title}
              delay={i * 60}
              className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-red/40 hover:shadow-lg"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue transition-colors group-hover:bg-brand-red/10 group-hover:text-brand-red">
                <m.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-base font-bold text-brand-gray-dark">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
