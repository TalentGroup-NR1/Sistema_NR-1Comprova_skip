import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Cake, PartyPopper, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AniversarianteGlobal } from "@/hooks/useAniversariantesGlobais";

interface BirthdaysListProps {
  aniversariantes: AniversarianteGlobal[];
  isLoading?: boolean;
  delay?: number;
}

export function BirthdaysList({ aniversariantes, isLoading, delay = 0 }: BirthdaysListProps) {
  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const todayDay = new Date().getDate();

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
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
          <Cake className="h-5 w-5 text-accent" />
          Aniversariantes do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aniversariantes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <PartyPopper className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum aniversariante este mês</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {aniversariantes.map((colab) => {
              const isToday = colab.dia === todayDay;
              return (
                <div
                  key={`${colab.id}-nasc`}
                  className={`flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors ${
                    isToday ? "bg-accent/5 ring-1 ring-accent/20" : ""
                  }`}
                >
                  <Avatar className="h-10 w-10 border-2 border-accent/30">
                    <AvatarImage src={colab.avatar_url ?? undefined} alt={colab.nome} />
                    <AvatarFallback className="bg-accent/10 text-accent font-semibold text-sm">
                      {getInitials(colab.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{colab.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      🎂 Dia {colab.dia}
                      {colab.cliente_alocado ? ` | ${colab.cliente_alocado}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className="bg-accent/10 border-accent/20 text-xs font-semibold text-foreground"
                    >
                      Dia {colab.dia}
                    </Badge>
                    {isToday && (
                      <span className="text-xs text-accent font-medium flex items-center gap-1">
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
