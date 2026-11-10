import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserCheck, Loader2 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useReativarColaborador } from '@/hooks/useDesligamentos';

const formSchema = z.object({
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ReativarColaboradorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaborador: {
    id: string;
    full_name: string;
    department: string;
    job_title: string;
  } | null;
}

export function ReativarColaboradorDialog({
  open,
  onOpenChange,
  colaborador,
}: ReativarColaboradorDialogProps) {
  const reativarMutation = useReativarColaborador();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      observacao: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!colaborador) return;

    await reativarMutation.mutateAsync({
      colaboradorId: colaborador.id,
      observacao: values.observacao,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <UserCheck className="h-5 w-5" />
            Reativar Colaborador
          </DialogTitle>
          <DialogDescription>
            {colaborador && (
              <span>
                Confirme a reativação de <strong>{colaborador.full_name}</strong>.
                O colaborador voltará a ter acesso ao sistema.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Motivo da reativação ou outras observações..."
                      className="resize-none"
                      rows={3}
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
              <Button type="submit" disabled={reativarMutation.isPending}>
                {reativarMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirmar Reativação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
