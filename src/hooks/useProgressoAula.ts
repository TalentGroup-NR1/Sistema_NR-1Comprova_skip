import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AulaTipo = "pdf" | "video" | "ppt" | "arquivo" | "link" | "texto";

export interface AulaTreinamento {
  id: string;
  modulo_id: string;
  treinamento_id: string;
  titulo: string;
  descricao: string | null;
  tipo: AulaTipo;
  url_conteudo: string | null;
  duracao_minutos: number | null;
  ordem: number;
  obrigatoria: boolean;
  tempo_minimo_segundos: number;
  created_at?: string;
  updated_at?: string;
}

export interface ModuloTreinamento {
  id: string;
  treinamento_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  created_at?: string;
  updated_at?: string;
  aulas: AulaTreinamento[];
}

export interface ProgressoAula {
  id: string;
  user_id: string;
  aula_id: string;
  treinamento_id: string;
  company_id: string;
  concluida: boolean;
  concluida_em: string | null;
  percentual_assistido: number;
  termo_aceito: boolean;
  termo_aceito_em: string | null;
  termo_ip: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProgressoTreinamentoGlobal {
  total_aulas: number;
  aulas_concluidas: number;
  percentual: number;
  quiz_obrigatorio: boolean;
  quiz_aprovado: boolean;
  pode_certificar: boolean;
}

const db = supabase as any;

/**
 * Busca currículo completo (módulos e aulas) de um treinamento
 */
export function useCurriculo(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["treinamento-curriculo", treinamentoId],
    queryFn: async (): Promise<ModuloTreinamento[]> => {
      if (!treinamentoId) return [];

      const { data: modulos, error: modError } = await db
        .from("modulos_treinamento")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .order("ordem", { ascending: true });

      if (modError) {
        console.error("Erro ao carregar módulos:", modError);
        return [];
      }

      const { data: aulas, error: aulasError } = await db
        .from("aulas_treinamento")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .order("ordem", { ascending: true });

      if (aulasError) {
        console.error("Erro ao carregar aulas:", aulasError);
        return [];
      }

      const aulasList = (aulas || []) as AulaTreinamento[];
      return ((modulos || []) as ModuloTreinamento[]).map((modulo) => ({
        ...modulo,
        aulas: aulasList.filter((a) => a.modulo_id === modulo.id),
      }));
    },
    enabled: !!treinamentoId,
  });
}

/**
 * Busca o progresso das aulas do usuário atual no treinamento
 */
export function useProgressoAulas(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["progresso-aulas", treinamentoId],
    queryFn: async (): Promise<ProgressoAula[]> => {
      if (!treinamentoId) return [];

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await db
        .from("progresso_aulas")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Erro ao carregar progresso das aulas:", error);
        return [];
      }

      return (data || []) as ProgressoAula[];
    },
    enabled: !!treinamentoId,
  });
}

/**
 * Busca o progresso derivado global pela RPC get_progresso_treinamento (Regra de Ouro)
 */
export function useProgressoGlobal(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["progresso-global", treinamentoId],
    queryFn: async (): Promise<ProgressoTreinamentoGlobal | null> => {
      if (!treinamentoId) return null;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      try {
        if (typeof db.rpc !== 'function') return null;
        const { data, error } = await db.rpc("get_progresso_treinamento", {
          _treinamento_id: treinamentoId,
          _user_id: user.id,
        });

        if (error) throw error;
        if (data && data.length > 0) {
          const row = data[0];
          return {
            total_aulas: Number(row.total_aulas || 0),
            aulas_concluidas: Number(row.aulas_concluidas || 0),
            percentual: Number(row.percentual || 0),
            quiz_obrigatorio: Boolean(row.quiz_obrigatorio),
            quiz_aprovado: Boolean(row.quiz_aprovado),
            pode_certificar: Boolean(row.pode_certificar),
          };
        }
      } catch (err) {
        console.warn("get_progresso_treinamento RPC falhou, calculando via frontend:", err);
      }

      return null;
    },
    enabled: !!treinamentoId,
  });
}

/**
 * Mutação idempotente para salvar o progresso de uma aula
 */
export function useSalvarProgressoAula() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      aulaId,
      treinamentoId,
      concluida,
      percentualAssistido,
      termoAceito,
      termoIp,
    }: {
      aulaId: string;
      treinamentoId: string;
      concluida?: boolean;
      percentualAssistido?: number;
      termoAceito?: boolean;
      termoIp?: string | null;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar colaborador para identificar company_id
      const { data: colab } = await supabase
        .from("colaboradores")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();

      const companyId = colab?.company_id || "00000000-0000-0000-0000-000000000000";

      const payload: Record<string, unknown> = {
        user_id: user.id,
        aula_id: aulaId,
        treinamento_id: treinamentoId,
        company_id: companyId,
        updated_at: new Date().toISOString(),
      };

      if (concluida !== undefined) {
        payload.concluida = concluida;
        if (concluida) {
          payload.concluida_em = new Date().toISOString();
        }
      }

      if (percentualAssistido !== undefined) {
        payload.percentual_assistido = Math.min(100, Math.max(0, percentualAssistido));
      }

      if (termoAceito !== undefined) {
        payload.termo_aceito = termoAceito;
        if (termoAceito) {
          payload.termo_aceito_em = new Date().toISOString();
          if (termoIp) payload.termo_ip = termoIp;
        }
      }

      const { data, error } = await db
        .from("progresso_aulas")
        .upsert(payload, { onConflict: "user_id,aula_id" })
        .select()
        .single();

      if (error) throw error;
      return data as ProgressoAula;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["progresso-aulas", vars.treinamentoId] });
      queryClient.invalidateQueries({ queryKey: ["progresso-global", vars.treinamentoId] });
      queryClient.invalidateQueries({ queryKey: ["meu-progresso", vars.treinamentoId] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar progresso: ${err.message}`);
    },
  });
}
