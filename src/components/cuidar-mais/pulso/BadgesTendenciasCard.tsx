import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, ThumbsUp, AlertTriangle } from "lucide-react";
import { useBadgesAgregados } from "@/hooks/useBadgesAgregados";
import { getIsoWeek } from "@/lib/cuidarEngine";

const POSITIVOS = new Set(["semana_leve", "semana_equilibrada", "resiliencia"]);
const ALERTAS = new Set(["semana_desafiadora", "atencao_bem_estar", "sinal_cansaco"]);

export function BadgesTendenciasCard() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const semana = getIsoWeek(hoje);
  const { data: rows, isLoading } = useBadgesAgregados(ano, semana);

  // Resumir totals únicos por badge
  const { porTipo, total, topDeptosAlerta } = useMemo(() => {
    const tipoMap = new Map<string, { label: string; total: number }>();
    const deptosAlerta = new Map<string, number>();
    let totalGeral = 0;

    for (const r of rows || []) {
      if (!tipoMap.has(r.badge_tipo)) {
        tipoMap.set(r.badge_tipo, { label: r.badge_label, total: Number(r.total) });
        totalGeral += Number(r.total);
      }
      if (ALERTAS.has(r.badge_tipo)) {
        deptosAlerta.set(
          r.departamento,
          (deptosAlerta.get(r.departamento) || 0) + Number(r.total_por_depto)
        );
      }
    }

    return {
      porTipo: Array.from(tipoMap.entries()).map(([tipo, v]) => ({ tipo, ...v })),
      total: totalGeral,
      topDeptosAlerta: Array.from(deptosAlerta.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    };
  }, [rows]);

  const positivos = porTipo.filter((p) => POSITIVOS.has(p.tipo));
  const alertas = porTipo.filter((p) => ALERTAS.has(p.tipo));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Badges e Tendências da Semana
        </CardTitle>
        <CardDescription>
          Semana ISO {semana} de {ano} — distribuição das conquistas dos colaboradores.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ainda não há badges nesta semana.
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <ThumbsUp className="h-4 w-4" /> Top Positivos
                </div>
                {positivos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum nesta semana.</p>
                ) : (
                  <div className="space-y-2">
                    {positivos.map((p) => {
                      const pct = Math.round((p.total / total) * 100);
                      return (
                        <div key={p.tipo}>
                          <div className="flex justify-between text-xs">
                            <span>{p.label}</span>
                            <span className="text-muted-foreground">
                              {p.total} ({pct}%)
                            </span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-700">
                  <AlertTriangle className="h-4 w-4" /> Top Alertas
                </div>
                {alertas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum nesta semana.</p>
                ) : (
                  <div className="space-y-2">
                    {alertas.map((p) => {
                      const pct = Math.round((p.total / total) * 100);
                      return (
                        <div key={p.tipo}>
                          <div className="flex justify-between text-xs">
                            <span>{p.label}</span>
                            <span className="text-muted-foreground">
                              {p.total} ({pct}%)
                            </span>
                          </div>
                          <Progress value={pct} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {topDeptosAlerta.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-medium">
                  Times com mais sinais de alerta
                </div>
                <ul className="space-y-1 text-sm">
                  {topDeptosAlerta.map(([dep, qtd]) => (
                    <li key={dep} className="flex justify-between">
                      <span>{dep}</span>
                      <span className="text-muted-foreground">{qtd} alertas</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
