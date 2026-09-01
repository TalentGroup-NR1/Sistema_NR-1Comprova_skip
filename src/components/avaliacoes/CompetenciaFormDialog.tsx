import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompetenciaMutations, useMetricasCiclo, CompetenciaCiclo, CompetenciaInput } from "@/hooks/useAvaliacoes";

const competenciaSchema = z.object({
  nome_competencia: z.string().min(1, "Nome é obrigatório"),
  conceito_competencia: z.string().optional(),
  texto_pergunta_autoavaliacao: z.string().min(1, "Pergunta de autoavaliação é obrigatória"),
  texto_pergunta_gestor: z.string().min(1, "Pergunta do gestor é obrigatória"),
  metrica_id: z.string().optional(),
  ordem: z.number().default(0),
});

type CompetenciaFormData = z.infer<typeof competenciaSchema>;

interface CompetenciaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cicloId: string;
  competencia?: CompetenciaCiclo | null;
}

export function CompetenciaFormDialog({ open, onOpenChange, cicloId, competencia }: CompetenciaFormDialogProps) {
  const { createCompetencia, updateCompetencia } = useCompetenciaMutations(cicloId);
  const { data: metricas } = useMetricasCiclo(cicloId);
  const isEditing = !!competencia;

  const form = useForm<CompetenciaFormData>({
    resolver: zodResolver(competenciaSchema),
    defaultValues: {
      nome_competencia: "",
      conceito_competencia: "",
      texto_pergunta_autoavaliacao: "",
      texto_pergunta_gestor: "",
      metrica_id: "",
      ordem: 0,
    },
  });

  const nomeCompetencia = form.watch("nome_competencia");

  useEffect(() => {
    if (competencia) {
      form.reset({
        nome_competencia: competencia.nome_competencia,
        conceito_competencia: competencia.conceito_competencia || "",
        texto_pergunta_autoavaliacao: competencia.texto_pergunta_autoavaliacao || "",
        texto_pergunta_gestor: competencia.texto_pergunta_gestor || "",
        metrica_id: competencia.metrica_id || "",
        ordem: competencia.ordem,
      });
    } else {
      form.reset({
        nome_competencia: "",
        conceito_competencia: "",
        texto_pergunta_autoavaliacao: "",
        texto_pergunta_gestor: "",
        metrica_id: "",
        ordem: 0,
      });
    }
  }, [competencia, form]);

  // Auto-generate question texts when name changes (only for new competencies)
  useEffect(() => {
    if (!isEditing && nomeCompetencia) {
      const currentAuto = form.getValues("texto_pergunta_autoavaliacao");
      const currentGestor = form.getValues("texto_pergunta_gestor");
      
      if (!currentAuto || currentAuto.startsWith("Como você avalia seu desempenho em")) {
        form.setValue("texto_pergunta_autoavaliacao", `Como você avalia seu desempenho em ${nomeCompetencia}?`);
      }
      if (!currentGestor || currentGestor.startsWith("Avalie o desempenho do colaborador em")) {
        form.setValue("texto_pergunta_gestor", `Avalie o desempenho do colaborador em ${nomeCompetencia}`);
      }
    }
  }, [nomeCompetencia, isEditing, form]);

  const onSubmit = async (data: CompetenciaFormData) => {
    try {
      const input: CompetenciaInput = {
        nome_competencia: data.nome_competencia,
        conceito_competencia: data.conceito_competencia || null,
        texto_pergunta_autoavaliacao: data.texto_pergunta_autoavaliacao,
        texto_pergunta_gestor: data.texto_pergunta_gestor,
        metrica_id: data.metrica_id || null,
        ordem: data.ordem,
      };

      if (isEditing) {
        await updateCompetencia.mutateAsync({ id: competencia.id, ...input });
      } else {
        await createCompetencia.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Competência" : "Nova Competência"}</DialogTitle>
          <DialogDescription>
            Defina uma competência a ser avaliada neste ciclo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_competencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Competência</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Comunicação, Liderança, Trabalho em Equipe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conceito_competencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conceito / Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o que significa esta competência e como ela deve ser avaliada..." 
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
              <h4 className="text-sm font-medium text-foreground">Textos das Perguntas</h4>
              
              <FormField
                control={form.control}
                name="texto_pergunta_autoavaliacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta (Autoavaliação)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Como você avalia seu desempenho em Comunicação?" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="texto_pergunta_gestor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta (Gestor)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Ex: Avalie o desempenho do colaborador em Comunicação" 
                        rows={2}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="metrica_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Métrica de Avaliação</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma métrica (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhuma métrica</SelectItem>
                      {metricas?.map((metrica) => (
                        <SelectItem key={metrica.id} value={metrica.id}>
                          {metrica.nome_metrica}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createCompetencia.isPending || updateCompetencia.isPending}>
                {isEditing ? "Salvar" : "Criar Competência"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
