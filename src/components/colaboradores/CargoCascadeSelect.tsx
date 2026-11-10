import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useCargos, useDepartamentos } from '@/hooks/useEstruturaConfig';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';

interface Props {
  form: UseFormReturn<ColaboradorFormData>;
}

export function CargoCascadeSelect({ form }: Props) {
  const companyId = useEffectiveCompanyId();
  const cargoId = form.watch('cargo_id') as string | null | undefined;
  const departamento = form.watch('department') as string | undefined;

  const { data: cargos = [] } = useCargos(companyId);
  const { data: departamentos = [] } = useDepartamentos(companyId);

  const aplicarCargo = (id: string) => {
    if (id === '_none_') {
      form.setValue('cargo_id', null, { shouldDirty: true });
      form.setValue('job_title', 'Não definido', { shouldDirty: true, shouldValidate: true });
      return;
    }
    const cargo = cargos.find((c) => c.id === id);
    form.setValue('cargo_id', id, { shouldDirty: true });
    if (cargo) form.setValue('job_title', cargo.nome, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div className="col-span-full space-y-4 rounded-xl border p-4">
      <div>
        <p className="text-sm font-medium">Estrutura Organizacional</p>
        <p className="text-xs text-muted-foreground">
          Selecione o departamento e o cargo cadastrados no módulo Estrutura Organizacional.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label>Departamento</Label>
          <Select
            value={departamento ?? ''}
            onValueChange={(v) => form.setValue('department', v, { shouldDirty: true, shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="z-50 bg-background">
              <SelectItem value="Não definido">Não definido</SelectItem>
              {departamentos.map((d) => (
                <SelectItem key={d.id} value={d.nome}>
                  {d.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <FormField
          control={form.control}
          name="cargo_id"
          render={() => (
            <FormItem>
              <FormLabel>Cargo *</FormLabel>
              <Select
                value={cargoId ?? (form.watch('job_title') === 'Não definido' ? '_none_' : '')}
                onValueChange={aplicarCargo}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-background">
                  <SelectItem value="_none_">Não definido</SelectItem>
                  {cargos.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.cbo_codigo ? `${c.nome} (CBO ${c.cbo_codigo})` : c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
