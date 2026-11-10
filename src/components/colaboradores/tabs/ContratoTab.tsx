import { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { UserCheck } from 'lucide-react';
import {
  formatDateBR,
  contractTypeOptions,
  paymentMethodOptions,
  workShiftTypeOptions,
} from '@/lib/validators/colaborador';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';
import { useWorkSchedules, formatScheduleLabel } from '@/hooks/useWorkSchedules';
import { useColaboradores } from '@/hooks/useColaboradores';
import { useBancoHorasPerfis } from '@/hooks/useBancoHorasPerfis';
import { CargoCascadeSelect } from '@/components/colaboradores/CargoCascadeSelect';
import { useNiveisMaturidade } from '@/hooks/useEstruturaConfig';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';

interface ContratoTabProps {
  form: UseFormReturn<ColaboradorFormData>;
  colaboradorId?: string;
}

export function ContratoTab({ form, colaboradorId }: ContratoTabProps) {
  const { data: colaboradores = [] } = useColaboradores();
  const { perfis: perfisBH } = useBancoHorasPerfis();
  const { data: workSchedules = [] } = useWorkSchedules();
  const companyId = useEffectiveCompanyId();
  const { data: niveis = [] } = useNiveisMaturidade(companyId);
  const niveisAtivos = niveis.filter((n) => n.ativo);
  const [gestorSugerido, setGestorSugerido] = useState<{ id: string; name: string } | null>(null);

  // Filtrar gestores disponíveis (colaboradores ativos, exceto o próprio colaborador)
  const gestoresDisponiveis = colaboradores.filter(
    (c) => c.status === 'ATIVO' && c.id !== colaboradorId
  );

  const gestor_id = form.watch('gestor_id');
  const manager_name = form.watch('manager_name');

  // Verificar se há sugestão de gestor baseado no manager_name legado
  useEffect(() => {
    if (!gestor_id && manager_name && gestoresDisponiveis.length > 0) {
      const match = gestoresDisponiveis.find(
        (g) => g.full_name.toLowerCase() === manager_name.toLowerCase()
      );
      if (match) {
        setGestorSugerido({ id: match.id, name: match.full_name });
      } else {
        setGestorSugerido(null);
      }
    } else {
      setGestorSugerido(null);
    }
  }, [gestor_id, manager_name, gestoresDisponiveis]);

  const handleVincularGestor = () => {
    if (gestorSugerido) {
      form.setValue('gestor_id', gestorSugerido.id);
      setGestorSugerido(null);
    }
  };

  const handleSalaryChange = (value: string, onChange: (value: string) => void) => {
    // Remove tudo exceto números e vírgula
    let numbers = value.replace(/[^\d,]/g, '');
    
    // Garante apenas uma vírgula
    const parts = numbers.split(',');
    if (parts.length > 2) {
      numbers = parts[0] + ',' + parts.slice(1).join('');
    }
    
    // Limita casas decimais
    if (parts.length === 2 && parts[1].length > 2) {
      numbers = parts[0] + ',' + parts[1].slice(0, 2);
    }
    
    // Adiciona prefixo R$
    onChange(numbers ? `R$ ${numbers}` : '');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="contract_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Contrato *</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {contractTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <CargoCascadeSelect form={form} />


        <FormField
          control={form.control}
          name="job_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nível</FormLabel>
              <Select
                value={field.value || ''}
                onValueChange={(value) => field.onChange(value === '_none_' ? null : value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" side="bottom" className="bg-background z-50 max-h-60">
                  <SelectItem value="_none_">* (Sem nível)</SelectItem>
                  {niveisAtivos.map((n) => (
                    <SelectItem key={n.id} value={n.nome}>
                      {n.nome}
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
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Departamento/Seção *</FormLabel>
              <FormControl>
                <Input readOnly className="bg-muted" placeholder="Definido pela estrutura" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <FormField
          control={form.control}
          name="gestor_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gestor</FormLabel>
              <Select
                value={field.value || '_none_'}
                onValueChange={(value) => field.onChange(value === '_none_' ? null : value)}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar gestor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50 max-h-60">
                  <SelectItem value="_none_">Sem gestão</SelectItem>
                  {gestoresDisponiveis.map((gestor) => (
                    <SelectItem key={gestor.id} value={gestor.id}>
                      {gestor.full_name} - {gestor.job_title}
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
          name="base_salary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Salário Base *</FormLabel>
              <FormControl>
                <Input
                  placeholder="R$ 0,00"
                  {...field}
                  onChange={(e) => handleSalaryChange(e.target.value, field.onChange)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="payment_method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Forma de Pagamento *</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {paymentMethodOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
          name="work_shift_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Jornada</FormLabel>
              <Select
                value={field.value || ''}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {workShiftTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
          name="admission_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Admissão *</FormLabel>
              <FormControl>
                <Input
                  placeholder="DD/MM/AAAA"
                  {...field}
                  onChange={(e) => {
                    const formatted = formatDateBR(e.target.value);
                    field.onChange(formatted);
                  }}
                  maxLength={10}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="work_schedule_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horário de Trabalho</FormLabel>
              <Select
                value={field.value || "__none__"}
                onValueChange={(v) => {
                  if (v === "__none__") {
                    field.onChange(null);
                    form.setValue("work_schedule", "");
                  } else {
                    const sel = workSchedules.find((s) => s.id === v);
                    field.onChange(v);
                    if (sel) form.setValue("work_schedule", formatScheduleLabel(sel));
                  }
                }}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um horário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Sem horário definido</SelectItem>
                  {workSchedules.filter((s) => s.ativo).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{formatScheduleLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

      </div>

      {/* Sugestão de vinculação de gestor legado */}
      {gestorSugerido && (
        <Alert>
          <UserCheck className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Encontramos um gestor com nome semelhante ao cadastrado ({gestorSugerido.name}). Deseja vincular?
            </span>
            <Button size="sm" variant="outline" onClick={handleVincularGestor}>
              Vincular
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Banco de Horas */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="is_banco_horas"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <Label className="!mt-0 cursor-pointer" onClick={() => field.onChange(!field.value)}>
                Banco de Horas
              </Label>
              <p className="text-xs text-muted-foreground !mt-0 ml-2">
                {field.value ? "Horas excedentes acumulam no banco" : "Horas excedentes são pagas como hora extra"}
              </p>
            </FormItem>
          )}
        />

        {form.watch("is_banco_horas") && (
          <FormField
            control={form.control}
            name={"banco_horas_perfil_id" as any}
            render={({ field }) => (
              <FormItem className="max-w-md">
                <FormLabel>Perfil de Banco de Horas</FormLabel>
                <Select
                  value={field.value || "__padrao__"}
                  onValueChange={(v) => field.onChange(v === "__padrao__" ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__padrao__">Usar padrão da empresa</SelectItem>
                    {perfisBH.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} ({p.periodo_fechamento_banco})
                        {p.is_padrao ? " • padrão" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define o ciclo (mensal, quadrimestral, etc.) usado no banco de horas deste colaborador.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>


      {/* Substituição */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="is_substituicao"
          render={({ field }) => (
            <FormItem className="flex items-center gap-3">
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      form.setValue('substituicao_colaborador_id', null);
                    }
                  }}
                />
              </FormControl>
              <Label className="!mt-0 cursor-pointer" onClick={() => field.onChange(!field.value)}>
                Substituição?
              </Label>
            </FormItem>
          )}
        />

        {form.watch('is_substituicao') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="substituicao_colaborador_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Colaborador Substituído</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={(value) => field.onChange(value || null)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar colaborador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50">
                      {gestoresDisponiveis.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum colaborador disponível
                        </div>
                      ) : (
                        gestoresDisponiveis.map((colab) => (
                          <SelectItem key={colab.id} value={colab.id}>
                            {colab.full_name} - {colab.job_title}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>


      {/* Campo legado oculto para compatibilidade */}
      <input type="hidden" {...form.register('manager_name')} />
    </div>
  );
}
