import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type ConclusaoStatus = 'nao_iniciado' | 'em_andamento' | 'apto_concluir' | 'concluido';

export interface TreinamentoProgresso {
  id: string;
  treinamento_id: string;
  colaborador_id: string;
  status: ConclusaoStatus;
  tempo_total_minutos: number;
  quiz_tentativas: number;
  quiz_melhor_nota: number | null;
  quiz_aprovado: boolean;
  quiz_data_aprovacao: string | null;
  termo_aceito: boolean;
  termo_aceito_em: string | null;
  termo_ip: string | null;
  concluido_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreinamentoLogAcesso {
  id: string;
  treinamento_id: string;
  colaborador_id: string;
  session_id: string;
  iniciado_em: string;
  finalizado_em: string | null;
  tempo_acumulado_segundos: number;
  created_at: string;
}

export interface TreinamentoQuizTentativa {
  id: string;
  treinamento_id: string;
  colaborador_id: string;
  nota_obtida: number;
  total_perguntas: number;
  acertos: number;
  aprovado: boolean;
  respostas: Record<string, string>;
  created_at: string;
}

// Hook para obter progresso do colaborador atual em um treinamento
export function useMeuProgresso(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["meu-progresso", treinamentoId],
    queryFn: async () => {
      if (!treinamentoId) return null;
      
      // Primeiro, obter o colaborador_id do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: colaborador, error: colabError } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (colabError || !colaborador) return null;

      const { data, error } = await supabase
        .from("treinamento_progresso")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .eq("colaborador_id", colaborador.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as TreinamentoProgresso | null;
    },
    enabled: !!treinamentoId,
  });
}

// Hook para obter ou criar progresso
export function useGetOrCreateProgresso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ treinamentoId }: { treinamentoId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: colaborador, error: colabError } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (colabError || !colaborador) throw new Error("Colaborador não encontrado");

      // Tentar buscar progresso existente
      const { data: existing } = await supabase
        .from("treinamento_progresso")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .eq("colaborador_id", colaborador.id)
        .maybeSingle();

      if (existing) return existing as TreinamentoProgresso;

      // Criar novo progresso
      const { data, error } = await supabase
        .from("treinamento_progresso")
        .insert({
          treinamento_id: treinamentoId,
          colaborador_id: colaborador.id,
          status: 'em_andamento' as ConclusaoStatus,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as TreinamentoProgresso;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meu-progresso", variables.treinamentoId] });
    },
  });
}

// Hook para atualizar progresso
export function useUpdateProgresso() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<TreinamentoProgresso> & { id: string; treinamento_id: string }) => {
      const { data: result, error } = await supabase
        .from("treinamento_progresso")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return result as TreinamentoProgresso;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meu-progresso", variables.treinamento_id] });
      queryClient.invalidateQueries({ queryKey: ["progresso-relatorio"] });
    },
  });
}

// Hook para criar log de acesso
export function useCreateLogAcesso() {
  return useMutation({
    mutationFn: async ({ treinamentoId }: { treinamentoId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: colaborador, error: colabError } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (colabError || !colaborador) throw new Error("Colaborador não encontrado");

      const { data, error } = await supabase
        .from("treinamento_logs_acesso")
        .insert({
          treinamento_id: treinamentoId,
          colaborador_id: colaborador.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as TreinamentoLogAcesso;
    },
  });
}

// Hook para atualizar log de acesso
export function useUpdateLogAcesso() {
  return useMutation({
    mutationFn: async ({ id, tempo_acumulado_segundos, finalizado }: { id: string; tempo_acumulado_segundos: number; finalizado?: boolean }) => {
      const updateData: Record<string, unknown> = {
        tempo_acumulado_segundos,
      };
      
      if (finalizado) {
        updateData.finalizado_em = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("treinamento_logs_acesso")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as TreinamentoLogAcesso;
    },
  });
}

// Hook para registrar tentativa de quiz
export function useRegistrarTentativaQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      treinamentoId: string;
      notaObtida: number;
      totalPerguntas: number;
      acertos: number;
      aprovado: boolean;
      respostas: Record<string, string>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: colaborador, error: colabError } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (colabError || !colaborador) throw new Error("Colaborador não encontrado");

      // Inserir tentativa
      const { data: tentativa, error: tentativaError } = await supabase
        .from("treinamento_quiz_tentativas")
        .insert({
          treinamento_id: data.treinamentoId,
          colaborador_id: colaborador.id,
          nota_obtida: data.notaObtida,
          total_perguntas: data.totalPerguntas,
          acertos: data.acertos,
          aprovado: data.aprovado,
          respostas: data.respostas,
        })
        .select()
        .single();
      
      if (tentativaError) throw tentativaError;

      // Atualizar progresso com resultado do quiz
      const { data: progresso } = await supabase
        .from("treinamento_progresso")
        .select("*")
        .eq("treinamento_id", data.treinamentoId)
        .eq("colaborador_id", colaborador.id)
        .single();

      if (progresso) {
        const novoQuizTentativas = (progresso.quiz_tentativas || 0) + 1;
        const novaQuizMelhorNota = Math.max(progresso.quiz_melhor_nota || 0, data.notaObtida);
        
        const updateData: Partial<TreinamentoProgresso> = {
          quiz_tentativas: novoQuizTentativas,
          quiz_melhor_nota: novaQuizMelhorNota,
        };

        if (data.aprovado && !progresso.quiz_aprovado) {
          updateData.quiz_aprovado = true;
          updateData.quiz_data_aprovacao = new Date().toISOString();
        }

        await supabase
          .from("treinamento_progresso")
          .update(updateData)
          .eq("id", progresso.id);
      }

      return tentativa as TreinamentoQuizTentativa;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["meu-progresso", variables.treinamentoId] });
      queryClient.invalidateQueries({ queryKey: ["minhas-tentativas", variables.treinamentoId] });
    },
  });
}

// Hook para obter tentativas do usuário
export function useMinhasTentativas(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["minhas-tentativas", treinamentoId],
    queryFn: async () => {
      if (!treinamentoId) return [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: colaborador, error: colabError } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (colabError || !colaborador) return [];

      const { data, error } = await supabase
        .from("treinamento_quiz_tentativas")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .eq("colaborador_id", colaborador.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as TreinamentoQuizTentativa[];
    },
    enabled: !!treinamentoId,
  });
}

// Hook para aceitar termo de ciência
export function useAceitarTermo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ progressoId, treinamentoId }: { progressoId: string; treinamentoId: string }) => {
      const { data, error } = await supabase
        .from("treinamento_progresso")
        .update({
          termo_aceito: true,
          termo_aceito_em: new Date().toISOString(),
        })
        .eq("id", progressoId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, treinamentoId } as TreinamentoProgresso & { treinamentoId: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["meu-progresso", result.treinamentoId] });
    },
  });
}

// Hook para concluir treinamento
export function useConcluirTreinamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      progressoId,
      treinamentoId,
      autodeclarado = false,
      termoAceito = false,
      termoIp = null,
    }: {
      progressoId: string;
      treinamentoId: string;
      autodeclarado?: boolean;
      termoAceito?: boolean;
      termoIp?: string | null;
    }) => {
      // REGRA DE OURO (Etapa 9.1 / 9.2b) — Fail-closed via RPC:
      // A conclusão do treinamento deve ser recusada SEMPRE que pode_certificar !== true
      const { data: { user } } = await supabase.auth.getUser();
      if (user && typeof (supabase as any).rpc === 'function') {
        const { data: progressoGlobal, error: rpcError } = await (supabase as any).rpc('get_progresso_treinamento', {
          _treinamento_id: treinamentoId,
          _user_id: user.id,
        });

        if (rpcError) {
          throw new Error(`Erro ao verificar progresso do treinamento: ${rpcError.message}`);
        }

        if (progressoGlobal && progressoGlobal.length > 0) {
          const info = progressoGlobal[0];
          const podeCertificar = Boolean(info.pode_certificar);

          if (!podeCertificar) {
            const totalAulas = Number(info.total_aulas || 0);
            const aulasConcluidas = Number(info.aulas_concluidas || 0);
            const quizObrigatorio = Boolean(info.quiz_obrigatorio);
            const quizAprovado = Boolean(info.quiz_aprovado);

            if (totalAulas === 0) {
              throw new Error("Este treinamento não possui aulas cadastradas e não pode ser concluído.");
            }
            if (aulasConcluidas < totalAulas) {
              throw new Error(`Conclua todas as aulas antes de finalizar. (${aulasConcluidas} de ${totalAulas})`);
            }
            if (quizObrigatorio && !quizAprovado) {
              throw new Error("Responda a avaliação com a nota mínima exigida para ser aprovado.");
            }
            throw new Error("Requisitos para conclusão do treinamento não foram atendidos.");
          }
        }
      }

      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = {
        status: 'concluido' as ConclusaoStatus,
        concluido_em: now,
      };

      if (termoAceito || autodeclarado) {
        updatePayload.termo_aceito = true;
        updatePayload.termo_aceito_em = now;
        if (termoIp) {
          updatePayload.termo_ip = termoIp;
        }
      }

      const { data, error } = await supabase
        .from("treinamento_progresso")
        .update(updatePayload)
        .eq("id", progressoId)
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, treinamentoId } as TreinamentoProgresso & { treinamentoId: string };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["meu-progresso", result.treinamentoId] });
      toast({ title: "Treinamento concluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao concluir treinamento", description: error.message, variant: "destructive" });
    },
  });
}

// Hook para relatório RH/Admin
export function useProgressoRelatorio(filters?: {
  treinamentoId?: string;
  departamento?: string;
  status?: ConclusaoStatus;
}) {
  return useQuery({
    queryKey: ["progresso-relatorio", filters],
    queryFn: async () => {
      let query = supabase
        .from("treinamento_progresso")
        .select(`
          *,
          treinamento:treinamentos(id, titulo),
          colaborador:colaboradores(id, full_name, department, job_title)
        `)
        .order("updated_at", { ascending: false });

      if (filters?.treinamentoId) {
        query = query.eq("treinamento_id", filters.treinamentoId);
      }

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtrar por departamento no cliente
      let result = data || [];
      if (filters?.departamento) {
        result = result.filter((p: any) => p.colaborador?.department === filters.departamento);
      }

      return result;
    },
  });
}

// Hook para obter o progresso do colaborador atual em TODOS os treinamentos (uma única consulta)
export function useMeuProgressoTodos() {
  return useQuery({
    queryKey: ["meu-progresso-todos"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return {} as Record<string, TreinamentoProgresso>;

      const { data: colaborador } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!colaborador) return {} as Record<string, TreinamentoProgresso>;

      const { data, error } = await supabase
        .from("treinamento_progresso")
        .select("*")
        .eq("colaborador_id", colaborador.id);

      if (error) throw error;

      const map: Record<string, TreinamentoProgresso> = {};
      (data as TreinamentoProgresso[] | null)?.forEach((p) => {
        map[p.treinamento_id] = p;
      });
      return map;
    },
  });
}
