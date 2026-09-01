import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Treinamento } from "@/hooks/useTreinamentos";
import { TreinamentoProgresso } from "@/hooks/useTreinamentoProgresso";
import { TreinamentoCard } from "./TreinamentoCard";

interface TrilhaHorizontalProps {
  titulo: string;
  cor?: string | null;
  treinamentos: Treinamento[];
  progressos: Record<string, TreinamentoProgresso>;
}

export function TrilhaHorizontal({ titulo, cor, treinamentos, progressos }: TrilhaHorizontalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (!treinamentos.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className="h-5 w-1.5 rounded-full" style={{ backgroundColor: cor || "hsl(var(--primary))" }} />
          {titulo}
          <span className="text-sm font-normal text-muted-foreground">({treinamentos.length})</span>
        </h2>
        <div className="hidden gap-1 sm:flex">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollBy(-1)} aria-label="Voltar">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => scrollBy(1)} aria-label="Avançar">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]"
      >
        {treinamentos.map((t) => (
          <TreinamentoCard
            key={t.id}
            treinamento={t}
            progresso={progressos[t.id]}
            className="w-[260px] shrink-0 snap-start sm:w-[290px]"
          />
        ))}
      </div>
    </section>
  );
}
