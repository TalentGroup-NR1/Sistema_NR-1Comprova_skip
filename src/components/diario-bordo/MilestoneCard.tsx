import { useState, useMemo, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Play, 
  Copy, 
  Mail,
  Eye, 
  CheckCircle2,
  Loader2,
  User,
  Users,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useQuestionnaireTemplates } from '@/hooks/useQuestionnaireTemplates';
import { useActivateFeedbackCycle, type MilestoneInfo } from '@/hooks/useFeedbackCycles';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { buildFeedbackUrl, copyFeedbackLinkRich } from '@/lib/feedbackLinks';

interface MilestoneCardProps {
  milestone: MilestoneInfo;
  colaboradorId: string;
  colaboradorNome: string;
  gestorNamePrefill?: string;
  onViewAnalysis: (cycleId: string) => void;
  isHistorical?: boolean;
}

export function MilestoneCard({ milestone, colaboradorId, colaboradorNome, gestorNamePrefill = '', onViewAnalysis, isHistorical = false }: MilestoneCardProps) {
  const { isAdminMaster } = useAuth();
  const { data: templates } = useQuestionnaireTemplates();
  const activateCycle = useActivateFeedbackCycle();

  const [collaboratorTemplateId, setCollaboratorTemplateId] = useState('');
  const [gestorTemplateId, setGestorTemplateId] = useState('');
  const [gestorName, setGestorName] = useState(gestorNamePrefill);
  useEffect(() => { setGestorName(gestorNamePrefill); }, [gestorNamePrefill]);

  // Filter templates for collaborator dropdown - show ALL relevant templates by target_audience only
  const collaboratorTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => 
      t.target_audience === 'COLABORADOR' || 
      t.target_audience === 'AMBOS' || 
      t.target_audience === 'NAO_ESPECIFICADO'
    );
  }, [templates]);

  // Filter templates for gestor dropdown - show ALL relevant templates by target_audience only
  const gestorTemplates = useMemo(() => {
    if (!templates) return [];
    return templates.filter(t => 
      t.target_audience === 'GESTOR' || 
      t.target_audience === 'AMBOS' || 
      t.target_audience === 'NAO_ESPECIFICADO'
    );
  }, [templates]);

  // Helper to format milestone type label for display
  const getMilestoneTypeLabel = (type: string | null) => {
    if (!type) return '';
    switch (type) {
      case '30_DIAS': return '[30D]';
      case '80_DIAS': return '[80D]';
      case '120_DIAS': return '[120D]';
      case 'GERAL': return '[Geral]';
      default: return '';
    }
  };

  // Auto-select templates based on milestone type (as initial suggestion only)
  useEffect(() => {
    if (milestone.type && templates && milestone.status === 'NAO_INICIADO') {
      // Try to find a matching template for auto-selection (suggestion)
      if (!collaboratorTemplateId) {
        const matchingColabTemplate = templates.find(t => 
          t.milestone_type === milestone.type && 
          (t.target_audience === 'COLABORADOR' || t.target_audience === 'AMBOS')
        );
        if (matchingColabTemplate) {
          setCollaboratorTemplateId(matchingColabTemplate.id);
        }
      }

      if (!gestorTemplateId) {
        const matchingGestorTemplate = templates.find(t => 
          t.milestone_type === milestone.type && 
          (t.target_audience === 'GESTOR' || t.target_audience === 'AMBOS')
        );
        if (matchingGestorTemplate) {
          setGestorTemplateId(matchingGestorTemplate.id);
        }
      }
    }
  }, [milestone.type, milestone.status, templates, collaboratorTemplateId, gestorTemplateId]);

  const getMilestoneLabel = (type: string) => {
    switch (type) {
      case '30_DIAS': return '30 Dias';
      case '80_DIAS': return '80 Dias';
      case '120_DIAS': return '120 Dias';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'NAO_INICIADO': return 'Não Iniciado';
      case 'LINKS_GERADOS': return 'Aguardando Respostas';
      case 'COLAB_RESPONDIDO': return 'Colaborador Respondeu';
      case 'GESTOR_RESPONDIDO': return 'Gestor Respondeu';
      case 'CONCLUIDO': return 'Concluído';
      case 'ATRASADO': return 'Atrasado';
      default: return status;
    }
  };

  const getCardStyles = () => {
    if (milestone.isOverdue) return 'bg-warning/5 border-warning/30';
    if (milestone.isUpcoming) return 'bg-info/5 border-info/30';
    if (milestone.status === 'CONCLUIDO') return 'bg-success/5 border-success/30';
    if (['LINKS_GERADOS', 'COLAB_RESPONDIDO', 'GESTOR_RESPONDIDO'].includes(milestone.status)) {
      return 'bg-primary/5 border-primary/30';
    }
    return 'bg-muted/50 border-border';
  };

  const getStatusBadgeVariant = () => {
    if (milestone.isOverdue) return 'destructive';
    if (milestone.isUpcoming) return 'default';
    if (milestone.status === 'CONCLUIDO') return 'secondary';
    if (['LINKS_GERADOS', 'COLAB_RESPONDIDO', 'GESTOR_RESPONDIDO'].includes(milestone.status)) {
      return 'outline';
    }
    return 'outline';
  };

  const copyPlainLink = (token: string, type: 'colaborador' | 'gestor') => {
    const url = buildFeedbackUrl(token, colaboradorNome, type);
    navigator.clipboard.writeText(url);
    toast.success(`Link do ${type === 'colaborador' ? 'Colaborador' : 'Gestor'} copiado!`);
  };

  const copyRichLink = async (token: string, type: 'colaborador' | 'gestor') => {
    try {
      await copyFeedbackLinkRich(token, colaboradorNome, type);
      toast.success('Link formatado copiado! Cole no corpo do e-mail.');
    } catch {
      toast.error('Não foi possível copiar o link formatado.');
    }
  };

  const handleStartCycle = async () => {
    if (!collaboratorTemplateId || !gestorTemplateId) {
      toast.error('Selecione os questionários para colaborador e gestor');
      return;
    }

    await activateCycle.mutateAsync({
      cycle_id: milestone.cycle_id,
      collaborator_questionnaire_template_id: collaboratorTemplateId,
      gestor_questionnaire_template_id: gestorTemplateId,
      gestor_name: gestorName || undefined,
    });
  };

  const isNotStarted = milestone.status === 'NAO_INICIADO';
  const isInProgress = ['LINKS_GERADOS', 'COLAB_RESPONDIDO', 'GESTOR_RESPONDIDO'].includes(milestone.status);
  const isCompleted = milestone.status === 'CONCLUIDO';

  const colaboradorRespondeu = milestone.status === 'COLAB_RESPONDIDO' || milestone.status === 'CONCLUIDO';
  const gestorRespondeu = milestone.status === 'GESTOR_RESPONDIDO' || milestone.status === 'CONCLUIDO';

  return (
    <div className={`p-4 rounded-lg border ${getCardStyles()} space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Badge variant={getStatusBadgeVariant()} className="text-xs font-medium">
          {getMilestoneLabel(milestone.type)}
        </Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(parseISO(milestone.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2">
        {milestone.isOverdue && <AlertTriangle className="h-4 w-4 text-warning" />}
        {milestone.isUpcoming && <Clock className="h-4 w-4 text-info" />}
        {isCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
        <span className={`text-sm font-medium ${
          milestone.isOverdue ? 'text-warning' : 
          milestone.isUpcoming ? 'text-info' :
          isCompleted ? 'text-success' : 'text-muted-foreground'
        }`}>
          {milestone.isOverdue 
            ? `${Math.abs(milestone.daysUntil)} dias atrasado`
            : milestone.isUpcoming && isNotStarted
            ? `em ${milestone.daysUntil} dias`
            : getStatusLabel(milestone.status)
          }
        </span>
      </div>

      {/* Response Status for in-progress cycles */}
      {isInProgress && (
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3" />
            <span>Colaborador:</span>
            {colaboradorRespondeu ? (
              <span className="text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Respondeu
              </span>
            ) : (
              <span className="text-muted-foreground">Pendente</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3" />
            <span>Gestor:</span>
            {gestorRespondeu ? (
              <span className="text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Respondeu
              </span>
            ) : (
              <span className="text-muted-foreground">Pendente</span>
            )}
          </div>
        </div>
      )}

      {/* Template Selection for NAO_INICIADO - disabled for historical */}
      {isNotStarted && !isHistorical && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {(collaboratorTemplates.length === 0 || gestorTemplates.length === 0) && (
            <p className="text-xs text-destructive">
              Questionário ainda não configurado — cadastre um questionário para este marco antes
              de iniciar o ciclo.
            </p>
          )}
          <div className="space-y-1.5">

            <Label className="text-xs text-muted-foreground">Questionário Colaborador</Label>
            <Select value={collaboratorTemplateId} onValueChange={setCollaboratorTemplateId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {collaboratorTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.template_name} {getMilestoneTypeLabel(t.milestone_type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Questionário Gestor</Label>
            <Select value={gestorTemplateId} onValueChange={setGestorTemplateId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {gestorTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id} className="text-xs">
                    {t.template_name} {getMilestoneTypeLabel(t.milestone_type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Nome do Gestor (Opcional)</Label>
            <Input
              value={gestorName}
              onChange={(e) => setGestorName(e.target.value)}
              placeholder="Nome do gestor"
              className="h-8 text-xs"
            />
          </div>

          <Button
            size="sm"
            className="w-full h-8 text-xs"
            variant={milestone.isOverdue ? 'destructive' : milestone.isUpcoming ? 'default' : 'outline'}
            disabled={!collaboratorTemplateId || !gestorTemplateId || activateCycle.isPending}
            onClick={handleStartCycle}
          >
            {activateCycle.isPending ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Iniciar Ciclo
          </Button>
        </div>
      )}

      {/* Historical not started - show message */}
      {isNotStarted && isHistorical && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground italic text-center">
            Ciclo não iniciado (colaborador desligado)
          </p>
        </div>
      )}

      {/* Copy Links for in-progress cycles */}
      {isInProgress && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          {!colaboradorRespondeu && milestone.collaborator_token && (
            <div className="flex gap-1">
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-7 text-xs justify-start"
                onClick={() => copyRichLink(milestone.collaborator_token!, 'colaborador')}
                title="Cole no corpo do e-mail — o link aparecerá com o nome do colaborador"
              >
                <Mail className="h-3 w-3 mr-2" />
                Copiar p/ e-mail (Colaborador)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => copyPlainLink(milestone.collaborator_token!, 'colaborador')}
                title="Copiar URL"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
          {!gestorRespondeu && milestone.gestor_token && (
            <div className="flex gap-1">
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-7 text-xs justify-start"
                onClick={() => copyRichLink(milestone.gestor_token!, 'gestor')}
                title="Cole no corpo do e-mail — o link aparecerá com o nome do colaborador"
              >
                <Mail className="h-3 w-3 mr-2" />
                Copiar p/ e-mail (Gestor)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2"
                onClick={() => copyPlainLink(milestone.gestor_token!, 'gestor')}
                title="Copiar URL"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* View Analysis for completed cycles */}
      {isCompleted && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onViewAnalysis(milestone.cycle_id)}
        >
          <Eye className="h-3 w-3 mr-1" />
          Ver Análise Comparativa
        </Button>
      )}

      {/* View Analysis also available for in-progress */}
      {isInProgress && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => onViewAnalysis(milestone.cycle_id)}
        >
          <Eye className="h-3 w-3 mr-1" />
          Ver Análise
        </Button>
      )}
    </div>
  );
}
