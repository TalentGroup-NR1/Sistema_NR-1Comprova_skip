import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, Info, MessageSquare } from "lucide-react";
import { CompetenciaResultado } from "@/hooks/useAvaliacaoResultados";

interface AvaliacaoCompetenciasTableProps {
  competencias: CompetenciaResultado[];
  maxScale?: number;
}

function formatNumber(val: number | null, decimals = 1): string {
  if (val === null) return "—";
  return val.toFixed(decimals);
}

function getGapColor(gap: number | null): { bg: string; text: string; label: string } {
  if (gap === null) return { bg: "bg-muted", text: "text-muted-foreground", label: "—" };
  const absGap = Math.abs(gap);
  if (absGap <= 0.5) return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Alinhado" };
  if (absGap <= 1) return { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", label: "Atenção" };
  return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Divergente" };
}

function getScoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 4) return "text-green-600 dark:text-green-400";
  if (score >= 3) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function AvaliacaoCompetenciasTable({ competencias, maxScale = 5 }: AvaliacaoCompetenciasTableProps) {
  if (competencias.length === 0) {
    return null;
  }

  return (
    <Card className="border-border print:border-gray-300 avaliacao-table">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Análise de Competências ({competencias.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2 font-semibold text-muted-foreground uppercase text-xs tracking-wide">
                  Competência
                </th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground uppercase text-xs tracking-wide w-40">
                  Autoavaliação
                </th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground uppercase text-xs tracking-wide w-40">
                  Gestor
                </th>
                <th className="text-center py-3 px-2 font-semibold text-muted-foreground uppercase text-xs tracking-wide w-28">
                  Gap
                </th>
              </tr>
            </thead>
            <tbody>
              {competencias.map((comp) => {
                const autoScore = comp.resposta_colaborador?.peso ?? null;
                const gestorScore = comp.resposta_gestor?.peso ?? null;
                const gap = comp.discrepancia;
                const gapInfo = getGapColor(gap);

                return (
                  <tr key={comp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    {/* Competência */}
                    <td className="py-3 px-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-help">
                                  <span className="font-medium">{comp.nome_competencia}</span>
                                  {comp.conceito_competencia && (
                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              {comp.conceito_competencia && (
                                <TooltipContent side="right" className="max-w-xs">
                                  <p className="text-sm">{comp.conceito_competencia}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                          
                          {/* Comentários inline para impressão */}
                          {(comp.resposta_colaborador?.comentario || comp.resposta_gestor?.comentario) && (
                            <div className="mt-2 space-y-1 text-xs hidden print:block">
                              {comp.resposta_colaborador?.comentario && (
                                <p className="text-gray-600 italic">
                                  <span className="font-medium">Auto:</span> "{comp.resposta_colaborador.comentario}"
                                </p>
                              )}
                              {comp.resposta_gestor?.comentario && (
                                <p className="text-gray-600 italic">
                                  <span className="font-medium">Gestor:</span> "{comp.resposta_gestor.comentario}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Comentários icon para tela */}
                        {(comp.resposta_colaborador?.comentario || comp.resposta_gestor?.comentario) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <MessageSquare className="h-4 w-4 text-muted-foreground print:hidden" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-sm">
                                <div className="space-y-2 text-sm">
                                  {comp.resposta_colaborador?.comentario && (
                                    <div>
                                      <p className="font-medium text-blue-600">Autoavaliação:</p>
                                      <p className="italic">"{comp.resposta_colaborador.comentario}"</p>
                                    </div>
                                  )}
                                  {comp.resposta_gestor?.comentario && (
                                    <div>
                                      <p className="font-medium text-green-600">Gestor:</p>
                                      <p className="italic">"{comp.resposta_gestor.comentario}"</p>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>

                    {/* Autoavaliação */}
                    <td className="py-3 px-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-bold ${getScoreColor(autoScore)}`}>
                          {formatNumber(autoScore)}
                        </span>
                        <Progress 
                          value={autoScore !== null ? (autoScore / maxScale) * 100 : 0} 
                          className="h-1.5 w-full max-w-24"
                        />
                      </div>
                    </td>

                    {/* Gestor */}
                    <td className="py-3 px-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-lg font-bold ${getScoreColor(gestorScore)}`}>
                          {formatNumber(gestorScore)}
                        </span>
                        <Progress 
                          value={gestorScore !== null ? (gestorScore / maxScale) * 100 : 0} 
                          className="h-1.5 w-full max-w-24"
                        />
                      </div>
                    </td>

                    {/* Gap */}
                    <td className="py-3 px-2 text-center">
                      <Badge className={`${gapInfo.bg} ${gapInfo.text} print:border print:border-gray-300`} variant="outline">
                        {gap !== null ? (gap > 0 ? "+" : "") + formatNumber(gap) : "—"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
