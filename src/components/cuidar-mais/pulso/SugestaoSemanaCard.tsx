import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Lightbulb, AlertTriangle, Coffee, Award } from "lucide-react";
import { useMinhasRecomendacoesCuidar } from "@/hooks/useMinhasRecomendacoesCuidar";
import { RECOMENDACOES, type RecomendacaoTipo } from "@/lib/cuidarRecomendacoes";

function tipoVisual(tipo: string) {
  const def = RECOMENDACOES[tipo as RecomendacaoTipo];
  const categoria = def?.categoria ?? "neutro";
  switch (categoria) {
    case "positivo":
      return { icon: Sparkles, color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case "alerta":
      return { icon: AlertTriangle, color: "bg-amber-100 text-amber-700 border-amber-200" };
    case "consistencia":
      return { icon: Award, color: "bg-indigo-100 text-indigo-700 border-indigo-200" };
    case "organizacional":
      return { icon: Coffee, color: "bg-sky-100 text-sky-700 border-sky-200" };
    default:
      return { icon: Lightbulb, color: "bg-muted text-foreground border-border" };
  }
}

export function SugestaoSemanaCard() {
  const { data, isLoading } = useMinhasRecomendacoesCuidar(5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Sugestão da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) return null;

  const principal = data[0];
  const visual = tipoVisual(principal.tipo);
  const Icon = visual.icon;
  const extras = data.slice(1, 4);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" /> Sugestão da Semana
        </CardTitle>
        <CardDescription>Pequeno passo prático baseado nas suas últimas respostas.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`flex items-start gap-3 p-4 rounded-lg border ${visual.color}`}>
          <Icon className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium leading-snug">
              {principal.recomendacao.slice(0, 160)}
            </p>
            <Badge variant="outline" className="mt-2 text-xs bg-background/60">
              {RECOMENDACOES[principal.tipo as RecomendacaoTipo]?.tipo ?? principal.tipo}
            </Badge>
          </div>
        </div>

        {extras.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Outras sugestões</p>
            {extras.map((r) => {
              const v = tipoVisual(r.tipo);
              const I = v.icon;
              return (
                <div key={r.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <I className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{r.recomendacao.slice(0, 160)}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
