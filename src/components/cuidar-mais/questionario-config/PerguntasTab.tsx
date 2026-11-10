import { useState, useMemo } from "react";
import { Plus, FileText, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useQuestionarioCuidarPlus,
  useCreatePerguntaCuidarPlus,
  useUpdatePerguntaCuidarPlus,
  useDeletePerguntaCuidarPlus,
  PerguntaCuidarPlus,
} from "@/hooks/useCuidarMaisQuestionarios";
import { useDimensoesQuestionario } from "@/hooks/useDimensoesCuidarPlus";
import { DIMENSOES_OPTIONS } from "@/lib/cuidarMaisDimensoes";
import { BulkAddPerguntasDialog, BulkPergunta } from "../questionario-editor/BulkAddPerguntasDialog";
import { PerguntaCardMatriz, LocalPerguntaMatriz } from "../questionario-editor/PerguntaCardMatriz";
import { PerguntaCardPadrao } from "./PerguntaCardPadrao";

interface PerguntasTabProps {
  questionarioId: string;
  modeloAnalise: 'PADRAO' | 'MATRIZ_RISCOS';
  onRefetch?: () => void;
}

export function PerguntasTab({ questionarioId, modeloAnalise, onRefetch }: PerguntasTabProps) {
  const [localPerguntas, setLocalPerguntas] = useState<LocalPerguntaMatriz[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: questionario, isLoading, refetch } = useQuestionarioCuidarPlus(questionarioId);
  const { data: dimensoes = [] } = useDimensoesQuestionario(questionarioId);
  
  const createPergunta = useCreatePerguntaCuidarPlus();
  const updatePergunta = useUpdatePerguntaCuidarPlus();
  const deletePergunta = useDeletePerguntaCuidarPlus();

  const isMatrizMode = modeloAnalise === 'MATRIZ_RISCOS';

  // Debug logging
  console.log('[PerguntasTab] questionarioId:', questionarioId);
  console.log('[PerguntasTab] dimensões:', dimensoes.length);
  console.log('[PerguntasTab] perguntas do DB:', questionario?.perguntas_cuidar_plus?.length || 0);
  console.log('[PerguntasTab] perguntas locais:', localPerguntas.length);

  // Initialize local state from fetched data
  useMemo(() => {
    if (questionario?.perguntas_cuidar_plus && !initialized) {
      const mapped: LocalPerguntaMatriz[] = questionario.perguntas_cuidar_plus.map((p: PerguntaCuidarPlus) => ({
        id: p.id,
        pergunta_texto: p.pergunta_texto,
        tipo_pergunta: p.tipo_pergunta,
        order_index: p.order_index,
        dimensao_questionario_id: p.dimensao_questionario_id,
        dimensao: p.dimensao,
        is_invertida: p.is_invertida,
        bloco: p.bloco,
        peso: p.peso,
      }));
      setLocalPerguntas(mapped);
      setInitialized(true);
      setHasUnsavedChanges(false);
    }
  }, [questionario?.perguntas_cuidar_plus, initialized]);

  // For PADRAO mode bulk add, use fixed dimensions
  const dimensoesParaBulkAdd = useMemo(() => {
    if (isMatrizMode) {
      return dimensoes;
    }
    return DIMENSOES_OPTIONS.map(d => ({
      id: d.value,
      questionario_id: questionarioId,
      codigo: d.value,
      titulo: d.label,
      descricao: d.descricao,
      order_index: 0,
      created_at: '',
      updated_at: '',
    }));
  }, [isMatrizMode, dimensoes, questionarioId]);

  const canBulkAdd = dimensoesParaBulkAdd.length > 0;

  const handleAddPergunta = () => {
    const newOrderIndex = localPerguntas.length > 0 
      ? Math.max(...localPerguntas.map(p => p.order_index)) + 1 
      : 0;
    
    setLocalPerguntas([
      ...localPerguntas,
      {
        pergunta_texto: "",
        tipo_pergunta: 'LIKERT_5',
        order_index: newOrderIndex,
        dimensao_questionario_id: null,
        dimensao: null,
        is_invertida: false,
        bloco: null,
        peso: 1,
        isNew: true,
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const handleBulkAdd = (novasPerguntas: BulkPergunta[]) => {
    const startIndex = localPerguntas.length > 0 
      ? Math.max(...localPerguntas.map(p => p.order_index)) + 1 
      : 0;

    const perguntasComIndice: LocalPerguntaMatriz[] = novasPerguntas.map((p, i) => ({
      ...p,
      order_index: startIndex + i,
      isNew: true,
    }));

    setLocalPerguntas([...localPerguntas, ...perguntasComIndice]);
    setHasUnsavedChanges(true);
    toast.success(`${novasPerguntas.length} pergunta(s) adicionada(s). Clique em Salvar para persistir.`);
  };

  const handleUpdatePergunta = (index: number, field: keyof LocalPerguntaMatriz, value: unknown) => {
    const updated = [...localPerguntas];
    updated[index] = {
      ...updated[index],
      [field]: value,
      isModified: !updated[index].isNew,
    };
    setLocalPerguntas(updated);
    setHasUnsavedChanges(true);
  };

  const handleRemovePergunta = async (index: number) => {
    const pergunta = localPerguntas[index];
    
    // If it's a saved pergunta, delete from DB
    if (pergunta.id) {
      try {
        await deletePergunta.mutateAsync({ id: pergunta.id, questionario_id: questionarioId });
        toast.success("Pergunta removida");
      } catch (error: any) {
        toast.error("Erro ao remover pergunta: " + error.message);
        return;
      }
    }
    
    setLocalPerguntas(localPerguntas.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...localPerguntas];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((p, i) => {
      p.order_index = i;
      if (!p.isNew) p.isModified = true;
    });
    setLocalPerguntas(updated);
    setHasUnsavedChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === localPerguntas.length - 1) return;
    const updated = [...localPerguntas];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((p, i) => {
      p.order_index = i;
      if (!p.isNew) p.isModified = true;
    });
    setLocalPerguntas(updated);
    setHasUnsavedChanges(true);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    let savedCount = 0;
    let errorCount = 0;

    try {
      for (const pergunta of localPerguntas) {
        if (!pergunta.pergunta_texto.trim()) continue;

        try {
          if (pergunta.isNew) {
            await createPergunta.mutateAsync({
              questionario_id: questionarioId,
              pergunta_texto: pergunta.pergunta_texto,
              tipo_pergunta: pergunta.tipo_pergunta,
              order_index: pergunta.order_index,
              dimensao_questionario_id: pergunta.dimensao_questionario_id,
              dimensao: pergunta.dimensao,
              is_invertida: pergunta.is_invertida,
              bloco: pergunta.bloco,
              peso: pergunta.peso,
            });
            savedCount++;
          } else if (pergunta.isModified && pergunta.id) {
            await updatePergunta.mutateAsync({
              id: pergunta.id,
              questionario_id: questionarioId,
              pergunta_texto: pergunta.pergunta_texto,
              tipo_pergunta: pergunta.tipo_pergunta,
              order_index: pergunta.order_index,
              dimensao_questionario_id: pergunta.dimensao_questionario_id,
              dimensao: pergunta.dimensao,
              is_invertida: pergunta.is_invertida,
              bloco: pergunta.bloco,
              peso: pergunta.peso,
            });
            savedCount++;
          }
        } catch (error: any) {
          console.error("Erro ao salvar pergunta:", error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`${savedCount} pergunta(s) salva(s) com sucesso`);
        await refetch();
        setInitialized(false); // Force reinitialize
        setHasUnsavedChanges(false);
        onRefetch?.();
      } else {
        toast.warning(`${savedCount} salvas, ${errorCount} com erro`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p>Carregando perguntas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Perguntas do Questionário
              </CardTitle>
              <CardDescription className="mt-1">
                {localPerguntas.length === 0 
                  ? "Adicione perguntas ao questionário"
                  : `${localPerguntas.length} pergunta(s) configurada(s)`
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                  Alterações não salvas
                </Badge>
              )}
              {canBulkAdd && (
                <Button onClick={() => setShowBulkAdd(true)} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Adicionar em Massa
                </Button>
              )}
              <Button onClick={handleAddPergunta} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Pergunta
              </Button>
              {hasUnsavedChanges && (
                <Button onClick={handleSaveAll} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Perguntas
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Alert for Matriz mode without dimensions */}
          {isMatrizMode && dimensoes.length === 0 && (
            <Alert className="mb-4">
              <AlertDescription>
                <strong>Dica:</strong> No modo Matriz de Riscos, é recomendável criar dimensões primeiro 
                na aba "Dimensões" para organizar suas perguntas.
              </AlertDescription>
            </Alert>
          )}

          {localPerguntas.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-lg">Nenhuma pergunta ainda</p>
              <p className="text-sm mt-1 mb-4">
                Clique em "Adicionar Pergunta" ou "Adicionar em Massa" para começar.
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={handleAddPergunta} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Pergunta
                </Button>
                {canBulkAdd && (
                  <Button onClick={() => setShowBulkAdd(true)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Adicionar em Massa
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {localPerguntas.map((pergunta, index) => (
                isMatrizMode ? (
                  <PerguntaCardMatriz
                    key={`pergunta-${pergunta.id || `new-${index}`}`}
                    pergunta={pergunta}
                    index={index}
                    totalPerguntas={localPerguntas.length}
                    dimensoes={dimensoes}
                    onUpdate={(field, value) => handleUpdatePergunta(index, field, value)}
                    onRemove={() => handleRemovePergunta(index)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                  />
                ) : (
                  <PerguntaCardPadrao
                    key={`pergunta-${pergunta.id || `new-${index}`}`}
                    pergunta={pergunta}
                    index={index}
                    totalPerguntas={localPerguntas.length}
                    onUpdate={(field, value) => handleUpdatePergunta(index, field, value)}
                    onRemove={() => handleRemovePergunta(index)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                  />
                )
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canBulkAdd && (
        <BulkAddPerguntasDialog
          open={showBulkAdd}
          onOpenChange={setShowBulkAdd}
          dimensoes={dimensoesParaBulkAdd}
          onAdd={handleBulkAdd}
          modeloAnalise={modeloAnalise}
        />
      )}
    </>
  );
}
