import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AdminQuizPergunta, useCreateQuizPergunta, useUpdateQuizPergunta } from "@/hooks/useQuizAdmin";
import { Plus, Trash2, Loader2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface QuizPerguntaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinamentoId: string;
  perguntaToEdit?: AdminQuizPergunta | null;
  proximaOrdem: number;
}

interface AlternativaItem {
  id: string;
  texto: string;
}

export function QuizPerguntaDialog({
  open,
  onOpenChange,
  treinamentoId,
  perguntaToEdit,
  proximaOrdem,
}: QuizPerguntaDialogProps) {
  const createPergunta = useCreateQuizPergunta();
  const updatePergunta = useUpdateQuizPergunta();

  const [enunciado, setEnunciado] = useState("");
  const [alternativas, setAlternativas] = useState<AlternativaItem[]>([
    { id: "A", texto: "" },
    { id: "B", texto: "" },
  ]);
  const [corretaId, setCorretaId] = useState<string>("A");
  const [explicacao, setExplicacao] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      if (perguntaToEdit) {
        setEnunciado(perguntaToEdit.enunciado || "");
        setExplicacao(perguntaToEdit.explicacao || "");

        // Normalizar alternativas do JSONB
        const rawAlts = perguntaToEdit.alternativas || [];
        const parsedAlts: AlternativaItem[] = rawAlts.map((alt: any, idx: number) => {
          const letter = String.fromCharCode(65 + idx);
          if (typeof alt === "string") {
            return { id: letter, texto: alt };
          }
          return {
            id: alt.id || alt.letra || letter,
            texto: alt.texto || alt.text || "",
          };
        });

        if (parsedAlts.length < 2) {
          while (parsedAlts.length < 2) {
            parsedAlts.push({
              id: String.fromCharCode(65 + parsedAlts.length),
              texto: "",
            });
          }
        }

        setAlternativas(parsedAlts);

        // Identificar resposta_correta
        const found = parsedAlts.find(
          (a) => a.id === perguntaToEdit.resposta_correta || a.texto === perguntaToEdit.resposta_correta
        );
        setCorretaId(found ? found.id : parsedAlts[0]?.id || "A");
      } else {
        setEnunciado("");
        setExplicacao("");
        setAlternativas([
          { id: "A", texto: "" },
          { id: "B", texto: "" },
          { id: "C", texto: "" },
        ]);
        setCorretaId("A");
      }
      setErros({});
    }
  }, [open, perguntaToEdit]);

  const handleAddAlternativa = () => {
    if (alternativas.length >= 6) {
      toast.error("O limite máximo é de 6 alternativas por questão.");
      return;
    }
    const nextLetter = String.fromCharCode(65 + alternativas.length);
    setAlternativas((prev) => [...prev, { id: nextLetter, texto: "" }]);
  };

  const handleRemoveAlternativa = (index: number) => {
    if (alternativas.length <= 2) {
      toast.error("A questão deve ter no mínimo 2 alternativas.");
      return;
    }
    const removedId = alternativas[index].id;
    const nextList = alternativas.filter((_, idx) => idx !== index);

    // Renumerar letras consecutivas A, B, C...
    const reindexed = nextList.map((item, idx) => ({
      id: String.fromCharCode(65 + idx),
      texto: item.texto,
    }));

    setAlternativas(reindexed);
    if (corretaId === removedId || !reindexed.some((a) => a.id === corretaId)) {
      setCorretaId(reindexed[0].id);
    }
  };

  const handleUpdateTexto = (index: number, texto: string) => {
    setAlternativas((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], texto };
      return next;
    });
    if (erros.alternativas) {
      setErros((prev) => ({ ...prev, alternativas: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const novosErros: Record<string, string> = {};

    const trimmedEnunciado = enunciado.trim();
    if (trimmedEnunciado.length < 5 || trimmedEnunciado.length > 1000) {
      novosErros.enunciado = "O enunciado deve ter entre 5 e 1000 caracteres.";
    }

    if (alternativas.length < 2 || alternativas.length > 6) {
      novosErros.alternativas = "A questão deve conter entre 2 e 6 alternativas.";
    }

    const vazias = alternativas.some((a) => !a.texto.trim());
    if (vazias) {
      novosErros.alternativas = "Todas as alternativas devem ter texto preenchido.";
    }

    if (!corretaId) {
      novosErros.correta = "Selecione a alternativa correta.";
    }

    if (explicacao && explicacao.length > 2000) {
      novosErros.explicacao = "A explicação não pode exceder 2000 caracteres.";
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    // Obter texto ou letra da correta para salvar
    const corretaObj = alternativas.find((a) => a.id === corretaId);
    const respostaCorretaSalvar = corretaObj ? corretaObj.id : "A";

    const payload = {
      treinamento_id: treinamentoId,
      enunciado: trimmedEnunciado,
      alternativas: alternativas.map((a) => ({ id: a.id, texto: a.texto.trim() })),
      resposta_correta: respostaCorretaSalvar,
      explicacao: explicacao.trim() || null,
      ordem: perguntaToEdit?.ordem ?? proximaOrdem,
    };

    if (perguntaToEdit) {
      await updatePergunta.mutateAsync({
        id: perguntaToEdit.id,
        ...payload,
      });
    } else {
      await createPergunta.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isPending = createPergunta.isPending || updatePergunta.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{perguntaToEdit ? "Editar Questão" : "Nova Questão da Avaliação"}</DialogTitle>
            <DialogDescription>
              Cadastre o enunciado, alternativas (mín. 2, máx. 6) e indique o gabarito oficial.
            </DialogDescription>
          </DialogHeader>

          {/* Enunciado */}
          <div className="space-y-1.5">
            <Label htmlFor="pergunta-enunciado">
              Enunciado da Questão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="pergunta-enunciado"
              value={enunciado}
              onChange={(e) => {
                setEnunciado(e.target.value);
                if (erros.enunciado) setErros((prev) => ({ ...prev, enunciado: "" }));
              }}
              placeholder="Ex.: Qual é a principal responsabilidade do colaborador segundo a NR-1?"
              rows={3}
              maxLength={1000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {erros.enunciado ? (
                <span className="text-destructive font-medium">{erros.enunciado}</span>
              ) : (
                <span>Mínimo 5 caracteres</span>
              )}
              <span>{enunciado.length}/1000</span>
            </div>
          </div>

          {/* Alternativas */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Alternativas</Label>
                <p className="text-xs text-muted-foreground">
                  Marque o botão de opção ao lado da alternativa correta.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAlternativa}
                disabled={alternativas.length >= 6}
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar Alternativa ({alternativas.length}/6)
              </Button>
            </div>

            {erros.alternativas && (
              <p className="text-xs text-destructive font-medium">{erros.alternativas}</p>
            )}

            <RadioGroup value={corretaId} onValueChange={setCorretaId} className="space-y-2">
              {alternativas.map((alt, idx) => (
                <div
                  key={alt.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                    corretaId === alt.id
                      ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem
                    value={alt.id}
                    id={`radio-${alt.id}`}
                    aria-label={`Marcar alternativa ${alt.id} como correta`}
                  />
                  <span className="font-semibold text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                    {alt.id}
                  </span>
                  <Input
                    value={alt.texto}
                    onChange={(e) => handleUpdateTexto(idx, e.target.value)}
                    placeholder={`Texto da alternativa ${alt.id}...`}
                    className="flex-1 h-9 text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveAlternativa(idx)}
                    disabled={alternativas.length <= 2}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    title="Remover alternativa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Explicação Pedagógica */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="pergunta-explicacao">Explicação Pedagógica (opcional)</Label>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <Textarea
              id="pergunta-explicacao"
              value={explicacao}
              onChange={(e) => {
                setExplicacao(e.target.value);
                if (erros.explicacao) setErros((prev) => ({ ...prev, explicacao: "" }));
              }}
              placeholder="Esta justificativa será exibida no gabarito ao colaborador após a submissão da avaliação..."
              rows={2}
              maxLength={2000}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {erros.explicacao && (
                <span className="text-destructive font-medium">{erros.explicacao}</span>
              )}
              <span>{explicacao.length}/2000</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {perguntaToEdit ? "Salvar alterações" : "Adicionar questão"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
