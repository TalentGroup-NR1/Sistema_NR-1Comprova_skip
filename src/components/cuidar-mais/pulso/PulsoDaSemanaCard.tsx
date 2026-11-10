import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smile, Loader2, CheckCircle, ArrowRight, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivePulseCampaign, EMOJI_SCALE } from "@/hooks/usePulseCampaigns";
import { Link } from "react-router-dom";

export function PulsoDaSemanaCard() {
  const { data: activeCampaign, isLoading } = useActivePulseCampaign();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Se não houver campanha ativa
  if (!activeCampaign) {
    return (
      <Card className="border-pink-200 dark:border-pink-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Smile className="h-5 w-5 text-pink-500" />
            Pulso da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Nenhuma pesquisa ativa</p>
              <p className="text-sm text-muted-foreground">
                Aguarde a próxima pesquisa de pulso
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se já respondeu
  if (activeCampaign.has_responded) {
    return (
      <Card className="border-green-200 dark:border-green-900/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Smile className="h-5 w-5 text-green-500" />
            Pulso da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="flex-1">
              <p className="font-medium text-foreground">Resposta enviada!</p>
              <p className="text-sm text-muted-foreground">
                Obrigado por compartilhar como você está
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Campanha ativa - mostrar emojis para resposta rápida
  return (
    <Card className="border-pink-200 dark:border-pink-900/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Smile className="h-5 w-5 text-pink-500" />
          Pulso da Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg">
          <p className="text-sm font-medium text-foreground mb-2">
            Como você está se sentindo hoje?
          </p>
          <div className="flex justify-center gap-2">
            {EMOJI_SCALE.map((item) => (
              <div
                key={item.score}
                className="text-2xl cursor-pointer hover:scale-110 transition-transform"
                title={item.label}
              >
                {item.emoji}
              </div>
            ))}
          </div>
        </div>
        <Button asChild className="w-full" variant="outline">
          <Link to="/cuidar-mais" className="flex items-center gap-2">
            Responder agora
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
