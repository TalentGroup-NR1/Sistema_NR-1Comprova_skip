import { useState, useEffect } from "react";
import { Layers, Settings } from "lucide-react";
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
} from "@/hooks/useCuidarMaisQuestionarios";
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

  const { isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const createQuestionario = useCreateQuestionarioCuidarPlus();
  const updateQuestionario = useUpdateQuestionarioCuidarPlus();
  const replicateQuestionario = useReplicateQuestionarioCuidarPlus();

  const isEditing = !!questionario;

  useEffect(() => {
    if (open) {
      if (questionario) {
        setTitulo(questionario.titulo);
        setDescricao(questionario.descricao || "");
        setModeloAnalise(questionario.modelo_analise || 'PADRAO');
        setReplicateGlobally(false);
      } else {
        setTitulo("");
        setDescricao("");
        setModeloAnalise('PADRAO');
        setReplicateGlobally(false);
      }
    }
  }, [open, questionario]);

  const handleSave = async () => {
    if (!titulo.trim()) {
      toast.error("Título é obrigatório");
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing) {
        await updateQuestionario.mutateAsync({
          id: questionario.id,
          titulo,
          descricao,
        });
        toast.success("Questionário atualizado");
        onSaved?.();
      } else {
        const result = await createQuestionario.mutateAsync({
          titulo,
          descricao,
          modelo_analise: modeloAnalise,
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
