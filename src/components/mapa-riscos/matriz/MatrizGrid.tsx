import { cn } from "@/lib/utils";
import {
  FAIXA_CELULA,
  FAIXA_LABEL,
  PROBABILIDADE_LABEL,
  SEVERIDADE_LABEL,
  faixaDoNivel,
  type MatrizConfig,
} from "@/lib/matrizRisco";
import type { RiscoGhe } from "@/hooks/useRiscosGhe";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  riscos: RiscoGhe[];
  config: MatrizConfig;
  selecionada: { p: number; s: number } | null;
  onSelecionar: (cel: { p: number; s: number } | null) => void;
}

const PROBS = [5, 4, 3, 2, 1];
const SEVS = [1, 2, 3, 4, 5];

export function MatrizGrid({ riscos, config, selecionada, onSelecionar }: Props) {
  const contar = (p: number, s: number) =>
    riscos.filter((r) => r.probabilidade === p && r.severidade === s);

  return (
    <div className="space-y-4">
      <TooltipProvider delayDuration={200}>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-1">
            <tbody>
              {PROBS.map((p) => (
                <tr key={p}>
                  <th className="w-40 pr-2 text-right align-middle text-xs font-medium text-muted-foreground">
                    <span className="hidden sm:inline">{PROBABILIDADE_LABEL[p]} </span>({p})
                  </th>
                  {SEVS.map((s) => {
                    const nivel = p * s;
                    const faixa = faixaDoNivel(nivel, config);
                    const itens = contar(p, s);
                    const ativa = selecionada?.p === p && selecionada?.s === s;
                    return (
                      <td key={s}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onSelecionar(ativa ? null : { p, s })}
                              className={cn(
                                "h-16 w-16 rounded-xl text-sm font-semibold transition-all sm:h-20 sm:w-20",
                                FAIXA_CELULA[faixa],
                                itens.length === 0 && "opacity-45",
                                ativa && "ring-4 ring-foreground/40 scale-105"
                              )}
                            >
                              <span className="block text-lg leading-none">{itens.length}</span>
                              <span className="block text-[10px] font-normal opacity-90">
                                nível {nivel}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium">
                              {PROBABILIDADE_LABEL[p]} × {SEVERIDADE_LABEL[s]} — {FAIXA_LABEL[faixa]}
                            </p>
                            {itens.length > 0 ? (
                              <ul className="mt-1 list-disc pl-4 text-xs">
                                {itens.slice(0, 6).map((r) => (
                                  <li key={r.id}>{r.nome_risco}</li>
                                ))}
                                {itens.length > 6 && <li>+{itens.length - 6} outros</li>}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">Nenhum risco nesta célula</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td />
                {SEVS.map((s) => (
                  <td key={s} className="pt-1 text-center text-xs font-medium text-muted-foreground">
                    <span className="hidden sm:block">{SEVERIDADE_LABEL[s]}</span>
                    <span>({s})</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </TooltipProvider>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Probabilidade (vertical) × Severidade (horizontal)</span>
        {(["verde", "amarelo", "laranja", "vermelho"] as const).map((f) => (
          <span key={f} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded", FAIXA_CELULA[f])} />
            {FAIXA_LABEL[f]}
          </span>
        ))}
      </div>
    </div>
  );
}
