import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Trash2, 
  GripVertical,
  Save,
  Loader2
} from 'lucide-react';
import { 
  useQuestionnaireTemplate, 
  useCreateQuestionnaireTemplate,
  useUpdateQuestionnaireTemplate,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from '@/hooks/useQuestionnaireTemplates';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useReplicateQuestionnaireTemplate } from '@/hooks/useGlobalReplication';
import { GlobalReplicationToggle } from '@/components/shared/GlobalReplicationToggle';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/integrations/supabase/types';

type Question = Database['public']['Tables']['questions']['Row'];

interface TemplateEditorDialogProps {
  templateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LocalQuestion {
  id?: string;
  question_text: string;
  question_type: Database['public']['Enums']['question_type'];
  respondent_type: Database['public']['Enums']['respondent_type'];
  scale_min: number;
  scale_max: number;
  order_index: number;
  isNew?: boolean;
  isDeleted?: boolean;
}

export function TemplateEditorDialog({ templateId, open, onOpenChange }: TemplateEditorDialogProps) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { isAdminMaster, isAdminEmpresa } = useAuth();
  const { data: template, isLoading } = useQuestionnaireTemplate(templateId);
  
  const createTemplate = useCreateQuestionnaireTemplate();
  const updateTemplate = useUpdateQuestionnaireTemplate();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();

  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [milestoneType, setMilestoneType] = useState<Database['public']['Enums']['milestone_type'] | ''>('');
  const [targetAudience, setTargetAudience] = useState<Database['public']['Enums']['target_audience_type']>('NAO_ESPECIFICADO');
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [replicateEnabled, setReplicateEnabled] = useState(false);
  const replicateTemplate = useReplicateQuestionnaireTemplate();

  const canEdit = isAdminMaster || isAdminEmpresa;
  const isCreating = !templateId;

  // Determine if respondent_type selector should be shown
  const showRespondentTypeSelector = targetAudience === 'AMBOS' || targetAudience === 'NAO_ESPECIFICADO';

  // Get auto respondent type based on target audience
  const getAutoRespondentType = (audience: Database['public']['Enums']['target_audience_type']): Database['public']['Enums']['respondent_type'] => {
    if (audience === 'COLABORADOR') return 'COLABORADOR';
    if (audience === 'GESTOR') return 'GESTOR';
    return 'AMBOS';
  };

  // Reset form when opening in create mode
  useEffect(() => {
    if (open && isCreating) {
      setTemplateName('');
      setDescription('');
      setMilestoneType('');
      setTargetAudience('NAO_ESPECIFICADO');
      setQuestions([]);
      setReplicateEnabled(false);
    }
  }, [open, isCreating]);

  // Load template data when editing
  useEffect(() => {
    if (template && !isCreating) {
      setTemplateName(template.template_name);
      setDescription(template.description || '');
      setMilestoneType(template.milestone_type || '');
      setTargetAudience(template.target_audience || 'NAO_ESPECIFICADO');
      setQuestions(template.questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        respondent_type: q.respondent_type,
        scale_min: q.scale_min || 1,
        scale_max: q.scale_max || 10,
        order_index: q.order_index,
      })));
    }
  }, [template, isCreating]);

  // Sync respondent_type when targetAudience changes to COLABORADOR or GESTOR
  useEffect(() => {
    if (targetAudience === 'COLABORADOR' || targetAudience === 'GESTOR') {
      const newRespondentType = getAutoRespondentType(targetAudience);
      setQuestions(prev => prev.map(q => ({
        ...q,
        respondent_type: newRespondentType
      })));
    }
  }, [targetAudience]);

  const addQuestion = () => {
    const autoRespondentType = getAutoRespondentType(targetAudience);
    
    setQuestions([
      ...questions,
      {
        question_text: '',
        question_type: 'ESCALA_NUMERICA',
        respondent_type: autoRespondentType,
        scale_min: 1,
        scale_max: 10,
        order_index: questions.length,
        isNew: true,
      },
    ]);
  };

  const updateLocalQuestion = (index: number, updates: Partial<LocalQuestion>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    const question = questions[index];
    if (question.id) {
      // Mark existing question for deletion
      updateLocalQuestion(index, { isDeleted: true });
    } else {
      // Remove new question
      setQuestions(questions.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!templateName.trim()) return;

    setIsSaving(true);
    try {
      let currentTemplateId = templateId;

      if (isCreating) {
        const result = await createTemplate.mutateAsync({
          template_name: templateName,
          description: description || undefined,
          milestone_type: milestoneType || undefined,
          target_audience: targetAudience,
          company_id: effectiveCompanyId || null,
        });
        currentTemplateId = result.id;
      } else if (templateId) {
        await updateTemplate.mutateAsync({
          id: templateId,
          template_name: templateName,
          description: description || undefined,
          milestone_type: milestoneType || undefined,
          target_audience: targetAudience,
        });
      }

      // Handle questions
      for (const question of questions) {
        if (question.isDeleted && question.id) {
          await deleteQuestion.mutateAsync({ id: question.id, templateId: currentTemplateId! });
        } else if (question.isNew && !question.isDeleted) {
          await createQuestion.mutateAsync({
            questionnaire_template_id: currentTemplateId!,
            question_text: question.question_text,
            question_type: question.question_type,
            respondent_type: question.respondent_type,
            scale_min: question.question_type === 'ESCALA_NUMERICA' ? question.scale_min : undefined,
            scale_max: question.question_type === 'ESCALA_NUMERICA' ? question.scale_max : undefined,
            order_index: question.order_index,
          });
        } else if (question.id && !question.isDeleted) {
          await updateQuestion.mutateAsync({
            id: question.id,
            templateId: currentTemplateId!,
            question_text: question.question_text,
            question_type: question.question_type,
            respondent_type: question.respondent_type,
            scale_min: question.question_type === 'ESCALA_NUMERICA' ? question.scale_min : undefined,
            scale_max: question.question_type === 'ESCALA_NUMERICA' ? question.scale_max : undefined,
            order_index: question.order_index,
          });
        }
      }

      // Replicate if enabled and creating with a company selected
      if (replicateEnabled && isCreating && effectiveCompanyId && currentTemplateId) {
        await replicateTemplate.mutateAsync({
          templateId: currentTemplateId,
          sourceCompanyId: effectiveCompanyId,
        });
      }

      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const getRespondentLabel = (type: string) => {
    switch (type) {
      case 'COLABORADOR': return 'Colaborador';
      case 'GESTOR': return 'Gestor';
      case 'AMBOS': return 'Ambos';
      default: return type;
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'ESCALA_NUMERICA': return 'Escala Numérica';
      case 'TEXTO_LIVRE': return 'Texto Livre';
      case 'SIM_NAO': return 'Sim/Não';
      default: return type;
    }
  };

  const getTargetAudienceLabel = (type: string) => {
    switch (type) {
      case 'COLABORADOR': return 'Colaborador';
      case 'GESTOR': return 'Gestor';
      case 'AMBOS': return 'Ambos (único template)';
      case 'NAO_ESPECIFICADO': return 'Não Especificado';
      default: return type;
    }
  };

  const visibleQuestions = questions.filter(q => !q.isDeleted);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? 'Novo Template' : canEdit ? 'Editar Template' : 'Visualizar Template'}
          </DialogTitle>
        </DialogHeader>

        {isLoading && !isCreating ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Template Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Template *</Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Ex: Diário de Bordo - 30 Dias"
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do questionário..."
                  disabled={!canEdit}
                />
              </div>

              <div className="space-y-2">
                <Label>Marco</Label>
                <Select 
                  value={milestoneType} 
                  onValueChange={(v) => setMilestoneType(v as Database['public']['Enums']['milestone_type'])}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o marco (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30_DIAS">30 Dias</SelectItem>
                    <SelectItem value="80_DIAS">80 Dias</SelectItem>
                    <SelectItem value="120_DIAS">120 Dias</SelectItem>
                    <SelectItem value="GERAL">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Público Alvo *</Label>
                <Select 
                  value={targetAudience} 
                  onValueChange={(v) => setTargetAudience(v as Database['public']['Enums']['target_audience_type'])}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o público alvo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                    <SelectItem value="GESTOR">Gestor</SelectItem>
                    <SelectItem value="AMBOS">Ambos (único template para os dois)</SelectItem>
                    <SelectItem value="NAO_ESPECIFICADO">Não Especificado</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Defina se este template é destinado ao Colaborador, ao Gestor, ou Ambos.
                </p>
              </div>
            </div>

            {/* Replication Toggle */}
            {isCreating && (
              <GlobalReplicationToggle
                sourceCompanyId={effectiveCompanyId}
                enabled={replicateEnabled}
                onEnabledChange={setReplicateEnabled}
                disabled={isSaving}
              />
            )}

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Perguntas ({visibleQuestions.length})</h3>
                {canEdit && (
                  <Button variant="outline" size="sm" onClick={addQuestion}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                )}
              </div>

              {visibleQuestions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    Nenhuma pergunta adicionada
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, index) => 
                    !question.isDeleted && (
                      <Card key={question.id || `new-${index}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-muted-foreground mt-2">
                              <GripVertical className="h-4 w-4" />
                            </div>
                            <div className="flex-1 space-y-3">
                              <Textarea
                                value={question.question_text}
                                onChange={(e) => updateLocalQuestion(index, { question_text: e.target.value })}
                                placeholder="Texto da pergunta..."
                                className="min-h-[60px]"
                                disabled={!canEdit}
                              />
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                <Select
                                  value={question.question_type}
                                  onValueChange={(v) => updateLocalQuestion(index, { question_type: v as any })}
                                  disabled={!canEdit}
                                >
                                  <SelectTrigger className="text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ESCALA_NUMERICA">Escala Numérica</SelectItem>
                                    <SelectItem value="TEXTO_LIVRE">Texto Livre</SelectItem>
                                    <SelectItem value="SIM_NAO">Sim/Não</SelectItem>
                                  </SelectContent>
                                </Select>

                                {showRespondentTypeSelector ? (
                                  <Select
                                    value={question.respondent_type}
                                    onValueChange={(v) => updateLocalQuestion(index, { respondent_type: v as any })}
                                    disabled={!canEdit}
                                  >
                                    <SelectTrigger className="text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="AMBOS">Ambos</SelectItem>
                                      <SelectItem value="COLABORADOR">Colaborador</SelectItem>
                                      <SelectItem value="GESTOR">Gestor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="secondary" className="text-xs h-8 flex items-center justify-center">
                                    {getRespondentLabel(question.respondent_type)}
                                  </Badge>
                                )}

                                {question.question_type === 'ESCALA_NUMERICA' && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <Input
                                      type="number"
                                      value={question.scale_min}
                                      onChange={(e) => updateLocalQuestion(index, { scale_min: parseInt(e.target.value) })}
                                      className="w-14 h-8"
                                      disabled={!canEdit}
                                    />
                                    <span className="text-muted-foreground">a</span>
                                    <Input
                                      type="number"
                                      value={question.scale_max}
                                      onChange={(e) => updateLocalQuestion(index, { scale_max: parseInt(e.target.value) })}
                                      className="w-14 h-8"
                                      disabled={!canEdit}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            {canEdit && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQuestion(index)}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {canEdit && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!templateName.trim() || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Salvar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
