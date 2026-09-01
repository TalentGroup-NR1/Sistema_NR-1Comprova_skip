import { UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';

interface AlinhamentoTabProps {
  form: UseFormReturn<ColaboradorFormData>;
}

export function AlinhamentoTab({ form }: AlinhamentoTabProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="alinhamento_notas"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas de Alinhamento</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Registre aqui observações e notas de alinhamento com o colaborador..."
                className="min-h-[300px] resize-y"
                maxLength={5000}
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <div className="flex justify-between">
              <FormMessage />
              <span className="text-xs text-muted-foreground">
                {(field.value || '').length}/5000
              </span>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
