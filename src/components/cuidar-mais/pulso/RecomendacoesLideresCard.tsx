import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2, AlertTriangle, TrendingDown, Scale } from "lucide-react";
import { useRecomendacoesRH } from "@/hooks/useRecomendacoesRH";

function getIsoWeekAndYear(d = new Date()): { ano: number; semana: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return { ano: date.getUTCFullYear(), semana };
}

const ICONS: Record<string, typeof AlertTriangle> = {
  humor_baixo: AlertTriangle,
  queda_coletiva: TrendingDown,
  alta_carga: Scale,
};

const COLORS: Record<string, string> = {
  humor_baixo: "bg-rose-50 text-rose-700 border-rose-200",
  queda_coletiva: "bg-amber-50 text-amber-700 border-amber-200",
  alta_carga: "bg-sky-50 text-sky-700 border-sky-200",
};

export function RecomendacoesLideresCard() {
  const { ano, semana } = useMemo(() => getIsoWeekAndYear(), []);
  const { data, isLoading } = useRecomendacoesRH(ano, semana);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="h-5 w-5" /> Recomendações para Líderes
        </CardTitle>
        <CardDescription>
          Semana {semana}/{ano} — sugestões agregadas por time com base no humor coletivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma recomendação organizacional nesta semana. Os times estão saudáveis.
          </p>
        ) : (
          data.map((r, i) => {
            const Icon = ICONS[r.tipo] ?? AlertTriangle;
            const color = COLORS[r.tipo] ?? "bg-muted text-foreground border-border";
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${color}`}>
                <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{r.departamento}</span>
                    <Badge variant="outline" className="text-xs bg-background/60">
                      {r.tipo.replace("_", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {r.total_respondentes} respondentes
                    </span>
                  </div>
                  <p className="text-sm mt-1">{r.recomendacao}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
