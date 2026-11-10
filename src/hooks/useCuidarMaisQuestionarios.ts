import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface EscalaConfigItem {
  valor: number;
  rotulo: string;
}

export interface ConfigCalculo {
  limite_risco: number;
  alerta_media_minima: number;
  alerta_risco_percentual: number;
  alerta_queda_delta: number;
}

export interface PerguntaCuidarPlus {
  id: string;
  questionario_id: string;
  pergunta_texto: string;
  tipo_pergunta: 'LIKERT_5' | 'TEXTO_LIVRE';
  order_index: number;
  escala_config: EscalaConfigItem[] | null;
  dimensao: string | null;
  dimensao_questionario_id: string | null;
  is_invertida: boolean;
  bloco: string | null;
  peso: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionarioCuidarPlus {
  id: string;
  company_id: string;
  titulo: string;
  descricao: string | null;
  is_active: boolean;
  modelo_analise: 'PADRAO' | 'MATRIZ_RISCOS';
  escala_config: EscalaConfigItem[] | null;
  config_calculo: ConfigCalculo | null;
  data_ativacao: string | null;
  data_desativacao: string | null;
  created_by_user_id: string | null;
  audiencia_tipo: 'todos' | 'departamentos';
  alvos?: string[];
  created_at: string;
  updated_at: string;
}

export interface QuestionarioWithPerguntas extends QuestionarioCuidarPlus {
  perguntas_cuidar_plus: PerguntaCuidarPlus[];
}

export interface EnvioCuidarPlus {
  id: string;
  questionario_id: string;
  colaborador_id: string;
  token: string;
  status: 'PENDENTE' | 'RESPONDIDO';
  created_at: string;
  responded_at: string | null;
  colaboradores?: {
    id: string;
    full_name: string;
    corporate_email: string;
  };
}

// Hook para listar questionários
export const useQuestionariosCuidarPlus = () => {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['questionarios-cuidar-plus', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('questionarios_cuidar_plus')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to match our interface
      return (data || []).map((item): QuestionarioCuidarPlus => ({
        id: item.id,
        company_id: item.company_id,
        titulo: item.titulo,
        descricao: item.descricao,
        is_active: item.is_active,
        modelo_analise: ((item as any).modelo_analise || 'PADRAO') as 'PADRAO' | 'MATRIZ_RISCOS',
        escala_config: item.escala_config ? (item.escala_config as unknown as EscalaConfigItem[]) : null,
        config_calculo: item.config_calculo ? (item.config_calculo as unknown as ConfigCalculo) : null,
        data_ativacao: item.data_ativacao,
        data_desativacao: item.data_desativacao,
        created_by_user_id: item.created_by_user_id,
        audiencia_tipo: (item as any).audiencia_tipo || 'todos',
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
    },
    enabled: !!companyId,
  });
};

// Hook para buscar um questionário com perguntas
export const useQuestionarioCuidarPlus = (id: string | null) => {
  return useQuery({
    queryKey: ['questionario-cuidar-plus', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('questionarios_cuidar_plus')
        .select(`
          *,
          perguntas_cuidar_plus (*),
          questionarios_cuidar_plus_alvos (departamento_nome)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      // Sort perguntas by order_index and transform to proper types
      const perguntas = (data.perguntas_cuidar_plus || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map((p): PerguntaCuidarPlus => ({
          id: p.id,
          questionario_id: p.questionario_id,
          pergunta_texto: p.pergunta_texto,
          tipo_pergunta: p.tipo_pergunta as 'LIKERT_5' | 'TEXTO_LIVRE',
          order_index: p.order_index,
          escala_config: Array.isArray(p.escala_config) ? (p.escala_config as unknown as EscalaConfigItem[]) : null,
          dimensao: (p as any).dimensao || null,
          dimensao_questionario_id: (p as any).dimensao_questionario_id || null,
          is_invertida: (p as any).is_invertida || false,
          bloco: (p as any).bloco || null,
          peso: (p as any).peso ?? 1,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
      
      // Parse escala_config and config_calculo from JSONB
      const escalaConfig = data.escala_config 
        ? (Array.isArray(data.escala_config) ? data.escala_config as unknown as EscalaConfigItem[] : null)
        : null;
      
      const configCalculo = data.config_calculo 
        ? (data.config_calculo as unknown as ConfigCalculo)
        : null;
      
      return {
        id: data.id,
        company_id: data.company_id,
        titulo: data.titulo,
        descricao: data.descricao,
        is_active: data.is_active,
        modelo_analise: (data as any).modelo_analise || 'PADRAO',
        escala_config: escalaConfig,
        config_calculo: configCalculo,
        data_ativacao: data.data_ativacao,
        data_desativacao: data.data_desativacao,
        created_by_user_id: data.created_by_user_id,
        audiencia_tipo: (data as any).audiencia_tipo || 'todos',
        alvos: data.questionarios_cuidar_plus_alvos ? data.questionarios_cuidar_plus_alvos.map((a: any) => a.departamento_nome) : [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        perguntas_cuidar_plus: perguntas,
      } as QuestionarioWithPerguntas;
    },
    enabled: !!id,
  });
};

// Hook para criar questionário
export const useCreateQuestionarioCuidarPlus = () => {
  const queryClient = useQueryClient();
  const companyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: async (data: { 
      titulo: string; 
      descricao?: string;
      modelo_analise?: 'PADRAO' | 'MATRIZ_RISCOS';
      escala_config?: EscalaConfigItem[];
      config_calculo?: ConfigCalculo;
      audiencia_tipo?: 'todos' | 'departamentos';
      alvos?: string[];
    }) => {
      if (!companyId) throw new Error('Empresa não selecionada');

      const insertData = {
        company_id: companyId,
        titulo: data.titulo,
        descricao: data.descricao || null,
        modelo_analise: data.modelo_analise || 'PADRAO',
        escala_config: data.escala_config || null,
        config_calculo: data.config_calculo || null,
        audiencia_tipo: data.audiencia_tipo || 'todos',
      };

      const { data: result, error } = await supabase
        .from('questionarios_cuidar_plus')
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      
      // Inserir os alvos, se houver
      if (data.audiencia_tipo === 'departamentos' && data.alvos && data.alvos.length > 0) {
        const alvosInsert = data.alvos.map(dep => ({
          questionario_id: result.id,
          departamento_nome: dep
        }));
        const { error: alvosError } = await supabase
          .from('questionarios_cuidar_plus_alvos')
          .insert(alvosInsert);
        if (alvosError) throw alvosError;
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionarios-cuidar-plus'] });
      toast.success('Questionário criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar questionário: ' + error.message);
    },
  });
};

// Hook para atualizar questionário
export const useUpdateQuestionarioCuidarPlus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      id: string; 
      titulo?: string; 
      descricao?: string;
      is_active?: boolean;
      modelo_analise?: 'PADRAO' | 'MATRIZ_RISCOS';
      escala_config?: EscalaConfigItem[];
      config_calculo?: ConfigCalculo;
      audiencia_tipo?: 'todos' | 'departamentos';
      alvos?: string[];
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.titulo !== undefined) updateData.titulo = data.titulo;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.modelo_analise !== undefined) updateData.modelo_analise = data.modelo_analise;
      if (data.escala_config !== undefined) updateData.escala_config = data.escala_config;
      if (data.config_calculo !== undefined) updateData.config_calculo = data.config_calculo;
      if (data.audiencia_tipo !== undefined) updateData.audiencia_tipo = data.audiencia_tipo;
      if (data.is_active !== undefined) {
        updateData.is_active = data.is_active;
        updateData.data_ativacao = data.is_active ? new Date().toISOString() : null;
        if (!data.is_active) updateData.data_desativacao = new Date().toISOString();
      }

      const { data: result, error } = await supabase
        .from('questionarios_cuidar_plus')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;

      // Se a atualização enviar novos alvos ou mudar o tipo de audiência, refazer a lista de alvos
      if (data.audiencia_tipo === 'departamentos' && data.alvos !== undefined) {
        // Apaga existentes
        await supabase
          .from('questionarios_cuidar_plus_alvos')
          .delete()
          .eq('questionario_id', data.id);
        
        // Reinsere novos
        if (data.alvos.length > 0) {
          const alvosInsert = data.alvos.map(dep => ({
            questionario_id: data.id,
            departamento_nome: dep
          }));
          const { error: alvosError } = await supabase
            .from('questionarios_cuidar_plus_alvos')
            .insert(alvosInsert);
          if (alvosError) throw alvosError;
        }
      } else if (data.audiencia_tipo === 'todos') {
        // Se mudou para "todos", limpar os alvos (caso existam)
        await supabase
          .from('questionarios_cuidar_plus_alvos')
          .delete()
          .eq('questionario_id', data.id);
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionarios-cuidar-plus'] });
      queryClient.invalidateQueries({ queryKey: ['questionario-cuidar-plus'] });
      toast.success('Questionário atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar questionário: ' + error.message);
    },
  });
};

// Hook para deletar questionário
export const useDeleteQuestionarioCuidarPlus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('questionarios_cuidar_plus')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionarios-cuidar-plus'] });
      toast.success('Questionário excluído com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao excluir questionário: ' + error.message);
    },
  });
};

// Hook para criar pergunta
export const useCreatePerguntaCuidarPlus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      questionario_id: string;
      pergunta_texto: string;
      tipo_pergunta: 'LIKERT_5' | 'TEXTO_LIVRE';
      order_index: number;
      dimensao?: string | null;
      dimensao_questionario_id?: string | null;
      is_invertida?: boolean;
      bloco?: string | null;
      peso?: number;
    }) => {
      const insertData = {
        questionario_id: data.questionario_id,
        pergunta_texto: data.pergunta_texto,
        tipo_pergunta: data.tipo_pergunta,
        order_index: data.order_index,
        dimensao: data.dimensao || null,
        dimensao_questionario_id: data.dimensao_questionario_id || null,
        is_invertida: data.is_invertida ?? false,
        bloco: data.bloco || null,
        peso: data.peso ?? 1,
      };

      const { data: result, error } = await supabase
        .from('perguntas_cuidar_plus')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionario-cuidar-plus', variables.questionario_id] });
    },
    onError: (error) => {
      toast.error('Erro ao adicionar pergunta: ' + error.message);
    },
  });
};

// Hook para atualizar pergunta
export const useUpdatePerguntaCuidarPlus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      questionario_id: string;
      pergunta_texto?: string;
      tipo_pergunta?: 'LIKERT_5' | 'TEXTO_LIVRE';
      order_index?: number;
      dimensao?: string | null;
      dimensao_questionario_id?: string | null;
      is_invertida?: boolean;
      bloco?: string | null;
      peso?: number;
    }) => {
      const { id, questionario_id, ...updateData } = data;
      
      const { data: result, error } = await supabase
        .from('perguntas_cuidar_plus')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionario-cuidar-plus', variables.questionario_id] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar pergunta: ' + error.message);
    },
  });
};

// Hook para deletar pergunta
export const useDeletePerguntaCuidarPlus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; questionario_id: string }) => {
      const { error } = await supabase
        .from('perguntas_cuidar_plus')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionario-cuidar-plus', variables.questionario_id] });
    },
    onError: (error) => {
      toast.error('Erro ao excluir pergunta: ' + error.message);
    },
  });
};

// Hook para listar envios de um questionário
export const useEnviosCuidarPlus = (questionarioId: string | null) => {
  return useQuery({
    queryKey: ['envios-cuidar-plus', questionarioId],
    queryFn: async () => {
      if (!questionarioId) return [];
      
      const { data, error } = await supabase
        .from('envios_cuidar_plus')
        .select(`
          *,
          colaboradores (
            id,
            full_name,
            corporate_email
          )
        `)
        .eq('questionario_id', questionarioId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EnvioCuidarPlus[];
    },
    enabled: !!questionarioId,
  });
};

// Hook para criar envio (gerar link)
export const useCreateEnvioCuidarPlus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { questionario_id: string; colaborador_id: string }) => {
      const { data: result, error } = await supabase
        .from('envios_cuidar_plus')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['envios-cuidar-plus', variables.questionario_id] });
      toast.success('Link gerado com sucesso');
    },
    onError: (error: Error) => {
      if (error.message.includes('duplicate')) {
        toast.error('Link já foi gerado para este colaborador');
      } else {
        toast.error('Erro ao gerar link: ' + error.message);
      }
    },
  });
};

// Hook para criar envios em lote
export const useBulkCreateEnviosCuidarPlus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { questionario_id: string; colaborador_ids: string[] }) => {
      // 1. Validar audiência em profundidade
      const { data: quest, error: questError } = await supabase
        .from('questionarios_cuidar_plus')
        .select(`
          audiencia_tipo,
          questionarios_cuidar_plus_alvos (
            departamento_nome
          )
        `)
        .eq('id', data.questionario_id)
        .single();

      if (questError) throw questError;

      let validColaboradores = data.colaborador_ids;

      if (quest?.audiencia_tipo === 'departamentos') {
        const alvos = (quest.questionarios_cuidar_plus_alvos || []).map(
          (a: any) => a.departamento_nome.trim().toLowerCase()
        );

        if (alvos.length === 0) {
          throw new Error("Nenhum colaborador do público-alvo disponível para envio");
        }

        // Buscar departamentos atuais dos colaboradores na base
        const { data: colabs, error: colabsError } = await supabase
          .from('colaboradores')
          .select('id, department')
          .in('id', data.colaborador_ids);

        if (colabsError) throw colabsError;

        validColaboradores = validColaboradores.filter(cid => {
          const c = colabs?.find(col => col.id === cid);
          if (!c?.department) {
            console.warn(`[Cuidar+] Descartando ${cid}: sem departamento.`);
            return false;
          }
          const isAlvo = alvos.includes(c.department.trim().toLowerCase());
          if (!isAlvo) {
            console.warn(`[Cuidar+] Descartando ${cid}: departamento '${c.department}' fora do público-alvo.`);
          }
          return isAlvo;
        });

        if (validColaboradores.length === 0) {
          throw new Error("Nenhum colaborador do público-alvo disponível para envio");
        }
      }

      // 2. Realizar upsert apenas dos válidos
      const envios = validColaboradores.map(colaborador_id => ({
        questionario_id: data.questionario_id,
        colaborador_id,
      }));

      const { data: result, error } = await supabase
        .from('envios_cuidar_plus')
        .upsert(envios, { 
          onConflict: 'questionario_id,colaborador_id',
          ignoreDuplicates: true 
        })
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['envios-cuidar-plus', variables.questionario_id] });
      toast.success('Links gerados com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao gerar links: ' + error.message);
    },
  });
};

// Hook para buscar questionários pendentes do colaborador logado
export const useMyQuestionariosPendentes = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-questionarios-pendentes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar colaborador do usuário
      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!colaborador) return [];

      // Buscar envios pendentes com dados do questionário
      const { data, error } = await supabase
        .from('envios_cuidar_plus')
        .select(`
          id,
          token,
          status,
          questionarios_cuidar_plus (
            id,
            titulo,
            descricao,
            is_active
          )
        `)
        .eq('colaborador_id', colaborador.id)
        .eq('status', 'PENDENTE');

      if (error) throw error;
      
      // Filtrar apenas questionários ativos
      return data?.filter(e => e.questionarios_cuidar_plus?.is_active) || [];
    },
    enabled: !!user?.id,
  });
};
