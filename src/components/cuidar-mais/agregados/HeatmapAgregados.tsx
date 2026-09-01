import { Fragment } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HeatmapCell } from "@/hooks/useCuidarResultadosAgregados";
import { cn } from "@/lib/utils";

interface Props {
  data: HeatmapCell[];
  grupos: string[];
  dimensoes: string[];
}

function getCellColor(media: number | null): string {
  if (media === null) return "bg-muted/40 text-muted-foreground";
  if (media < 2.5) return "bg-red-500/80 text-white";
  if (media <= 3.5) return "bg-yellow-400/80 text-yellow-950";
  return "bg-green-500/80 text-white";
}

function getEmoji(media: number): string {
  if (media < 2.5) return "🔴";
  if (media <= 3.5) return "🟡";
  return "🟢";
}

function getStars(media: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(media)));
  return "★".repeat(filled) + "☆".repeat(5 - filled);
}

export function HeatmapAgregados({ data, grupos, dimensoes }: Props) {
  if (grupos.length === 0 || dimensoes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Nenhuma resposta no período selecionado.
      </p>
    );
  }

  const lookup = new Map<string, HeatmapCell>();
  data.forEach((c) => lookup.set(`${c.grupo}::${c.dimensao}`, c));

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-x-auto">
        <div
          className="grid gap-1 min-w-fit"
          style={{
            gridTemplateColumns: `minmax(160px, max-content) repeat(${dimensoes.length}, minmax(110px, 1fr))`,
          }}
        >
          <div />
          {dimensoes.map((d) => (
            <div
              key={d}
              className="text-xs font-medium text-center px-2 py-2 text-muted-foreground"
            >
              {d}
            </div>
          ))}

          {grupos.map((g) => (
            <Fragment key={g}>
              <div className="text-sm font-medium px-3 py-2 flex items-center bg-muted/40 rounded-l-md">
                {g}
              </div>
              {dimensoes.map((d) => {
                const cell = lookup.get(`${g}::${d}`);
                const media = cell ? Number(cell.media) : null;
                return (
                  <Tooltip key={`${g}-${d}`}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-14 rounded-md flex items-center justify-center text-sm font-semibold cursor-default transition-transform hover:scale-105",
                          getCellColor(media)
                        )}
                      >
                        {media !== null ? media.toFixed(1) : "—"}
                      </div>
                    </TooltipTrigger>
                    {cell && media !== null && (
                      <TooltipContent className="text-xs space-y-1">
                        <div>
                          <span className="font-semibold">Dimensão:</span> {d}
                        </div>
                        <div>
                          <span className="font-semibold">Média:</span>{" "}
                          {media.toFixed(1)} {getStars(media)} ({getEmoji(media)})
                        </div>
                        <div>
                          <span className="font-semibold">Respondentes:</span>{" "}
                          {cell.respondentes} de {cell.total_colaboradores} colaboradores
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
