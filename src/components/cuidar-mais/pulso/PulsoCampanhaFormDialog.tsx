import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, GripVertical, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import {
  useCreateCampaign,
  useUpdateCampaign,
  useCampaignQuestions,
  PulseCampaign,
} from "@/hooks/usePulseCampaigns";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { GlobalReplicationToggle } from "@/components/shared/GlobalReplicationToggle";
import { useReplicatePulseCampaign } from "@/hooks/useGlobalReplication";

interface QuestionForm {
  id?: string;
  pergunta: string;
  tipo: 'escala_0_5' | 'sim_nao' | 'texto_livre';
  obrigatoria: boolean;
}

interface PulsoCampanhaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign?: PulseCampaign | null;
}

const QUESTION_TEMPLATES = {
  clima: [
    { pergunta: "Como você está se sentindo no trabalho esta semana?", tipo: "escala_0_5" as const, obrigatoria: true },
    { pergunta: "Você se sente apoiado(a) pela sua equipe?", tipo: "sim_nao" as const, obrigatoria: true },
    { pergunta: "O que podemos fazer para melhorar seu dia a dia?", tipo: "texto_livre" as const, obrigatoria: false },
  ],
  rapido: [
    { pergunta: "Como foi sua semana de trabalho?", tipo: "escala_0_5" as const, obrigatoria: true },
  ],
  completo: [
    { pergunta: "Como você avalia seu bem-estar geral esta semana?", tipo: "escala_0_5" as const, obrigatoria: true },
    { pergunta: "Você está satisfeito(a) com a comunicação da equipe?", tipo: "escala_0_5" as const, obrigatoria: true },
    { pergunta: "Você teve as ferramentas necessárias para realizar seu trabalho?", tipo: "sim_nao" as const, obrigatoria: true },
    { pergunta: "Você recomendaria a empresa como um bom lugar para trabalhar?", tipo: "sim_nao" as const, obrigatoria: true },
    { pergunta: "Compartilhe sugestões ou comentários adicionais:", tipo: "texto_livre" as const, obrigatoria: false },
  ],
};

export function PulsoCampanhaFormDialog({
  open,
  onOpenChange,
  campaign,
}: PulsoCampanhaFormDialogProps) {
  const isEditing = !!campaign;
  const { isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();

  // Form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [replicateGlobally, setReplicateGlobally] = useState(false);

  // Queries & mutations
  const { data: existingQuestions } = useCampaignQuestions(campaign?.id);
  const createCampaign = useCreateCampaign();
  const updateCampaign = useUpdateCampaign();
  const replicateCampaign = useReplicatePulseCampaign();

  // Initialize form when editing
  useEffect(() => {
    if (campaign) {
      setTitulo(campaign.titulo);
      setDescricao(campaign.descricao || "");
      setDataInicio(campaign.data_inicio);
      setDataFim(campaign.data_fim);
      setAtivo(campaign.ativo);
      setReplicateGlobally(false);
    } else {
      // Reset for new campaign
      setTitulo("");
      setDescricao("");
      setDataInicio(format(new Date(), "yyyy-MM-dd"));
      setDataFim("");
      setAtivo(true);
      setReplicateGlobally(false);
      setQuestions([{ pergunta: "", tipo: "escala_0_5", obrigatoria: true }]);
    }
  }, [campaign, open]);

  // Load existing questions when editing
  useEffect(() => {
    if (existingQuestions && existingQuestions.length > 0) {
      setQuestions(
        existingQuestions.map((q) => ({
          id: q.id,
          pergunta: q.pergunta,
          tipo: q.tipo,
          obrigatoria: q.obrigatoria,
        }))
      );
    }
  }, [existingQuestions]);

  const addQuestion = () => {
    setQuestions([...questions, { pergunta: "", tipo: "escala_0_5", obrigatoria: true }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, updates: Partial<QuestionForm>) => {
    setQuestions(
      questions.map((q, i) => (i === index ? { ...q, ...updates } : q))
    );
  };

  const applyTemplate = (templateKey: keyof typeof QUESTION_TEMPLATES) => {
    setQuestions(QUESTION_TEMPLATES[templateKey].map((q) => ({ ...q })));
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !dataInicio || !dataFim) return;

    const validQuestions = questions.filter((q) => q.pergunta.trim());
    if (validQuestions.length === 0) return;

    if (isEditing) {
      await updateCampaign.mutateAsync({
        id: campaign.id,
        titulo,
        descricao: descricao || null,
        data_inicio: dataInicio,
        data_fim: dataFim,
        ativo,
        questions: validQuestions.map((q, i) => ({
          ...q,
          campaign_id: campaign.id,
          ordem: i,
          created_at: new Date().toISOString(),
        })) as any,
      });
    } else {
      const result = await createCampaign.mutateAsync({
        titulo,
        descricao,
        data_inicio: dataInicio,
        data_fim: dataFim,
        ativo,
        questions: validQuestions.map((q, i) => ({
          ...q,
          ordem: i,
        })),
      });

      // If replication is enabled and we have a company ID, replicate
      if (replicateGlobally && effectiveCompanyId && result?.id) {
        await replicateCampaign.mutateAsync({
          campaignId: result.id,
          sourceCompanyId: effectiveCompanyId,
        });
      }
    }

    onOpenChange(false);
  };

  const isPending = createCampaign.isPending || updateCampaign.isPending || replicateCampaign.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Campanha" : "Nova Campanha de Pulso"}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes e perguntas da campanha de pesquisa
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="questions">Perguntas ({questions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Campanha *</Label>
              <Input
                id="titulo"
                placeholder="Ex: Pulso Semanal - Janeiro 2025"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o objetivo desta campanha..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">Data de Início *</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataFim">Data de Fim *</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  min={dataInicio}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Campanha Ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Campanhas inativas não aparecem para colaboradores
                </p>
              </div>
              <Switch checked={ativo} onCheckedChange={setAtivo} />
            </div>

            {/* Global Replication Toggle - only for new campaigns */}
            {isAdminMaster && !isEditing && (
              <GlobalReplicationToggle
                sourceCompanyId={effectiveCompanyId}
                enabled={replicateGlobally}
                onEnabledChange={setReplicateGlobally}
                disabled={isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="questions" className="space-y-4 mt-4">
            {/* Templates */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("rapido")}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Pulso Rápido
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("clima")}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Clima Básico
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyTemplate("completo")}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Completo
              </Button>
            </div>
            {/* Questions List */}
            <div className="space-y-3">
              {questions.map((q, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="flex items-center text-muted-foreground">
                        <GripVertical className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <Input
                          placeholder="Digite a pergunta..."
                          value={q.pergunta}
                          onChange={(e) =>
                            updateQuestion(index, { pergunta: e.target.value })
                          }
                        />
                        <div className="flex items-center gap-4">
                          <Select
                            value={q.tipo}
                            onValueChange={(value) =>
                              updateQuestion(index, { tipo: value as QuestionForm["tipo"] })
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="escala_0_5">
                                Escala 0-5 (Emojis)
                              </SelectItem>
                              <SelectItem value="sim_nao">Sim / Não</SelectItem>
                              <SelectItem value="texto_livre">Texto Livre</SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`obrigatoria-${index}`}
                              checked={q.obrigatoria}
                              onCheckedChange={(checked) =>
                                updateQuestion(index, { obrigatoria: !!checked })
                              }
                            />
                            <Label
                              htmlFor={`obrigatoria-${index}`}
                              className="text-sm"
                            >
                              Obrigatória
                            </Label>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(index)}
                        disabled={questions.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="outline" onClick={addQuestion} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Pergunta
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : isEditing ? (
              "Salvar Alterações"
            ) : (
              "Criar Campanha"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
