import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CriarMeuPDIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  avaliacaoId: string;
  cicloId: string;
  colaboradorId: string;
}

export function CriarMeuPDIDialog({
  open,
  onOpenChange,
  avaliacaoId,
  cicloId,
  colaboradorId,
}: CriarMeuPDIDialogProps) {
  const [dataFim, setDataFim] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await supabase
      .from('pdis')
      .insert({
        avaliacao_id: avaliacaoId,
        ciclo_id: cicloId,
        colaborador_id: colaboradorId,
        data_fim_prevista: dataFim || null,
        observacoes_gerais: observacoes || null,
        created_by_colaborador: true,
      } as any);

    setIsSubmitting(false);

    if (error) {
      toast.error("Erro ao criar PDI: " + error.message);
      return;
    }

    toast.success("PDI criado com sucesso!");
    queryClient.invalidateQueries({ queryKey: ['minhas-pdis'] });
    queryClient.invalidateQueries({ queryKey: ['minhas-avaliacoes'] });
    queryClient.invalidateQueries({ queryKey: ['pdi-by-avaliacao', avaliacaoId] });

    onOpenChange(false);
    setDataFim("");
    setObservacoes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Meu PDI</DialogTitle>
          <DialogDescription>
            Crie seu Plano de Desenvolvimento Individual a partir desta avaliação. Você poderá adicionar ações de desenvolvimento depois.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_fim">Data prevista de conclusão</Label>
            <Input
              id="data_fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações (opcional)</Label>
            <Textarea
              id="observacoes"
              placeholder="Descreva seus objetivos de desenvolvimento..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar PDI
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
