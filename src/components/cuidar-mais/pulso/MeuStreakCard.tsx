import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy, Sparkles } from "lucide-react";
import { useMeuStreakCuidar } from "@/hooks/useMeuStreakCuidar";
import { badgesDoStreak } from "@/lib/cuidarStreak";

export function MeuStreakCard() {
  const { data, isLoading } = useMeuStreakCuidar();

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const streak = data?.streak_semanal ?? 0;
  const best = data?.best_streak ?? 0;
  const badges = badgesDoStreak(streak);

  // Próximo marco
  const proximoMarco = streak < 4 ? 4 : streak < 12 ? 12 : null;
  const progressoMarco = proximoMarco
    ? Math.round((streak / proximoMarco) * 100)
    : 100;

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <CardContent className="p-6 bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-rose-950/30">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sua sequência</p>
              <p className="text-2xl font-bold leading-tight">
                {streak === 0
                  ? "Comece sua jornada de bem-estar"
                  : `${streak} ${streak === 1 ? "semana" : "semanas"} de sequência!`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground">Recorde</p>
              <p className="text-lg font-semibold">
                {best} {best === 1 ? "semana" : "semanas"}
              </p>
            </div>
          </div>
        </div>

        {proximoMarco && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Próximo marco</span>
              <span>
                {streak}/{proximoMarco}
              </span>
            </div>
            <Progress value={progressoMarco} className="h-2" />
          </div>
        )}

        {badges.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((b) => (
              <Badge
                key={b}
                variant="secondary"
                className="gap-1 bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-100"
              >
                <Sparkles className="h-3 w-3" /> {b}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
