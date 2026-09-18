import { useEffect, useState, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, ArrowLeft, ArrowRight, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useActivePulseCampaign,
  useSubmitCampaignResponses,
  EMOJI_SCALE,
  type ActiveCampaign,
} from "@/hooks/usePulseCampaigns";

const BLOCK_HOUR = 13;

export function PulseBlockerModal() {
  const { role } = useAuth();
  const { data: activeCampaign, isLoading } = useActivePulseCampaign();

  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  // Reavalia a hora local a cada 60s para acionar o blocker às 13:00 sem reload.
  useEffect(() => {
    const id = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const isEmployeeRole = role === "colaborador" || role === "gestor_departamento";

  if (isLoading) return null;
  if (!isEmployeeRole) return null;
  if (!activeCampaign) return null;
  if (activeCampaign.has_responded) return null;
  if (currentHour < BLOCK_HOUR) return null;

  return <BlockerDialog campaign={activeCampaign} />;
}

interface BlockerDialogProps {
  campaign: ActiveCampaign;
}

function BlockerDialog({ campaign }: BlockerDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState("");
  const [esfera, setEsfera] = useState<"pessoal" | "trabalho" | null>(null);
  const submitResponses = useSubmitCampaignResponses();

  const questions = campaign.questions || [];
  const totalSteps = questions.length + 1;
  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const isComentarioStep = currentStep === questions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const isNegativeScore = useMemo(() =>
    questions.some((q) => {
      if (q.tipo !== "escala_0_5") return false;
      const raw = responses[q.id];
      if (raw === undefined || raw === "") return false;
      return Number(raw) <= 2;
    }),
    [questions, responses]
  );

  const canProceed = () => {
    if (isComentarioStep) {
      if (isNegativeScore && esfera === null) return false;
      return true;
    }
    if (!currentQuestion) return false;
    if (!currentQuestion.obrigatoria) return true;
    return !!responses[currentQuestion.id];
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
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
      esfera: isNegativeScore ? esfera : null,
    });
    // Sucesso → invalida `active-pulse-campaign` (no hook) → has_responded=true → modal desmonta.
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.tipo) {
      case "escala_0_5":
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
                    "ring-2 ring-primary ring-offset-2",
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

      case "sim_nao":
        return (
          <div className="flex gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "w-32 h-16 text-lg",
                responses[currentQuestion.id] === "sim" &&
                  "bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500",
              )}
              onClick={() => setResponses({ ...responses, [currentQuestion.id]: "sim" })}
            >
              ✓ Sim
            </Button>
            <Button
              variant="outline"
              size="lg"
              className={cn(
                "w-32 h-16 text-lg",
                responses[currentQuestion.id] === "nao" &&
                  "bg-red-100 border-red-500 text-red-700 ring-2 ring-red-500",
              )}
              onClick={() => setResponses({ ...responses, [currentQuestion.id]: "nao" })}
            >
              ✗ Não
            </Button>
          </div>
        );

      case "texto_livre":
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

  // Aberto permanentemente. Sem onOpenChange. Sem botão de fechar.
  // ESC, clique no overlay e interações externas são interceptados.
  return (
    <DialogPrimitive.Root open modal>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[100] bg-foreground/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed left-[50%] top-[50%] z-[101] grid w-full max-w-xl translate-x-[-50%] translate-y-[-50%] gap-4 border-2 border-primary/40 bg-card p-6 shadow-2xl rounded-xl max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="flex flex-col gap-2 pb-2 border-b border-border">
            <div className="flex items-center gap-2 text-primary">
              <Lock className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Resposta obrigatória
              </span>
            </div>
            <DialogPrimitive.Title className="text-lg font-semibold leading-none tracking-tight">
              {campaign.titulo}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              {isComentarioStep
                ? "Comentário final (opcional)"
                : `Pergunta ${currentStep + 1} de ${questions.length} — responda para continuar usando o sistema.`}
            </DialogPrimitive.Description>
          </div>

          <Progress value={progress} className="h-2" />

          <div className="py-4 min-h-[200px]">
            {isComentarioStep ? (
              <div className="space-y-6">
                {(() => {
                  console.log(`\n=== RENDER LOG [${campaign.titulo} - BLOCKER] ===`);
                  console.log(`(a) isComentarioStep:`, isComentarioStep);
                  console.log(`(b) isNegativeScore:`, isNegativeScore);
                  console.log(`(d) responses:`, JSON.stringify(responses));
                  console.log(`(d) esfera:`, esfera);
                  return null;
                })()}

                {isNegativeScore && (
                  (() => {
                    console.log(`(c) BLOCO {isNegativeScore && (...)} FOI ENTRADO!`);
                    return null;
                  })() || (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">
                      Em que esfera isso acontece? <span className="text-destructive">*</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setEsfera("pessoal")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          esfera === "pessoal"
                            ? "border-violet-500 bg-violet-50 text-violet-700 ring-2 ring-violet-300"
                            : "border-border bg-background text-muted-foreground hover:border-violet-300 hover:bg-violet-50/50"
                        )}
                      >
                        É algo pessoal?
                      </button>
                      <button
                        type="button"
                        onClick={() => setEsfera("trabalho")}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-4 text-sm font-medium transition-all duration-200 hover:scale-[1.02] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          esfera === "trabalho"
                            ? "border-amber-500 bg-amber-50 text-amber-700 ring-2 ring-amber-300"
                            : "border-border bg-background text-muted-foreground hover:border-amber-300 hover:bg-amber-50/50"
                        )}
                      >
                        É algo com o trabalho/empresa?
                      </button>
                    </div>
                  </div>
                  )
                )}

                <div className="space-y-2">
                  <Label htmlFor="comentario-blocker">
                    Quer nos contar mais?{" "}
                    <span className="text-muted-foreground">(Opcional)</span>
                  </Label>
                <Textarea
                  id="comentario-blocker"
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

          <div className="flex flex-row justify-between gap-2 pt-4 border-t border-border">
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
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
