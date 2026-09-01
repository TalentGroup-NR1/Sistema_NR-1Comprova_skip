import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TopStreak {
  user_id: string;
  streak_semanal: number;
  best_streak: number;
  nome: string;
}

function useTopStreaks(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ["cuidar-top-streaks", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<TopStreak[]> => {
      const { data: progs, error } = await supabase
        .from("cuidar_progressao")
        .select("user_id, streak_semanal, best_streak")
        .eq("company_id", companyId!)
        .order("streak_semanal", { ascending: false })
        .order("best_streak", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (!progs || progs.length === 0) return [];
      const userIds = progs.map((p) => p.user_id);
      const { data: colabs } = await supabase
        .from("colaboradores")
        .select("user_id, full_name")
        .in("user_id", userIds);
      const nameMap = new Map((colabs ?? []).map((c) => [c.user_id, c.full_name]));
      return progs.map((p) => ({
        user_id: p.user_id,
        streak_semanal: p.streak_semanal,
        best_streak: p.best_streak,
        nome: nameMap.get(p.user_id) ?? "Colaborador",
      }));
    },
  });
}

export function TopStreaksCard() {
  const companyId = useEffectiveCompanyId();
  const { data, isLoading } = useTopStreaks(companyId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Top Streaks — Cuidar+
        </CardTitle>
        <CardDescription>
          Colaboradores com maior sequência semanal de respostas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Ainda não há sequências registradas.
          </p>
        ) : (
          <ol className="space-y-2">
            {data.map((row, idx) => (
              <li
                key={row.user_id}
                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-semibold text-muted-foreground w-5">
                    {idx + 1}º
                  </span>
                  <span className="truncate font-medium">{row.nome}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {row.streak_semanal}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    {row.best_streak}
                  </Badge>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
