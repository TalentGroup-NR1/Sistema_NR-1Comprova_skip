import { useEffect, useState, useMemo } from "react";
import { Plus, Trash2, Type, ListChecks, ChevronUp, ChevronDown, Tag, FileText, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  useQuestionarioCuidarPlus,
  useCreateQuestionarioCuidarPlus,
  useUpdateQuestionarioCuidarPlus,
  useCreatePerguntaCuidarPlus,
  useUpdatePerguntaCuidarPlus,
  useDeletePerguntaCuidarPlus,
  PerguntaCuidarPlus,
  EscalaConfigItem,
  ConfigCalculo,
} from "@/hooks/useCuidarMaisQuestionarios";
import { useDimensoesQuestionario } from "@/hooks/useDimensoesCuidarPlus";
import { DIMENSOES_OPTIONS, DimensaoCuidarMais } from "@/lib/cuidarMaisDimensoes";
import { DimensoesManager } from "./questionario-editor/DimensoesManager";
import { BulkAddPerguntasDialog, BulkPergunta } from "./questionario-editor/BulkAddPerguntasDialog";
import { EscalaConfigEditor } from "./questionario-editor/EscalaConfigEditor";
import { ConfigCalculoEditor } from "./questionario-editor/ConfigCalculoEditor";
import { PerguntaCardMatriz, LocalPerguntaMatriz } from "./questionario-editor/PerguntaCardMatriz";

interface QuestionarioEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionarioId: string | null;
}

type ModeloAnalise = 'PADRAO' | 'MATRIZ_RISCOS';

const ESCALA_PADRAO: EscalaConfigItem[] = [
  { valor: 1, rotulo: "Discordo Totalmente" },
  { valor: 2, rotulo: "Discordo" },
  { valor: 3, rotulo: "Neutro" },
  { valor: 4, rotulo: "Concordo" },
  { valor: 5, rotulo: "Concordo Totalmente" },
];

const CONFIG_CALCULO_PADRAO: ConfigCalculo = {
  limite_risco: 2,
  alerta_media_minima: 3.0,
  alerta_risco_percentual: 35,
  alerta_queda_delta: 0.3,
};

export function QuestionarioEditorDialog({ 
  open, 
  onOpenChange, 
  questionarioId 
}: QuestionarioEditorDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modeloAnalise, setModeloAnalise] = useState<ModeloAnalise>('PADRAO');
  const [escalaConfig, setEscalaConfig] = useState<EscalaConfigItem[]>(ESCALA_PADRAO);
  const [configCalculo, setConfigCalculo] = useState<ConfigCalculo>(CONFIG_CALCULO_PADRAO);
  const [perguntas, setPerguntas] = useState<LocalPerguntaMatriz[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [activeTab, setActiveTab] = useState("perguntas");
  
  // Track newly created questionnaire ID to stay in edit mode
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);

  // Use createdId if available, otherwise use prop
  const effectiveId = createdId || questionarioId;

  const { data: questionario, isLoading, refetch } = useQuestionarioCuidarPlus(effectiveId);
  const { data: dimensoes = [], refetch: refetchDimensoes } = useDimensoesQuestionario(effectiveId);
  const createQuestionario = useCreateQuestionarioCuidarPlus();
  const updateQuestionario = useUpdateQuestionarioCuidarPlus();
  const createPergunta = useCreatePerguntaCuidarPlus();
  const updatePergunta = useUpdatePerguntaCuidarPlus();
  const deletePergunta = useDeletePerguntaCuidarPlus();

  // Count questions per dimension
  const perguntasPorDimensao = useMemo(() => {
    const map = new Map<string, number>();
    perguntas.forEach(p => {
      if (p.dimensao_questionario_id) {
        map.set(p.dimensao_questionario_id, (map.get(p.dimensao_questionario_id) || 0) + 1);
      }
    });
    return map;
  }, [perguntas]);

  useEffect(() => {
    if (questionario) {
      setTitulo(questionario.titulo);
      setDescricao(questionario.descricao || "");
      setModeloAnalise(questionario.modelo_analise || 'PADRAO');
      setEscalaConfig(questionario.escala_config || ESCALA_PADRAO);
      setConfigCalculo(questionario.config_calculo || CONFIG_CALCULO_PADRAO);
      setPerguntas(
        questionario.perguntas_cuidar_plus.map((p: PerguntaCuidarPlus): LocalPerguntaMatriz => ({
          id: p.id,
          pergunta_texto: p.pergunta_texto,
          tipo_pergunta: p.tipo_pergunta,
          order_index: p.order_index,
          dimensao_questionario_id: p.dimensao_questionario_id || null,
          dimensao: p.dimensao || null,
          is_invertida: p.is_invertida || false,
          bloco: p.bloco || null,
          peso: p.peso ?? 1,
        }))
      );
    } else if (!effectiveId) {
      resetForm();
    }
  }, [questionario, effectiveId]);

  useEffect(() => {
    if (open && !questionarioId && !createdId) {
      resetForm();
    }
  }, [open, questionarioId, createdId]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setCreatedId(null);
      setJustCreated(false);
    }
  }, [open]);

  const resetForm = () => {
    setTitulo("");
    setDescricao("");
    setModeloAnalise('PADRAO');
    setEscalaConfig(ESCALA_PADRAO);
    setConfigCalculo(CONFIG_CALCULO_PADRAO);
    setPerguntas([]);
    setActiveTab("perguntas");
    setCreatedId(null);
    setJustCreated(false);
  };

  const handleAddPergunta = () => {
    const newOrderIndex = perguntas.length > 0 
      ? Math.max(...perguntas.map(p => p.order_index)) + 1 
      : 0;
    
    setPerguntas([
      ...perguntas,
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
  };

  const handleBulkAdd = (novasPerguntas: BulkPergunta[]) => {
    const startIndex = perguntas.length > 0 
      ? Math.max(...perguntas.map(p => p.order_index)) + 1 
      : 0;

    const perguntasComIndice: LocalPerguntaMatriz[] = novasPerguntas.map((p, i) => ({
      ...p,
      order_index: startIndex + i,
      isNew: true,
    }));

    setPerguntas([...perguntas, ...perguntasComIndice]);
    toast.success(`${novasPerguntas.length} pergunta(s) adicionada(s)`);
  };

  const handleUpdatePergunta = (index: number, field: keyof LocalPerguntaMatriz, value: unknown) => {
    const updated = [...perguntas];
    updated[index] = {
      ...updated[index],
      [field]: value,
      isModified: !updated[index].isNew,
    };
    setPerguntas(updated);
  };

  const handleRemovePergunta = async (index: number) => {
    const pergunta = perguntas[index];
    if (pergunta.id && effectiveId) {
      try {
        await deletePergunta.mutateAsync({ id: pergunta.id, questionario_id: effectiveId });
        toast.success("Pergunta removida");
      } catch (error: any) {
        toast.error("Erro ao remover pergunta: " + error.message);
        return;
      }
    }
    setPerguntas(perguntas.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...perguntas];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    updated.forEach((p, i) => {
      p.order_index = i;
      if (!p.isNew) p.isModified = true;
    });
    setPerguntas(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === perguntas.length - 1) return;
    const updated = [...perguntas];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((p, i) => {
      p.order_index = i;
      if (!p.isNew) p.isModified = true;
    });
    setPerguntas(updated);
  };

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }
    
    setIsSaving(true);

    try {
      let targetQuestionarioId = effectiveId;
      const isCreating = !effectiveId;

      if (!effectiveId) {
        // Creating new questionnaire
        const result = await createQuestionario.mutateAsync({ 
          titulo, 
          descricao,
          modelo_analise: modeloAnalise,
          escala_config: modeloAnalise === 'MATRIZ_RISCOS' ? escalaConfig : undefined,
          config_calculo: modeloAnalise === 'MATRIZ_RISCOS' ? configCalculo : undefined,
        });
        targetQuestionarioId = result.id;
        
        // Stay in dialog, switch to edit mode
        setCreatedId(result.id);
        setJustCreated(true);
        
        // Refetch dimensions for the new questionnaire
        await refetchDimensoes();
      } else {
        // Updating existing questionnaire
        await updateQuestionario.mutateAsync({ 
          id: effectiveId, 
          titulo, 
          descricao,
          modelo_analise: modeloAnalise,
          escala_config: modeloAnalise === 'MATRIZ_RISCOS' ? escalaConfig : undefined,
          config_calculo: modeloAnalise === 'MATRIZ_RISCOS' ? configCalculo : undefined,
        });
      }

      if (!targetQuestionarioId) {
        toast.error("Erro ao obter ID do questionário");
        return;
      }

      // Save questions
      let savedCount = 0;
      let errorCount = 0;

      for (const pergunta of perguntas) {
        if (!pergunta.pergunta_texto.trim()) continue;

        try {
          if (pergunta.isNew) {
            await createPergunta.mutateAsync({
              questionario_id: targetQuestionarioId,
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
              questionario_id: targetQuestionarioId,
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
          toast.error(`Erro ao salvar pergunta: ${error.message}`);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        if (isCreating) {
          toast.success("Questionário criado! Agora adicione as perguntas.");
          setActiveTab("perguntas");
        } else {
          toast.success("Questionário atualizado com sucesso");
          await refetch();
          onOpenChange(false);
        }
      } else {
        toast.warning(`${savedCount} perguntas salvas, ${errorCount} com erro`);
        await refetch();
      }
    } catch (error: any) {
      console.error("Erro ao salvar questionário:", error);
      toast.error("Erro ao salvar questionário: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const isMatrizMode = modeloAnalise === 'MATRIZ_RISCOS';
  const isEditMode = !!effectiveId;
  const showTabs = isMatrizMode && isEditMode;

  // For PADRAO mode bulk add, we use fixed dimensions
  const dimensoesParaBulkAdd = isMatrizMode 
    ? dimensoes 
    : DIMENSOES_OPTIONS.map(d => ({
        id: d.value,
        questionario_id: effectiveId || '',
        codigo: d.value,
        titulo: d.label,
        descricao: d.descricao,
        order_index: 0,
        created_at: '',
        updated_at: '',
      }));

  const canBulkAdd = isEditMode && dimensoesParaBulkAdd.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {effectiveId ? (
                <>
                  <span>Editar Questionário</span>
                  {justCreated && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Criado
                    </Badge>
                  )}
                </>
              ) : (
                "Novo Questionário"
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading && effectiveId ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6 py-4">
                {/* Success message after creation */}
                {justCreated && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Questionário criado com sucesso! Agora você pode adicionar perguntas 
                      {isMatrizMode ? ", dimensões, configurar a escala e regras de cálculo" : ""}.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Basic info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="titulo">Título do Questionário *</Label>
                    <Input
                      id="titulo"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Avaliação de Bem-estar - NR1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descricao">Descrição</Label>
                    <Textarea
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Descrição opcional do questionário..."
                      rows={2}
                    />
                  </div>

                  {/* Model selector - disabled after creation to prevent issues */}
                  <div className="space-y-2">
                    <Label>Modelo de Análise</Label>
                    <Select 
                      value={modeloAnalise} 
                      onValueChange={(v) => setModeloAnalise(v as ModeloAnalise)}
                      disabled={isEditMode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PADRAO">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4" />
                            <span>Padrão (dimensões fixas)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="MATRIZ_RISCOS">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            <span>Matriz de Riscos Psicossociais (dimensões customizáveis)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {isEditMode 
                        ? "O modelo não pode ser alterado após a criação."
                        : isMatrizMode 
                          ? "Crie dimensões ilimitadas e configure regras de cálculo personalizadas."
                          : "Use as 8 dimensões pré-definidas de saúde mental."}
                    </p>
                  </div>
                </div>

                {/* Show tabs for MATRIZ_RISCOS mode when in edit mode */}
                {showTabs && (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="perguntas">
                        Perguntas ({perguntas.length})
                      </TabsTrigger>
                      <TabsTrigger value="dimensoes">
                        Dimensões ({dimensoes.length})
                      </TabsTrigger>
                      <TabsTrigger value="escala">Escala</TabsTrigger>
                      <TabsTrigger value="calculo">Cálculo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dimensoes" className="mt-4">
                      <DimensoesManager 
                        questionarioId={effectiveId!} 
                        perguntasPorDimensao={perguntasPorDimensao}
                      />
                    </TabsContent>

                    <TabsContent value="escala" className="mt-4">
                      <EscalaConfigEditor 
                        value={escalaConfig} 
                        onChange={setEscalaConfig} 
                      />
                    </TabsContent>

                    <TabsContent value="calculo" className="mt-4">
                      <ConfigCalculoEditor 
                        value={configCalculo} 
                        onChange={setConfigCalculo} 
                      />
                    </TabsContent>

                    <TabsContent value="perguntas" className="mt-4">
                      {renderPerguntasSection()}
                    </TabsContent>
                  </Tabs>
                )}

                {/* For PADRAO mode or before questionnaire is created, show questions section directly */}
                {!showTabs && renderPerguntasSection()}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={handleClose} type="button">
              {effectiveId ? "Fechar" : "Cancelar"}
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!titulo.trim() || isSaving}
              type="button"
            >
              {isSaving ? "Salvando..." : effectiveId ? "Salvar Alterações" : "Criar Questionário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk add dialog - works for both modes */}
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

  function renderPerguntasSection() {
    const showBulkAddButton = isEditMode && dimensoesParaBulkAdd.length > 0;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">
            Perguntas ({perguntas.length})
          </Label>
          <div className="flex gap-2">
            {showBulkAddButton && (
              <Button 
                onClick={() => setShowBulkAdd(true)} 
                size="sm" 
                variant="outline"
                type="button"
              >
                <FileText className="h-4 w-4 mr-2" />
                Adicionar em Massa
              </Button>
            )}
            <Button 
              onClick={handleAddPergunta} 
              size="sm" 
              variant="outline"
              type="button"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pergunta
            </Button>
          </div>
        </div>

        {/* Message for new questionnaire */}
        {!isEditMode && (
          <Alert>
            <AlertDescription>
              Salve o questionário primeiro para poder adicionar perguntas com dimensão associada.
            </AlertDescription>
          </Alert>
        )}

        {perguntas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p className="font-medium">Nenhuma pergunta ainda</p>
              <p className="text-sm mt-1">
                Clique em "Adicionar Pergunta" ou "Adicionar em Massa" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {perguntas.map((pergunta, index) => (
              isMatrizMode && isEditMode ? (
                <PerguntaCardMatriz
                  key={`pergunta-${pergunta.id || `new-${index}`}`}
                  pergunta={pergunta}
                  index={index}
                  totalPerguntas={perguntas.length}
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
                  totalPerguntas={perguntas.length}
                  dimensoesOptions={isEditMode ? DIMENSOES_OPTIONS : []}
                  onUpdate={(field, value) => handleUpdatePergunta(index, field, value)}
                  onRemove={() => handleRemovePergunta(index)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                />
              )
            ))}
          </div>
        )}
      </div>
    );
  }
}

// Simple card for PADRAO mode with dimension selector
function PerguntaCardPadrao({
  pergunta,
  index,
  totalPerguntas,
  dimensoesOptions,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  pergunta: LocalPerguntaMatriz;
  index: number;
  totalPerguntas: number;
  dimensoesOptions: typeof DIMENSOES_OPTIONS;
  onUpdate: (field: keyof LocalPerguntaMatriz, value: unknown) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <Card className={`relative ${pergunta.isNew ? 'border-primary/50' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 items-center pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveUp}
              disabled={index === 0}
              type="button"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              {index + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveDown}
              disabled={index === totalPerguntas - 1}
              type="button"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3">
            <Textarea
              value={pergunta.pergunta_texto}
              onChange={(e) => onUpdate('pergunta_texto', e.target.value)}
              placeholder="Digite a pergunta..."
              rows={2}
            />

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Tipo:</Label>
                <Select
                  value={pergunta.tipo_pergunta}
                  onValueChange={(value) => onUpdate('tipo_pergunta', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIKERT_5">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Escala Likert (1-5)
                      </div>
                    </SelectItem>
                    <SelectItem value="TEXTO_LIVRE">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Texto Livre
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dimension selector for PADRAO mode */}
              {dimensoesOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Dimensão:</Label>
                  <Select
                    value={pergunta.dimensao_questionario_id || ''}
                    onValueChange={(value) => onUpdate('dimensao_questionario_id', value || null)}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue placeholder="Selecionar dimensão" />
                    </SelectTrigger>
                    <SelectContent>
                      {dimensoesOptions.map((dim) => (
                        <SelectItem key={dim.value} value={dim.value}>
                          <div className="flex items-center gap-2">
                            <span>{dim.icone}</span>
                            <span className="truncate">{dim.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {pergunta.isNew && (
                <Badge variant="outline" className="text-primary border-primary">
                  Nova
                </Badge>
              )}
            </div>

            {pergunta.tipo_pergunta === 'LIKERT_5' && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-2">Preview da escala:</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <Badge key={v} variant="secondary" className="text-xs">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
