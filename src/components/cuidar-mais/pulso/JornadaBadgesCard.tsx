import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMeusBadgesCuidar } from "@/hooks/useMeusBadgesCuidar";
import { categoriaBadge, type BadgeTipo } from "@/lib/cuidarBadges";

const CATEGORY_CLASS: Record<string, string> = {
  positivo: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200",
  neutro: "bg-muted text-foreground hover:bg-muted border-border",
  alerta: "bg-amber-100 text-amber-900 hover:bg-amber-100 border-amber-200",
  consistencia: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100 border-indigo-200",
};

export function JornadaBadgesCard() {
  const { data: badges, isLoading } = useMeusBadgesCuidar(4);

  // Calcular evolução entre últimos dois badges de faixa (semana_*)
  const semanaBadges = (badges || []).filter((b) =>
    ["semana_leve", "semana_equilibrada", "semana_desafiadora", "atencao_bem_estar"].includes(
      b.badge_tipo
    )
  );
  const ultimo = semanaBadges[0];
  const penultimo = semanaBadges[1];
  const delta =
    ultimo?.score != null && penultimo?.score != null
      ? Number(ultimo.score) - Number(penultimo.score)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Sua Jornada de Bem-Estar
        </CardTitle>
        <CardDescription>
          Conquistas das suas últimas respostas do Cuidar+.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-28 rounded-full" />
            ))}
          </div>
        ) : !badges || badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Você ainda não tem conquistas. Responda ao Pulso da Semana para começar.
          </p>
        ) : (
          <>
            <TooltipProvider>
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => {
                  const cat = categoriaBadge(b.badge_tipo as BadgeTipo);
                  return (
                    <Tooltip key={b.id}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className={`${CATEGORY_CLASS[cat]} cursor-help px-3 py-1 text-xs font-medium`}
                        >
                          {b.badge_label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="max-w-xs space-y-1">
                          <p className="text-sm">{b.badge_descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(b.created_at), "dd 'de' MMM yyyy", { locale: ptBR })}
                            {b.score != null && ` • Score ${Number(b.score).toFixed(0)}`}
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>

            {delta !== null && (
              <div className="mt-4 flex items-center gap-2 text-sm">
                {delta > 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : delta < 0 ? (
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span
                  className={
                    delta > 0
                      ? "text-emerald-700"
                      : delta < 0
                        ? "text-amber-700"
                        : "text-muted-foreground"
                  }
                >
                  Evolução: {delta > 0 ? "+" : ""}
                  {delta.toFixed(0)} pts vs sua resposta anterior
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
