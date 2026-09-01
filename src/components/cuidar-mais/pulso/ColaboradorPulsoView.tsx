import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import { PulsoSemanaCard } from "./PulsoSemanaCard";
import { useMyPulseHistory, EMOJI_SCALE } from "@/hooks/usePulseSurvey";

export function ColaboradorPulsoView() {
  const { data: history, isLoading } = useMyPulseHistory();

  const getEmojiForScore = (score: number) => {
    return EMOJI_SCALE.find(e => e.score === score) || EMOJI_SCALE[2];
  };

  return (
    <div className="space-y-6">
      {/* Card principal de resposta */}
      <PulsoSemanaCard />

      {/* Histórico de respostas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Minhas Respostas Anteriores
          </CardTitle>
          <CardDescription>
            Veja como você se sentiu nas últimas semanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : !history || history.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Você ainda não respondeu nenhum pulso.
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((pulse, index) => {
                const emojiData = getEmojiForScore(pulse.score);
                return (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{emojiData.emoji}</span>
                      <div>
                        <p className="font-medium">{emojiData.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Semana {pulse.week_number}/{pulse.year}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-medium ${emojiData.textColor}`}>
                      {pulse.score}/5
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
