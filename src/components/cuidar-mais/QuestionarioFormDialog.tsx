import { useState, useEffect } from "react";
import { Layers, Settings, Users, InfoIcon } from "lucide-react";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  QuestionarioCuidarPlus,
  useCreateQuestionarioCuidarPlus,
  useUpdateQuestionarioCuidarPlus,
  useEnviosCuidarPlus,
} from "@/hooks/useCuidarMaisQuestionarios";
import { useColaboradores } from "@/hooks/useColaboradores";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { GlobalReplicationToggle } from "@/components/shared/GlobalReplicationToggle";
import { useReplicateQuestionarioCuidarPlus } from "@/hooks/useGlobalReplication";

interface QuestionarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionario?: QuestionarioCuidarPlus | null;
  onCreated?: (questionario: QuestionarioCuidarPlus) => void;
  onSaved?: () => void;
}

type ModeloAnalise = 'PADRAO' | 'MATRIZ_RISCOS';

export function QuestionarioFormDialog({ 
  open, 
  onOpenChange, 
  questionario,
  onCreated,
  onSaved,
}: QuestionarioFormDialogProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [modeloAnalise, setModeloAnalise] = useState<ModeloAnalise>('PADRAO');
  const [isSaving, setIsSaving] = useState(false);
  const [replicateGlobally, setReplicateGlobally] = useState(false);

  const [audienciaTipo, setAudienciaTipo] = useState<'todos' | 'departamentos'>('todos');
  const [alvos, setAlvos] = useState<string[]>([]);
  
  const { isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const createQuestionario = useCreateQuestionarioCuidarPlus();
  const updateQuestionario = useUpdateQuestionarioCuidarPlus();
  const replicateQuestionario = useReplicateQuestionarioCuidarPlus();

  const isEditing = !!questionario;

  const { data: colaboradores = [] } = useColaboradores();
  const { data: envios = [] } = useEnviosCuidarPlus(questionario?.id || null);

  const isAtivo = isEditing && questionario?.is_active;
  const temEnvios = isEditing && envios.length > 0;
  const isLocked = isAtivo || temEnvios;

  const departamentosUnicos = Array.from(new Set(
    colaboradores.map(c => c.department).filter(Boolean) as string[]
  )).sort();

  useEffect(() => {
    if (open) {
      if (questionario) {
        setTitulo(questionario.titulo);
        setDescricao(questionario.descricao || "");
        setModeloAnalise(questionario.modelo_analise || 'PADRAO');
        setAudienciaTipo(questionario.audiencia_tipo || 'todos');
        setAlvos(questionario.alvos || []);
        setReplicateGlobally(false);
      } else {
        setTitulo("");
        setDescricao("");
        setModeloAnalise('PADRAO');
        setAudienciaTipo('todos');
        setAlvos([]);
        setReplicateGlobally(false);
      }
    }
  }, [open, questionario]);

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    if (audienciaTipo === 'departamentos' && alvos.length === 0 && !isLocked) {
      toast.error("Selecione pelo menos um departamento para a audiência");
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        const updatePayload: any = {
          id: questionario.id,
          titulo,
          descricao,
        };
        
        if (!isLocked) {
          updatePayload.audiencia_tipo = audienciaTipo;
          updatePayload.alvos = audienciaTipo === 'departamentos' ? alvos : [];
        }

        await updateQuestionario.mutateAsync(updatePayload);
        toast.success("Questionário atualizado");
        onSaved?.();
      } else {
        const result = await createQuestionario.mutateAsync({
          titulo,
          descricao,
          modelo_analise: modeloAnalise,
          audiencia_tipo: audienciaTipo,
          alvos: audienciaTipo === 'departamentos' ? alvos : undefined,
        });
        
        // Type assertion since we know result has id
        const createdQuestionario: QuestionarioCuidarPlus = {
          id: result.id,
          company_id: result.company_id,
          titulo: result.titulo,
          descricao: result.descricao,
          is_active: result.is_active,
          modelo_analise: (result as any).modelo_analise || 'PADRAO',
          escala_config: null,
          config_calculo: null,
          data_ativacao: result.data_ativacao,
          data_desativacao: result.data_desativacao,
          created_by_user_id: result.created_by_user_id,
          created_at: result.created_at,
          updated_at: result.updated_at,
        };

        toast.success("Questionário criado! Agora adicione as perguntas.");
        
        // If replication is enabled and we have a company ID, replicate
        if (replicateGlobally && effectiveCompanyId) {
          await replicateQuestionario.mutateAsync({
            questionarioId: result.id,
            sourceCompanyId: effectiveCompanyId,
          });
        }

        onCreated?.(createdQuestionario);
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Questionário" : "Novo Questionário"}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? "Atualize as informações básicas do questionário."
              : "Crie um novo questionário. Após a criação, você poderá adicionar perguntas."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
              rows={3}
            />
          </div>

          <div className="space-y-3 pt-2 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">Público-alvo</Label>
            </div>
            
            {isLocked ? (
              <div className="rounded-md bg-muted p-4 space-y-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    A audiência não pode ser alterada em campanhas ativas ou que já tiveram envios, 
                    para preservar a consistência estatística.
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium">Alvo Atual: </span>
                  {audienciaTipo === 'todos' ? (
                    <Badge variant="secondary">Toda a empresa</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {alvos.map(a => (
                        <Badge key={a} variant="outline">{a}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <RadioGroup 
                value={audienciaTipo} 
                onValueChange={(val: 'todos' | 'departamentos') => setAudienciaTipo(val)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="todos" id="r-todos" />
                  <Label htmlFor="r-todos" className="cursor-pointer font-normal">Toda a empresa (Padrão)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="departamentos" id="r-dept" disabled={departamentosUnicos.length === 0} />
                  <Label htmlFor="r-dept" className="cursor-pointer font-normal">Departamentos específicos</Label>
                  
                  {departamentosUnicos.length === 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <InfoIcon className="h-4 w-4 text-muted-foreground ml-1 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[200px] text-xs">
                            É preciso cadastrar colaboradores vinculados a departamentos na Estrutura Organizacional para usar esta opção.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </RadioGroup>
            )}

            {!isLocked && audienciaTipo === 'departamentos' && departamentosUnicos.length > 0 && (
              <ScrollArea className="h-[120px] w-full rounded-md border p-4 mt-2 bg-slate-50/50">
                <div className="space-y-3">
                  {departamentosUnicos.map((dept) => (
                    <div key={dept} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`dept-${dept}`} 
                        checked={alvos.includes(dept)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setAlvos([...alvos, dept]);
                          } else {
                            setAlvos(alvos.filter(a => a !== dept));
                          }
                        }}
                      />
                      <label 
                        htmlFor={`dept-${dept}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {dept}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label>Modelo de Análise</Label>
              <Select 
                value={modeloAnalise} 
                onValueChange={(v) => setModeloAnalise(v as ModeloAnalise)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PADRAO">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Padrão (8 dimensões fixas)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="MATRIZ_RISCOS">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      <span>Matriz de Riscos (dimensões customizáveis)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {modeloAnalise === 'MATRIZ_RISCOS' 
                  ? "Crie dimensões ilimitadas e configure regras de cálculo personalizadas."
                  : "Use as 8 dimensões pré-definidas de saúde mental baseadas na NR1."}
              </p>
            </div>
          )}

          {/* Global Replication Toggle - only for new questionarios */}
          {isAdminMaster && !isEditing && (
            <GlobalReplicationToggle
              sourceCompanyId={effectiveCompanyId}
              enabled={replicateGlobally}
              onEnabledChange={setReplicateGlobally}
              disabled={isSaving || replicateQuestionario.isPending}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!titulo.trim() || isSaving || replicateQuestionario.isPending} type="button">
            {isSaving || replicateQuestionario.isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar e Configurar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
