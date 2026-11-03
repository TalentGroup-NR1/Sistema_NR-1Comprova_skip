import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapPostgresError } from "./usePgrImportacao";

export interface PgrRisco {
  id: string;
  company_id?: string;
  pgr_importacao_id: string;
  ordem: number;
  categoria: string;
  nome: string;
  probabilidade: number;
  severidade: number;
  nivel_risco?: number;
  descricao: string | null;
  medidas_existentes: string | null;
  grupo_exposto: string | null;
  fonte_origem: "ia" | "manual" | "importacao";
  criado_por?: string | null;
  historico?: any[];
  created_at: string;
  updated_at: string;
}

export interface CreateRiscoInput {
  pgr_importacao_id: string;
  company_id: string;
  categoria: string;
  nome: string;
  probabilidade: number;
  severidade: number;
  descricao?: string | null;
  medidas_existentes?: string | null;
  grupo_exposto?: string | null;
  fonte_origem?: "ia" | "manual" | "importacao";
}

export interface UpdateRiscoInput {
  id: string;
  pgr_importacao_id: string;
  patch: Partial<Omit<PgrRisco, "id" | "company_id" | "pgr_importacao_id" | "nivel_risco">>;
}

export interface DeleteRiscoInput {
  id: string;
  pgr_importacao_id: string;
}

// ──────────────────────────────────────────────────────────────
// 1. usePgrRiscos: Listar riscos de uma importação ordenada por ordem
// ──────────────────────────────────────────────────────────────
export function usePgrRiscos(pgrImportacaoId: string) {
  const query = useQuery({
    queryKey: ["pgr-riscos", pgrImportacaoId],
    enabled: !!pgrImportacaoId,
    queryFn: async (): Promise<PgrRisco[]> => {
      const { data, error } = await (supabase as any)
        .from("pgr_riscos")
        .select(
          "id, ordem, categoria, nome, probabilidade, severidade, nivel_risco, descricao, medidas_existentes, grupo_exposto, fonte_origem, created_at, updated_at"
        )
        .eq("pgr_importacao_id", pgrImportacaoId)
        .order("ordem", { ascending: true });

      if (error) {
        throw new Error(mapPostgresError(error));
      }
      return (data || []) as PgrRisco[];
    },
  });

  return {
    ...query,
    riscos: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

// ──────────────────────────────────────────────────────────────
// 2. useCreateRisco: Inserir novo risco com cálculo de ordem e retry
// ──────────────────────────────────────────────────────────────
export function useCreateRisco() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRiscoInput) => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      const fetchMaxOrdem = async (): Promise<number> => {
        const { data, error } = await (supabase as any)
          .from("pgr_riscos")
          .select("ordem")
          .eq("pgr_importacao_id", input.pgr_importacao_id)
          .order("ordem", { ascending: false })
          .limit(1);

        if (error) {
          throw new Error(mapPostgresError(error));
        }

        if (!data || data.length === 0 || data[0].ordem === null || data[0].ordem === undefined) {
          return 0;
        }
        return Number(data[0].ordem) + 1;
      };

      const executeInsert = async (ordemCalculada: number) => {
        const payload = {
          pgr_importacao_id: input.pgr_importacao_id,
          company_id: input.company_id,
          categoria: input.categoria,
          nome: input.nome,
          probabilidade: input.probabilidade,
          severidade: input.severidade,
          descricao: input.descricao ?? null,
          medidas_existentes: input.medidas_existentes ?? null,
          grupo_exposto: input.grupo_exposto ?? null,
          ordem: ordemCalculada,
          fonte_origem: input.fonte_origem || "manual",
          criado_por: user?.id ?? null,
          historico: [
            {
              acao: "criado",
              por: user?.email || "desconhecido",
              em: new Date().toISOString(),
            },
          ],
        };

        return await (supabase as any)
          .from("pgr_riscos")
          .insert(payload)
          .select()
          .single();
      };

      let ordem = await fetchMaxOrdem();
      let { data, error } = await executeInsert(ordem);

      // Se falhar com erro de constraint UNIQUE pgr_riscos_importacao_ordem_key, recalcula e tenta mais uma vez
      if (
        error &&
        (error.code === "23505" ||
          (error.message && error.message.includes("pgr_riscos_importacao_ordem_key")) ||
          (error.details && error.details.includes("pgr_riscos_importacao_ordem_key")))
      ) {
        ordem = await fetchMaxOrdem();
        const retryResult = await executeInsert(ordem);
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        throw new Error(mapPostgresError(error));
      }

      return data as PgrRisco;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pgr-riscos", variables.pgr_importacao_id] });
      queryClient.invalidateQueries({ queryKey: ["pgr-importacoes"] });
    },
  });
}

// ──────────────────────────────────────────────────────────────
// 3. useUpdateRisco: Atualizar risco anexando histórico
// ──────────────────────────────────────────────────────────────
export function useUpdateRisco() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateRiscoInput) => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      // Sanitiza o patch: nunca alterar company_id nem pgr_importacao_id nem nivel_risco (coluna gerada)
      const {
        company_id: _c,
        pgr_importacao_id: _p,
        id: _i,
        nivel_risco: _n,
        created_at: _ca,
        updated_at: _ua,
        ...cleanPatch
      } = input.patch as any;

      // Buscar histórico atual
      const { data: current, error: fetchErr } = await (supabase as any)
        .from("pgr_riscos")
        .select("historico")
        .eq("id", input.id)
        .single();

      if (fetchErr) {
        throw new Error(mapPostgresError(fetchErr));
      }

      const historicoAtual = Array.isArray(current?.historico) ? current.historico : [];
      const novoHistorico = [
        ...historicoAtual,
        {
          acao: "editado",
          por: user?.email || "desconhecido",
          em: new Date().toISOString(),
          campos: Object.keys(cleanPatch),
        },
      ];

      const { data, error } = await (supabase as any)
        .from("pgr_riscos")
        .update({
          ...cleanPatch,
          historico: novoHistorico,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new Error(mapPostgresError(error));
      }

      return data as PgrRisco;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pgr-riscos", variables.pgr_importacao_id] });
      queryClient.invalidateQueries({ queryKey: ["pgr-importacoes"] });
    },
  });
}

// ──────────────────────────────────────────────────────────────
// 4. useDeleteRisco: Bloquear exclusão se houver ações vinculadas
// ──────────────────────────────────────────────────────────────
export function useDeleteRisco() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteRiscoInput) => {
      // 1. Verificar se há ações com risco_id = input.id
      const { count, error: countErr } = await (supabase as any)
        .from("pgr_plano_acao")
        .select("*", { count: "exact", head: true })
        .eq("risco_id", input.id);

      if (countErr) {
        throw new Error(mapPostgresError(countErr));
      }

      if (typeof count === "number" && count > 0) {
        throw new Error(
          `Este risco está vinculado a ${count} ação(ões). Remova o vínculo antes de excluir.`
        );
      }

      // 2. Executar delete
      const { error: deleteErr } = await (supabase as any)
        .from("pgr_riscos")
        .delete()
        .eq("id", input.id);

      if (deleteErr) {
        throw new Error(mapPostgresError(deleteErr));
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pgr-riscos", variables.pgr_importacao_id] });
      queryClient.invalidateQueries({ queryKey: ["pgr-importacoes"] });
    },
  });
}

