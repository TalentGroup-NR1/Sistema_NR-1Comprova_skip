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
import { Heart, Briefcase, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubmitPulse, EMOJI_SCALE } from "@/hooks/usePulseSurvey";

interface PulsoSemanaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedScore: number | null;
  colaboradorId: string;
  companyId: string;
}

export function PulsoSemanaModal({
  open,
  onOpenChange,
  selectedScore,
  colaboradorId,
  companyId,
}: PulsoSemanaModalProps) {
  const [comment, setComment] = useState("");
  const [esfera, setEsfera] = useState<"pessoal" | "trabalho" | null>(null);
  const submitPulse = useSubmitPulse();

  const emojiData =
    selectedScore !== null ? EMOJI_SCALE.find((e) => e.score === selectedScore) : null;

  // Score negativo: 0 (Muito Mal), 1 (Mal), 2 (Regular)
  const isNegativeScore = selectedScore !== null && selectedScore <= 2;

  // Envio bloqueado se score negativo e esfera não escolhida
  const canSubmit = !isNegativeScore || esfera !== null;

  const handleSubmit = async () => {
    if (selectedScore === null) return;

    await submitPulse.mutateAsync({
      colaboradorId,
      companyId,
      score: selectedScore,
      comment: comment.trim() || undefined,
      esfera: isNegativeScore ? esfera : null,
    });

    setComment("");
    setEsfera(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-4xl">{emojiData?.emoji}</span>
            <span>Você selecionou: {emojiData?.label}</span>
          </DialogTitle>
          <DialogDescription>
            Sua resposta é anônima para a gestão. Apenas você pode ver seu histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Flag de esfera — exibida apenas quando score <= 2 */}
          {isNegativeScore && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                Em que esfera isso acontece?{" "}
                <span className="text-destructive">*</span>
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
                  <Heart
                    className={cn(
                      "h-6 w-6 transition-colors",
                      esfera === "pessoal" ? "text-violet-500" : "text-muted-foreground"
                    )}
                  />
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
                  <Briefcase
                    className={cn(
                      "h-6 w-6 transition-colors",
                      esfera === "trabalho" ? "text-amber-500" : "text-muted-foreground"
                    )}
                  />
                  É algo com o trabalho/empresa?
                </button>
              </div>
              {esfera === null && (
                <p className="text-xs text-muted-foreground">
                  Selecione uma opção para continuar.
                </p>
              )}
            </div>
          )}

          {/* Comentário — sempre presente */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              Quer nos contar o motivo?{" "}
              <span className="text-muted-foreground">(Opcional)</span>
            </Label>
            <Textarea
              id="comment"
              placeholder="Compartilhe o que motivou esse sentimento..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitPulse.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitPulse.isPending}
            className="min-w-[140px]"
          >
            {submitPulse.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Resposta"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
