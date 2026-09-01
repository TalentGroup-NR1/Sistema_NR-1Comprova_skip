import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, CheckCircle2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, isToday, isFriday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useActivePulseCampaign, EMOJI_SCALE } from "@/hooks/usePulseCampaigns";
import { PulsoCampanhaModal } from "./PulsoCampanhaModal";

export function PulsoCampanhaCard() {
  const { data: campaign, isLoading } = useActivePulseCampaign();
  const [modalOpen, setModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-2">
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-16 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  // Sem campanha ativa
  if (!campaign) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-5 w-5" />
            Pulso da Semana
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Nenhuma pesquisa ativa no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Já respondeu
  if (campaign.has_responded) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            {campaign.titulo}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-4xl">✅</span>
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                Você já respondeu esta pesquisa!
              </p>
              <p className="text-sm text-muted-foreground">
                Obrigado por compartilhar seu sentimento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Campanha disponível para responder
  const today = new Date();
  const isTodayFriday = isFriday(today);
  const questionsCount = campaign.questions?.length || 0;

  return (
    <>
      <Card
        className={cn(
          "transition-all duration-300 cursor-pointer hover:shadow-lg",
          isTodayFriday
            ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30 shadow-lg"
            : "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20"
        )}
        onClick={() => setModalOpen(true)}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles
              className={cn("h-5 w-5", isTodayFriday && "text-primary animate-pulse")}
            />
            {campaign.titulo}
            {isTodayFriday && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                Disponível hoje!
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.descricao && (
            <p className="text-sm text-muted-foreground">{campaign.descricao}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <span>{questionsCount} pergunta{questionsCount !== 1 ? 's' : ''}</span>
              <span className="mx-2">•</span>
              <span>
                Até {format(parseISO(campaign.data_fim), "dd/MM", { locale: ptBR })}
              </span>
            </div>
            <Button size="sm">Responder Agora</Button>
          </div>

          {/* Preview de emojis */}
          <div className="flex justify-center gap-2">
            {EMOJI_SCALE.map((item) => (
              <span key={item.score} className="text-2xl opacity-60 hover:opacity-100 transition-opacity">
                {item.emoji}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <PulsoCampanhaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        campaign={campaign}
      />
    </>
  );
}
