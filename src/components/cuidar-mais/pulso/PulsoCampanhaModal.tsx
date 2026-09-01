import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, ArrowRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSubmitCampaignResponses,
  ActiveCampaign,
  EMOJI_SCALE,
} from "@/hooks/usePulseCampaigns";

interface PulsoCampanhaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: ActiveCampaign;
}

export function PulsoCampanhaModal({
  open,
  onOpenChange,
  campaign,
}: PulsoCampanhaModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState("");

  const submitResponses = useSubmitCampaignResponses();

  const questions = campaign.questions || [];
  const totalSteps = questions.length + 1; // +1 for comentário step
  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const isComentarioStep = currentStep === questions.length;

  const progress = ((currentStep + 1) / totalSteps) * 100;

  const canProceed = () => {
    if (isComentarioStep) return true;
    if (!currentQuestion) return false;
    if (!currentQuestion.obrigatoria) return true;
    return !!responses[currentQuestion.id];
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const formattedResponses = Object.entries(responses).map(([questionId, resposta]) => ({
      question_id: questionId,
      resposta,
    }));

    await submitResponses.mutateAsync({
      campaignId: campaign.campaign_id,
      responses: formattedResponses,
      comentario: comentario.trim() || undefined,
    });

    onOpenChange(false);
    setCurrentStep(0);
    setResponses({});
    setComentario("");
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.tipo) {
      case 'escala_0_5':
        return (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {EMOJI_SCALE.map((item) => (
              <Button
                key={item.score}
                variant="outline"
                className={cn(
                  "flex flex-col items-center justify-center h-auto py-4 px-2 transition-all duration-200",
                  item.color,
                  "hover:scale-105 hover:shadow-md border-2",
                  responses[currentQuestion.id] === String(item.score) &&
                    "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() =>
                  setResponses({ ...responses, [currentQuestion.id]: String(item.score) })
                }
              >
                <span className="text-3xl">{item.emoji}</span>
                <span className={cn("text-xs mt-1 font-medium", item.textColor)}>
                  {item.label}
                </span>
              </Button>
            ))}
          </div>
        );

      case 'sim_nao':
        return (
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "w-32 h-16 text-lg",
                responses[currentQuestion.id] === 'sim' &&
                  "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500"
              )}
              onClick={() =>
                setResponses({ ...responses, [currentQuestion.id]: 'sim' })
              }
            >
              ✓ Sim
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "w-32 h-16 text-lg",
                responses[currentQuestion.id] === 'nao' &&
                  "bg-red-100 border-red-500 text-red-700 ring-2 ring-red-500"
              )}
              onClick={() =>
                setResponses({ ...responses, [currentQuestion.id]: 'nao' })
              }
            >
              ✗ Não
            </Button>
          </div>
        );

      case 'texto_livre':
        return (
          <Textarea
            placeholder="Digite sua resposta..."
            value={responses[currentQuestion.id] || ""}
            onChange={(e) =>
              setResponses({ ...responses, [currentQuestion.id]: e.target.value })
            }
            rows={4}
            className="resize-none"
          />
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign.titulo}</DialogTitle>
          <DialogDescription>
            {isComentarioStep
              ? "Comentário final (opcional)"
              : `Pergunta ${currentStep + 1} de ${questions.length}`}
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <Progress value={progress} className="h-2" />

        <div className="py-6 min-h-[200px]">
          {isComentarioStep ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comentario">
                  Quer nos contar mais? <span className="text-muted-foreground">(Opcional)</span>
                </Label>
                <Textarea
                  id="comentario"
                  placeholder="Compartilhe pensamentos adicionais..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {comentario.length}/500 caracteres
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-lg font-medium text-center">
                {currentQuestion?.pergunta}
                {currentQuestion?.obrigatoria && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </p>
              {renderQuestion()}
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between gap-2">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0 || submitResponses.isPending}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          {isComentarioStep ? (
            <Button onClick={handleSubmit} disabled={submitResponses.isPending}>
              {submitResponses.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Respostas
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              {isLastQuestion ? "Finalizar" : "Próxima"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
