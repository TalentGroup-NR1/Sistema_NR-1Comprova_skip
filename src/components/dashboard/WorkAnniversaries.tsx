import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Award, Trophy, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AniversarianteGlobal } from "@/hooks/useAniversariantesGlobais";

interface WorkAnniversariesProps {
  aniversarios: AniversarianteGlobal[];
  isLoading?: boolean;
  delay?: number;
}

export function WorkAnniversaries({ aniversarios, isLoading, delay = 0 }: WorkAnniversariesProps) {
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const todayDay = new Date().getDate();

  const getMilestoneStyle = (anos: number) => {
    if (anos >= 20) return { bg: "bg-amber-500/20", text: "text-amber-600", border: "border-amber-500/30" };
    if (anos >= 10) return { bg: "bg-primary/20", text: "text-primary", border: "border-primary/30" };
    if (anos >= 5) return { bg: "bg-info/20", text: "text-info", border: "border-info/30" };
    return { bg: "bg-success/20", text: "text-success", border: "border-success/30" };
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Aniversários de Empresa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aniversarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum aniversário de empresa este mês</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {aniversarios.map((item) => {
              const anos = item.anos_empresa ?? 0;
              const style = getMilestoneStyle(anos);
              const isToday = item.dia === todayDay;
              return (
                <div
                  key={`${item.id}-emp`}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors ${
                    isToday ? "bg-primary/5 ring-1 ring-primary/20" : ""
                  }`}
                >
                  <Avatar className={`h-10 w-10 border-2 ${style.border}`}>
                    <AvatarImage src={item.avatar_url ?? undefined} alt={item.nome} />
                    <AvatarFallback className={`${style.bg} ${style.text} font-semibold text-sm`}>
                      {getInitials(item.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{item.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      🚀 Dia {item.dia} - {anos} {anos === 1 ? "ano" : "anos"}
                      {item.cliente_alocado ? ` | ${item.cliente_alocado}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={`${style.bg} ${style.text} ${style.border} text-xs font-semibold`}
                    >
                      {anos} {anos === 1 ? "ano" : "anos"}
                    </Badge>
                    {isToday && (
                      <span className="text-xs text-primary font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Hoje
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
