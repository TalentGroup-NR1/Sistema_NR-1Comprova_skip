import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
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
import { formatPhoneBR, formatCEP } from '@/lib/validators/colaborador';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';

interface ContatoEnderecoTabProps {
  form: UseFormReturn<ColaboradorFormData>;
}

const estados = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ContatoEnderecoTab({ form }: ContatoEnderecoTabProps) {
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [linkStatus, setLinkStatus] = useState<{ canLink: boolean; reason: string } | null>(null);
  const effectiveCompanyId = useEffectiveCompanyId();

  const handleCepBlur = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue('address_street', data.logradouro || '');
        form.setValue('address_neighborhood', data.bairro || '');
        form.setValue('address_city', data.localidade || '');
        form.setValue('address_state', data.uf || '');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleEmailBlur = async (email: string) => {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed || !effectiveCompanyId || !trimmed.includes('@')) {
      setLinkStatus(null);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const { data, error } = await supabase.rpc('check_email_vinculacao', {
        p_email: trimmed,
        p_company_id: effectiveCompanyId,
      });

      if (!error && data) {
        const res = data as any;
        setLinkStatus({
          canLink: !!res.can_link,
          reason: res.reason,
        });
      } else {
        setLinkStatus(null);
      }
    } catch {
      setLinkStatus(null);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* E-mails */}
      <div>
        <h3 className="text-lg font-medium mb-4">E-mails</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email_pessoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail Pessoal *</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email.pessoal@exemplo.com"
                    {...field}
                    value={field.value || ''}
                    onBlur={(e) => {
                      field.onBlur();
                      handleEmailBlur(e.target.value);
                    }}
                  />
                </FormControl>
                {linkStatus?.canLink && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 py-1 px-2.5 mt-2 text-xs font-normal">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Conta de usuário identificada nesta empresa. A ficha será vinculada à conta existente (sem nova senha).</span>
                  </Badge>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="corporate_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail Corporativo</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@empresa.com"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Telefones */}
      <div>
        <h3 className="text-lg font-medium mb-4">Telefones</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone Principal</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+55 11 99999-9999"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const formatted = formatPhoneBR(e.target.value);
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
            name="telefone_secundario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone Secundário</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+55 11 99999-9999"
                    {...field}
                    value={field.value || ''}
                    onChange={(e) => {
                      const formatted = formatPhoneBR(e.target.value);
                      field.onChange(formatted);
                    }}
                    maxLength={18}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Endereço */}
      <div>
        <h3 className="text-lg font-medium mb-4">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="address_zip_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      placeholder="99999-999"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        const formatted = formatCEP(e.target.value);
                        field.onChange(formatted);
                      }}
                      onBlur={(e) => handleCepBlur(e.target.value)}
                      maxLength={9}
                    />
                    {isLoadingCep && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address_country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>País</FormLabel>
                <Select
                  value={field.value || 'Brasil'}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Brasil">Brasil</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address_state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
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
                    {estados.map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {estado}
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
            name="address_city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input placeholder="Cidade" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address_street"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Logradouro</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, Avenida, etc." {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input placeholder="Nº" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address_complement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input placeholder="Apto, Bloco, etc." {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address_neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bairro</FormLabel>
                <FormControl>
                  <Input placeholder="Bairro" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
