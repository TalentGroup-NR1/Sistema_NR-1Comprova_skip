import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { parseEstrutura, type DBloco } from '@/lib/descricaoModelo';

export interface DescricaoModelo {
  id: string;
  company_id: string;
  nome: string;
  descricao: string | null;
  padrao: boolean;
  ativo: boolean;
  blocos: DBloco[];
}

export function useDescricaoModelos(companyId: string | null) {
  return useQuery({
    queryKey: ['descricao-modelos', companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<DescricaoModelo[]> => {
      const { data, error } = await supabase
        .from('descricao_modelos')
        .select('id,company_id,nome,descricao,padrao,ativo,estrutura')
        .eq('company_id', companyId as string)
        .order('nome');
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.id,
        company_id: m.company_id,
        nome: m.nome,
        descricao: m.descricao,
        padrao: m.padrao,
        ativo: m.ativo,
        blocos: parseEstrutura(m.estrutura).blocos,
      }));
    },
  });
}

export function useDescricaoModeloMutations(companyId: string | null) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['descricao-modelos'] });

  const salvar = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | null;
      values: {
        nome?: string;
        descricao?: string | null;
        padrao?: boolean;
        ativo?: boolean;
        blocos?: DBloco[];
      };
    }) => {
      const payload: Record<string, unknown> = {};
      if (values.nome !== undefined) payload.nome = values.nome;
      if (values.descricao !== undefined) payload.descricao = values.descricao;
      if (values.padrao !== undefined) payload.padrao = values.padrao;
      if (values.ativo !== undefined) payload.ativo = values.ativo;
      if (values.blocos !== undefined) payload.estrutura = { blocos: values.blocos };

      if (id) {
        const { error } = await supabase
          .from('descricao_modelos')
          .update(payload as never)
          .eq('id', id);
        if (error) throw error;
        return id;
      }
      if (!companyId) throw new Error('Selecione uma empresa antes de criar o modelo.');
      const { data, error } = await supabase
        .from('descricao_modelos')
        .insert({ ...payload, company_id: companyId } as never)
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Modelo salvo' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao salvar modelo', description: e.message, variant: 'destructive' }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('descricao_modelos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Modelo excluído' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' }),
  });

  const duplicar = useMutation({
    mutationFn: async (modelo: DescricaoModelo) => {
      if (!companyId) throw new Error('Selecione uma empresa.');
      const { error } = await supabase.from('descricao_modelos').insert({
        company_id: companyId,
        nome: `${modelo.nome} (cópia)`,
        descricao: modelo.descricao,
        padrao: false,
        ativo: true,
        estrutura: { blocos: modelo.blocos },
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Modelo duplicado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao duplicar', description: e.message, variant: 'destructive' }),
  });

  /** Marca um modelo como padrão da empresa e desmarca os demais. */
  const definirPadrao = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error('Selecione uma empresa.');
      const { error: e1 } = await supabase
        .from('descricao_modelos')
        .update({ padrao: false } as never)
        .eq('company_id', companyId);
      if (e1) throw e1;
      const { error } = await supabase
        .from('descricao_modelos')
        .update({ padrao: true } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Modelo padrão atualizado' });
    },
    onError: (e: Error) =>
      toast({ title: 'Erro ao definir padrão', description: e.message, variant: 'destructive' }),
  });

  return { salvar, excluir, duplicar, definirPadrao };
}
