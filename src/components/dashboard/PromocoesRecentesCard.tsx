import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePromocoesRecentes } from "@/hooks/usePromocoes";

interface PromocoesRecentesCardProps {
  delay?: number;
}

export function PromocoesRecentesCard({ delay = 0 }: PromocoesRecentesCardProps) {
  const { data: promocoes, isLoading } = usePromocoesRecentes(5);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <Card className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Promoções Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Promoções Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!promocoes || promocoes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhuma promoção registrada ainda
          </div>
        ) : (
          <div className="space-y-4">
            {promocoes.map((promocao) => {
              const variacao =
                ((promocao.salario_novo - promocao.salario_anterior) /
                  promocao.salario_anterior) *
                100;
              return (
                <div key={promocao.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={promocao.colaborador?.avatar_url || ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(promocao.colaborador?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {promocao.colaborador?.full_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(promocao.data_promocao), "dd/MM", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {promocao.cargo_anterior}{" "}
                      <span className="text-primary">→</span>{" "}
                      {promocao.cargo_novo}
                    </div>
                    <Badge
                      variant="outline"
                      className="mt-1 text-xs text-green-600 border-green-600"
                    >
                      +{variacao.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              );
            })}
            <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
              <Link to="/relatorios?tab=promocoes">
                Ver todas <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
