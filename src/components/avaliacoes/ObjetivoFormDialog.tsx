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
import { useObjetivoMutations, useMetricasCiclo, ObjetivoCiclo, ObjetivoInput } from "@/hooks/useAvaliacoes";

const objetivoSchema = z.object({
  nome_objetivo: z.string().min(1, "Nome é obrigatório"),
  descricao_objetivo: z.string().optional(),
  texto_pergunta_autoavaliacao: z.string().min(1, "Pergunta de autoavaliação é obrigatória"),
  texto_pergunta_gestor: z.string().min(1, "Pergunta do gestor é obrigatória"),
  metrica_id: z.string().optional(),
  ordem: z.number().default(0),
});

type ObjetivoFormData = z.infer<typeof objetivoSchema>;

interface ObjetivoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cicloId: string;
  objetivo?: ObjetivoCiclo | null;
}

export function ObjetivoFormDialog({ open, onOpenChange, cicloId, objetivo }: ObjetivoFormDialogProps) {
  const { createObjetivo, updateObjetivo } = useObjetivoMutations(cicloId);
  const { data: metricas } = useMetricasCiclo(cicloId);
  const isEditing = !!objetivo;

  const form = useForm<ObjetivoFormData>({
    resolver: zodResolver(objetivoSchema),
    defaultValues: {
      nome_objetivo: "",
      descricao_objetivo: "",
      texto_pergunta_autoavaliacao: "",
      texto_pergunta_gestor: "",
      metrica_id: "",
      ordem: 0,
    },
  });

  const nomeObjetivo = form.watch("nome_objetivo");

  useEffect(() => {
    if (objetivo) {
      form.reset({
        nome_objetivo: objetivo.nome_objetivo,
        descricao_objetivo: objetivo.descricao_objetivo || "",
        texto_pergunta_autoavaliacao: objetivo.texto_pergunta_autoavaliacao || "",
        texto_pergunta_gestor: objetivo.texto_pergunta_gestor || "",
        metrica_id: objetivo.metrica_id || "",
        ordem: objetivo.ordem,
      });
    } else {
      form.reset({
        nome_objetivo: "",
        descricao_objetivo: "",
        texto_pergunta_autoavaliacao: "",
        texto_pergunta_gestor: "",
        metrica_id: "",
        ordem: 0,
      });
    }
  }, [objetivo, form]);

  // Auto-generate question texts when name changes (only for new objectives)
  useEffect(() => {
    if (!isEditing && nomeObjetivo) {
      const currentAuto = form.getValues("texto_pergunta_autoavaliacao");
      const currentGestor = form.getValues("texto_pergunta_gestor");
      
      if (!currentAuto || currentAuto.startsWith("Como você avalia seu desempenho no objetivo")) {
        form.setValue("texto_pergunta_autoavaliacao", `Como você avalia seu desempenho no objetivo ${nomeObjetivo}?`);
      }
      if (!currentGestor || currentGestor.startsWith("Avalie o desempenho do colaborador no objetivo")) {
        form.setValue("texto_pergunta_gestor", `Avalie o desempenho do colaborador no objetivo ${nomeObjetivo}`);
      }
    }
  }, [nomeObjetivo, isEditing, form]);

  const onSubmit = async (data: ObjetivoFormData) => {
    try {
      const input: ObjetivoInput = {
        nome_objetivo: data.nome_objetivo,
        descricao_objetivo: data.descricao_objetivo || null,
        texto_pergunta_autoavaliacao: data.texto_pergunta_autoavaliacao,
        texto_pergunta_gestor: data.texto_pergunta_gestor,
        metrica_id: data.metrica_id || null,
        ordem: data.ordem,
      };

      if (isEditing) {
        await updateObjetivo.mutateAsync({ id: objetivo.id, ...input });
      } else {
        await createObjetivo.mutateAsync(input);
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
          <DialogTitle>{isEditing ? "Editar Objetivo" : "Novo Objetivo"}</DialogTitle>
          <DialogDescription>
            Defina um objetivo a ser avaliado neste ciclo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_objetivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Objetivo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aumentar vendas em 20%, Reduzir custos operacionais" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao_objetivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva o objetivo em detalhes, incluindo metas e indicadores..." 
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
                        placeholder="Ex: Como você avalia seu desempenho neste objetivo?" 
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
                        placeholder="Ex: Avalie o desempenho do colaborador neste objetivo" 
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
              <Button type="submit" disabled={createObjetivo.isPending || updateObjetivo.isPending}>
                {isEditing ? "Salvar" : "Criar Objetivo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
