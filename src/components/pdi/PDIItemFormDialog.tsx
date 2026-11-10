import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Award, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  useCreatePDIItem, 
  useUpdatePDIItem,
  PDIItem,
  PDIItemTipoAlvo,
  PDIItemTipoAcao,
  PDIItemResponsavel,
} from "@/hooks/usePDI";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const formSchema = z.object({
  tipo_alvo: z.enum(['competencia', 'objetivo', 'geral']),
  competencia_id: z.string().nullable(),
  objetivo_id: z.string().nullable(),
  titulo: z.string().min(1, "Título é obrigatório"),
  descricao: z.string().nullable(),
  tipo_acao: z.enum(['treinamento', 'mentoria', 'projeto_pratico', 'leitura', 'coaching', 'feedbacks_periodicos', 'outro']),
  responsavel: z.enum(['colaborador', 'gestor', 'rh']),
  prazo: z.date().nullable(),
});

type FormData = z.infer<typeof formSchema>;

const tipoAcaoOptions: { value: PDIItemTipoAcao; label: string }[] = [
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'mentoria', label: 'Mentoria' },
  { value: 'projeto_pratico', label: 'Projeto Prático' },
  { value: 'leitura', label: 'Leitura' },
  { value: 'coaching', label: 'Coaching' },
  { value: 'feedbacks_periodicos', label: 'Feedbacks Periódicos' },
  { value: 'outro', label: 'Outro' },
];

const responsavelOptions: { value: PDIItemResponsavel; label: string }[] = [
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'rh', label: 'RH' },
];

interface PDIItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdiId: string;
  cicloId: string;
  editingItem?: PDIItem | null;
}

export function PDIItemFormDialog({ 
  open, 
  onOpenChange, 
  pdiId, 
  cicloId,
  editingItem,
}: PDIItemFormDialogProps) {
  const createItem = useCreatePDIItem();
  const updateItem = useUpdatePDIItem();
  const isEditing = !!editingItem;
  
  // Fetch competencias and objetivos for the cycle
  const { data: competencias } = useQuery({
    queryKey: ['competencias-ciclo', cicloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competencias_ciclo')
        .select('id, nome_competencia')
        .eq('ciclo_id', cicloId)
        .order('ordem');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });
  
  const { data: objetivos } = useQuery({
    queryKey: ['objetivos-ciclo', cicloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('objetivos_ciclo')
        .select('id, nome_objetivo')
        .eq('ciclo_id', cicloId)
        .order('ordem');
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipo_alvo: 'geral',
      competencia_id: null,
      objetivo_id: null,
      titulo: '',
      descricao: null,
      tipo_acao: 'outro',
      responsavel: 'colaborador',
      prazo: null,
    },
  });

  // Reset form when dialog opens or editing item changes
  useEffect(() => {
    if (open) {
      if (editingItem) {
        form.reset({
          tipo_alvo: editingItem.tipo_alvo,
          competencia_id: editingItem.competencia_id,
          objetivo_id: editingItem.objetivo_id,
          titulo: editingItem.titulo,
          descricao: editingItem.descricao,
          tipo_acao: editingItem.tipo_acao,
          responsavel: editingItem.responsavel,
          prazo: editingItem.prazo ? new Date(editingItem.prazo) : null,
        });
      } else {
        form.reset({
          tipo_alvo: 'geral',
          competencia_id: null,
          objetivo_id: null,
          titulo: '',
          descricao: null,
          tipo_acao: 'outro',
          responsavel: 'colaborador',
          prazo: null,
        });
      }
    }
  }, [open, editingItem, form]);

  const tipoAlvo = form.watch('tipo_alvo');

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing && editingItem) {
        await updateItem.mutateAsync({
          id: editingItem.id,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo_acao: data.tipo_acao,
          responsavel: data.responsavel,
          prazo: data.prazo ? format(data.prazo, 'yyyy-MM-dd') : null,
        });
      } else {
        await createItem.mutateAsync({
          pdi_id: pdiId,
          tipo_alvo: data.tipo_alvo,
          competencia_id: data.tipo_alvo === 'competencia' ? data.competencia_id : null,
          objetivo_id: data.tipo_alvo === 'objetivo' ? data.objetivo_id : null,
          titulo: data.titulo,
          descricao: data.descricao,
          tipo_acao: data.tipo_acao,
          responsavel: data.responsavel,
          prazo: data.prazo ? format(data.prazo, 'yyyy-MM-dd') : null,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving item:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Ação' : 'Adicionar Ação ao PDI'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifique os detalhes da ação de desenvolvimento.'
              : 'Defina uma nova ação de desenvolvimento para o colaborador.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEditing && (
              <>
                <FormField
                  control={form.control}
                  name="tipo_alvo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Alvo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="geral">Geral</SelectItem>
                          <SelectItem value="competencia">Competência</SelectItem>
                          <SelectItem value="objetivo">Objetivo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Vincule a ação a uma competência ou objetivo da avaliação
                      </FormDescription>
                    </FormItem>
                  )}
                />

                {tipoAlvo === 'competencia' && (
                  <FormField
                    control={form.control}
                    name="competencia_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competência</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma competência..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {competencias?.map(comp => (
                              <SelectItem key={comp.id} value={comp.id}>
                                <span className="flex items-center gap-2">
                                  <Award className="h-4 w-4" />
                                  {comp.nome_competencia}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}

                {tipoAlvo === 'objetivo' && (
                  <FormField
                    control={form.control}
                    name="objetivo_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Objetivo</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um objetivo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {objetivos?.map(obj => (
                              <SelectItem key={obj.id} value={obj.id}>
                                <span className="flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  {obj.nome_objetivo}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da Ação</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Treinamento em Liderança" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva os detalhes da ação..."
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tipo_acao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Ação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tipoAcaoOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {responsavelOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="prazo"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prazo (opcional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                {isEditing ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
