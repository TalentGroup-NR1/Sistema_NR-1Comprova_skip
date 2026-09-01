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
import { useSubmitPulse, EMOJI_SCALE } from "@/hooks/usePulseSurvey";
import { Loader2 } from "lucide-react";

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
  const submitPulse = useSubmitPulse();

  const emojiData = selectedScore !== null 
    ? EMOJI_SCALE.find(e => e.score === selectedScore) 
    : null;

  const handleSubmit = async () => {
    if (selectedScore === null) return;

    await submitPulse.mutateAsync({
      colaboradorId,
      companyId,
      score: selectedScore,
      comment: comment.trim() || undefined,
    });

    setComment("");
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

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comment">
              Quer nos contar o motivo? <span className="text-muted-foreground">(Opcional)</span>
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
            disabled={submitPulse.isPending}
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
