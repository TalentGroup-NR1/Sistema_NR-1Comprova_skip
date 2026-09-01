import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Pencil, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useEditarDesligamento } from '@/hooks/useDesligamentos';
import { formatDateToISO, parseISODate } from '@/lib/validators/colaborador';

const formSchema = z.object({
  dataDesligamento: z.date({
    required_error: 'Data de desligamento é obrigatória',
  }),
  tipoDesligamento: z.string({
    required_error: 'Tipo de desligamento é obrigatório',
  }),
  motivoDesligamento: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres'),
  motivoDetalhado: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditarDesligamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: {
    id: string;
    full_name: string;
    termination_date: string | null;
    tipo_desligamento: string | null;
    motivo_desligamento: string | null;
    motivo_detalhado: string | null;
  } | null;
}

const TIPOS_DESLIGAMENTO = [
  { value: 'pedido_demissao', label: 'Pedido de demissão' },
  { value: 'sem_justa_causa', label: 'Demissão sem justa causa' },
  { value: 'justa_causa', label: 'Demissão por justa causa' },
  { value: 'termino_contrato', label: 'Término de contrato' },
  { value: 'acordo', label: 'Acordo entre as partes' },
  { value: 'outros', label: 'Outros' },
];

export function EditarDesligamentoDialog({
  open,
  onOpenChange,
  colaborador,
}: EditarDesligamentoDialogProps) {
  const editarMutation = useEditarDesligamento();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      motivoDesligamento: '',
      motivoDetalhado: '',
    },
  });

  useEffect(() => {
    if (colaborador && open) {
      form.reset({
        dataDesligamento: colaborador.termination_date
          ? parseISODate(colaborador.termination_date)
          : undefined,
        tipoDesligamento: colaborador.tipo_desligamento || undefined,
        motivoDesligamento: colaborador.motivo_desligamento || '',
        motivoDetalhado: colaborador.motivo_detalhado || '',
      });
    }
  }, [colaborador, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!colaborador) return;

    await editarMutation.mutateAsync({
      colaboradorId: colaborador.id,
      dataDesligamento: formatDateToISO(values.dataDesligamento),
      tipoDesligamento: values.tipoDesligamento,
      motivoDesligamento: values.motivoDesligamento,
      motivoDetalhado: values.motivoDetalhado,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Desligamento
          </DialogTitle>
          <DialogDescription>
            {colaborador && (
              <span>
                Editando dados do desligamento de <strong>{colaborador.full_name}</strong>.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="dataDesligamento"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Desligamento *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoDesligamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Desligamento *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS_DESLIGAMENTO.map((tipo) => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivoDesligamento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo do desligamento..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivoDetalhado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Adicionais</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais (opcional)..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editarMutation.isPending}>
                {editarMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
