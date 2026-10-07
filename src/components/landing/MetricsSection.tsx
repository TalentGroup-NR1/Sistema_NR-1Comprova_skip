import { Reveal } from "@/components/landing/Reveal";

const MODULES = [
  "Cuidar+",
  "Upload Inteligente do PGR",
  "Kanban 5W2H",
  "Matriz de Risco 5×5",
  "Treinamentos & Certificados",
  "Diário de Bordo 30·80·120",
  "Trabalho Real × Prescrito",
  "Avaliação de Desempenho",
  "Feedback Contínuo",
  "Canal de Escuta Anônimo",
  "Comunicados",
  "Relatórios Executivos",
];

export function MetricsSection() {
  return (
    <section className="lp-dark relative font-brand">
      {/* Marquee de módulos */}
      <div className="relative overflow-hidden border-y border-white/10 bg-white/[0.02] py-4 [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="lp-marquee flex w-max gap-10 whitespace-nowrap">
          {[...MODULES, ...MODULES].map((m, i) => (
            <span
              key={`${m}-${i}`}
              className="inline-flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-white/40"
            >
              <span className="h-1 w-1 rounded-full bg-[#00E5FF]" />
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
