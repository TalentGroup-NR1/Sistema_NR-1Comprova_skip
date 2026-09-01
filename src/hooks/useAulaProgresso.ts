import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface AulaProgresso {
  id: string;
  aula_id: string;
  treinamento_id: string;
  colaborador_id: string;
  concluida: boolean;
  tempo_assistido_segundos: number;
  concluida_em: string | null;
}

export function useMeuColaboradorId() {
  return useQuery({
    queryKey: ["meu-colaborador-id"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("colaboradores")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data?.id as string) ?? null;
    },
    staleTime: 5 * 60_000,
  });
}

export function useMeuProgressoAulas(treinamentoId: string | undefined) {
  const { data: colaboradorId } = useMeuColaboradorId();
  return useQuery({
    queryKey: ["aula-progresso", treinamentoId, colaboradorId],
    queryFn: async () => {
      if (!treinamentoId || !colaboradorId) return [] as AulaProgresso[];
      const { data, error } = await db
        .from("treinamento_aula_progresso")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .eq("colaborador_id", colaboradorId);
      if (error) throw error;
      return (data ?? []) as AulaProgresso[];
    },
    enabled: !!treinamentoId && !!colaboradorId,
  });
}

export function useMarcarAula() {
  const qc = useQueryClient();
  const { data: colaboradorId } = useMeuColaboradorId();
  return useMutation({
    mutationFn: async ({
      aulaId,
      treinamentoId,
      concluida,
    }: { aulaId: string; treinamentoId: string; concluida: boolean }) => {
      if (!colaboradorId) throw new Error("Colaborador não identificado");
      const { error } = await db
        .from("treinamento_aula_progresso")
        .upsert(
          {
            aula_id: aulaId,
            treinamento_id: treinamentoId,
            colaborador_id: colaboradorId,
            concluida,
            concluida_em: concluida ? new Date().toISOString() : null,
          },
          { onConflict: "aula_id,colaborador_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aula-progresso"] });
    },
  });
}
