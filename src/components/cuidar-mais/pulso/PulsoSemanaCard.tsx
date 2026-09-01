import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  useMyPulseStatus, 
  EMOJI_SCALE, 
  getCurrentWeekInfo 
} from "@/hooks/usePulseSurvey";
import { PulsoSemanaModal } from "./PulsoSemanaModal";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function PulsoSemanaCard() {
  const { data: pulseStatus, isLoading } = useMyPulseStatus();
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const { isFriday } = getCurrentWeekInfo();

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

  // Não mostrar se não for colaborador
  if (!pulseStatus?.colaboradorId) {
    return null;
  }

  // Já respondeu
  if (pulseStatus.hasResponded && pulseStatus.lastResponse) {
    const emojiData = EMOJI_SCALE.find(e => e.score === pulseStatus.lastResponse?.score);
    
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-5 w-5" />
            Pulso da Semana Registrado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{emojiData?.emoji}</span>
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                {emojiData?.label}
              </p>
              <p className="text-sm text-muted-foreground">
                Obrigado por compartilhar! Próximo check-in: próxima semana.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Aguardando resposta
  return (
    <>
      <Card className={cn(
        "transition-all duration-300",
        isFriday 
          ? "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30 shadow-lg" 
          : "bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className={cn(
              "h-5 w-5",
              isFriday && "text-primary animate-pulse"
            )} />
            Pulso da Semana
            {isFriday && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                Disponível hoje!
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Como foi sua semana de trabalho?
          </p>
          
          <div className="grid grid-cols-6 gap-2">
            {EMOJI_SCALE.map((item) => (
              <Button
                key={item.score}
                variant="outline"
                className={cn(
                  "flex flex-col items-center justify-center h-auto py-3 px-2 transition-all duration-200",
                  item.color,
                  "hover:scale-110 hover:shadow-md border-2"
                )}
                onClick={() => {
                  setSelectedScore(item.score);
                  setModalOpen(true);
                }}
              >
                <span className="text-2xl sm:text-3xl">{item.emoji}</span>
                <span className={cn("text-[10px] sm:text-xs mt-1 font-medium", item.textColor)}>
                  {item.label}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <PulsoSemanaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selectedScore={selectedScore}
        colaboradorId={pulseStatus.colaboradorId}
        companyId={pulseStatus.companyId}
      />
    </>
  );
}
