import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, UserMinus, Loader2 } from 'lucide-react';
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
import { useDesligarColaborador } from '@/hooks/useDesligamentos';

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

interface DesligarColaboradorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: {
    id: string;
    full_name: string;
    department: string;
    job_title: string;
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

export function DesligarColaboradorDialog({
  open,
  onOpenChange,
  colaborador,
}: DesligarColaboradorDialogProps) {
  const desligarMutation = useDesligarColaborador();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      motivoDesligamento: '',
      motivoDetalhado: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!colaborador) return;

    await desligarMutation.mutateAsync({
      colaboradorId: colaborador.id,
      dataDesligamento: format(values.dataDesligamento, 'yyyy-MM-dd'),
      tipoDesligamento: values.tipoDesligamento,
      motivoDesligamento: values.motivoDesligamento,
      motivoDetalhado: values.motivoDetalhado,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserMinus className="h-5 w-5" />
            Desligar Colaborador
          </DialogTitle>
          <DialogDescription>
            {colaborador && (
              <span>
                Confirme o desligamento de <strong>{colaborador.full_name}</strong> (
                {colaborador.job_title} - {colaborador.department}).
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={desligarMutation.isPending}
              >
                {desligarMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Desligamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
