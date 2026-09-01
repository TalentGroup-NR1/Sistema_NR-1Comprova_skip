import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { formatCPF, formatCNPJ } from '@/lib/validators/colaborador';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';

interface DocumentacaoTabProps {
  form: UseFormReturn<ColaboradorFormData>;
}

export function DocumentacaoTab({ form }: DocumentacaoTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="cpf"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPF *</FormLabel>
              <FormControl>
                <Input
                  placeholder="999.999.999-99"
                  {...field}
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    field.onChange(formatted);
                  }}
                  maxLength={14}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input
                  placeholder="99.999.999/9999-99"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => {
                    const formatted = formatCNPJ(e.target.value);
                    field.onChange(formatted);
                  }}
                  maxLength={18}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="razao_social"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razão Social</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nome da razão social"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="data_pagamento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Pagamento</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Dia 05, Dia 15"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>RG</FormLabel>
              <FormControl>
                <Input
                  placeholder="Número do RG"
                  {...field}
                  value={field.value || ''}
                  maxLength={30}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pis"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do PIS</FormLabel>
              <FormControl>
                <Input
                  placeholder="000.00000.00-0"
                  {...field}
                  value={field.value || ''}
                  maxLength={20}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ctps_numero"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Carteira de Trabalho (Número)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Número da CTPS"
                  {...field}
                  value={field.value || ''}
                  maxLength={20}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ctps_serie"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Carteira de Trabalho (Série)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Série da CTPS"
                  {...field}
                  value={field.value || ''}
                  maxLength={20}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
