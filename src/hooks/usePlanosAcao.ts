import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export type PlanoAcaoStatus = "pendente" | "planejado" | "em_andamento" | "atrasado" | "concluido";
export type PlanoAcaoNivel = "primaria" | "secundaria" | "terciaria";
export type PlanoGrupoTipo = "ghe" | "departamento";

export type PlanoAcao = {
  id: string;
  company_id: string;
  origem: "automatico" | "manual";
  /** Campanha psicossocial (motor dinâmico) */
  avaliacao_id: string | null;
  dimensao_id: string | null;
  dimensao_nome: string | null;
  grupo_tipo: PlanoGrupoTipo | null;
  grupo_id: string | null;
  grupo_nome: string | null;
  indice: number | null;
  /** Legado PROART (mantido apenas para registros antigos) */
  ativacao_id: string | null;
  departamento: string | null;
  escala: number | null;
  media: number | null;
  nivel_risco: "Vermelho" | "Laranja";
  titulo: string | null;
  descricao: string | null;
  nivel_intervencao: PlanoAcaoNivel | null;
  participacao_trabalhadores: boolean;
  responsavel_id: string | null;
  prazo: string | null;
  status: PlanoAcaoStatus;
  concluido_em: string | null;
  criado_por: string;
  created_at: string;
  updated_at: string;
};

export function usePlanosAcao(avaliacaoId: string | null) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["planos-acao-nr1", companyId, avaliacaoId],
    enabled: !!companyId && !!avaliacaoId,
    queryFn: async (): Promise<PlanoAcao[]> => {
      let q = (supabase as any)
        .from("nr1_planos_acao")
        .select("*")
        .eq("avaliacao_id", avaliacaoId)
        .order("created_at", { ascending: false });
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as PlanoAcao[];
    },
  });
}

export type PlanoAcaoInput = {
  titulo: string;
  descricao: string;
  nivel_intervencao: PlanoAcaoNivel;
  participacao_trabalhadores: boolean;
  responsavel_id: string | null;
  prazo: string | null;
  status: Exclude<PlanoAcaoStatus, "pendente">;
};

export function useUpdatePlanoAcao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string } & Partial<PlanoAcao>) => {
      const { id, ...rest } = p;
      const patch: any = { ...rest };
      if (patch.status === "concluido" && !patch.concluido_em) {
        patch.concluido_em = new Date().toISOString();
      }
      if (patch.status && patch.status !== "concluido") {
        patch.concluido_em = null;
      }
      const { error } = await (supabase as any).from("nr1_planos_acao").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos-acao-nr1"] }),
  });
}

export function useCreatePlanoManual() {
  const qc = useQueryClient();
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (
      p: {
        avaliacao_id: string;
        dimensao_id: string | null;
        dimensao_nome: string | null;
        grupo_tipo: PlanoGrupoTipo;
        grupo_id: string | null;
        grupo_nome: string;
        indice: number | null;
        nivel_risco: "Vermelho" | "Laranja";
      } & PlanoAcaoInput
    ) => {
      if (!companyId) throw new Error("Sem empresa selecionada");
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await (supabase as any).from("nr1_planos_acao").insert({
        company_id: companyId,
        origem: "manual",
        avaliacao_id: p.avaliacao_id,
        dimensao_id: p.dimensao_id,
        dimensao_nome: p.dimensao_nome,
        grupo_tipo: p.grupo_tipo,
        grupo_id: p.grupo_id,
        grupo_nome: p.grupo_nome,
        departamento: p.grupo_tipo === "departamento" ? p.grupo_nome : null,
        indice: p.indice,
        nivel_risco: p.nivel_risco,
        titulo: p.titulo,
        descricao: p.descricao,
        nivel_intervencao: p.nivel_intervencao,
        participacao_trabalhadores: p.participacao_trabalhadores,
        responsavel_id: p.responsavel_id,
        prazo: p.prazo,
        status: p.status,
        criado_por: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos-acao-nr1"] }),
  });
}

export function useDeletePlanoAcao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("nr1_planos_acao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["planos-acao-nr1"] }),
  });
}
