import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type AulaTipo = "video" | "link" | "pdf" | "ppt" | "texto";

export interface TreinamentoAula {
  id: string;
  modulo_id: string;
  treinamento_id: string;
  company_id: string;
  titulo: string;
  resumo: string | null;
  tipo: AulaTipo;
  url_conteudo: string | null;
  nome_arquivo: string | null;
  duracao_estimada_minutos: number | null;
  tempo_minimo_minutos: number;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface TreinamentoModulo {
  id: string;
  treinamento_id: string;
  company_id: string;
  titulo: string;
  descricao: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  aulas: TreinamentoAula[];
}

const db = supabase as any;

export function useCurriculo(treinamentoId: string | undefined) {
  return useQuery({
    queryKey: ["treinamento-curriculo", treinamentoId],
    queryFn: async () => {
      if (!treinamentoId) return [] as TreinamentoModulo[];

      const { data: modulos, error } = await db
        .from("treinamento_modulos")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .order("ordem", { ascending: true });
      if (error) throw error;

      const { data: aulas, error: errAulas } = await db
        .from("treinamento_aulas")
        .select("*")
        .eq("treinamento_id", treinamentoId)
        .order("ordem", { ascending: true });
      if (errAulas) throw errAulas;

      return ((modulos ?? []) as TreinamentoModulo[]).map((m) => ({
        ...m,
        aulas: ((aulas ?? []) as TreinamentoAula[]).filter((a) => a.modulo_id === m.id),
      }));
    },
    enabled: !!treinamentoId,
  });
}

function useInvalidateCurriculo() {
  const qc = useQueryClient();
  return (treinamentoId: string) => {
    qc.invalidateQueries({ queryKey: ["treinamento-curriculo", treinamentoId] });
  };
}

export function useCreateModulo() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async (payload: {
      treinamento_id: string;
      company_id: string;
      titulo: string;
      descricao?: string | null;
      ordem: number;
    }) => {
      const { data, error } = await db.from("treinamento_modulos").insert(payload).select().single();
      if (error) throw error;
      return data as TreinamentoModulo;
    },
    onSuccess: (_d, v) => {
      invalidate(v.treinamento_id);
      toast({ title: "Módulo criado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao criar módulo", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateModulo() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ id, treinamento_id, ...data }: { id: string; treinamento_id: string } & Partial<TreinamentoModulo>) => {
      const { error } = await db.from("treinamento_modulos").update(data).eq("id", id);
      if (error) throw error;
      return { treinamento_id };
    },
    onSuccess: (r) => invalidate(r.treinamento_id),
    onError: (e: Error) => toast({ title: "Erro ao atualizar módulo", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteModulo() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ id, treinamento_id }: { id: string; treinamento_id: string }) => {
      const { error } = await db.from("treinamento_modulos").delete().eq("id", id);
      if (error) throw error;
      return { treinamento_id };
    },
    onSuccess: (r) => {
      invalidate(r.treinamento_id);
      toast({ title: "Módulo excluído" });
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir módulo", description: e.message, variant: "destructive" }),
  });
}

export function useUpsertAula() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<TreinamentoAula> & { treinamento_id: string }) => {
      if (id) {
        const { treinamento_id, ...rest } = payload;
        const { error } = await db.from("treinamento_aulas").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("treinamento_aulas").insert(payload);
        if (error) throw error;
      }
      return { treinamento_id: payload.treinamento_id };
    },
    onSuccess: (r) => {
      invalidate(r.treinamento_id);
      toast({ title: "Aula salva" });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar aula", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteAula() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ id, treinamento_id }: { id: string; treinamento_id: string }) => {
      const { error } = await db.from("treinamento_aulas").delete().eq("id", id);
      if (error) throw error;
      return { treinamento_id };
    },
    onSuccess: (r) => {
      invalidate(r.treinamento_id);
      toast({ title: "Aula excluída" });
    },
    onError: (e: Error) => toast({ title: "Erro ao excluir aula", description: e.message, variant: "destructive" }),
  });
}

export function useReordenarAulas() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ treinamento_id, itens }: { treinamento_id: string; itens: { id: string; ordem: number }[] }) => {
      for (const item of itens) {
        const { error } = await db.from("treinamento_aulas").update({ ordem: item.ordem }).eq("id", item.id);
        if (error) throw error;
      }
      return { treinamento_id };
    },
    onSuccess: (r) => invalidate(r.treinamento_id),
  });
}

export function useReordenarModulos() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ treinamento_id, itens }: { treinamento_id: string; itens: { id: string; ordem: number }[] }) => {
      for (const item of itens) {
        const { error } = await db.from("treinamento_modulos").update({ ordem: item.ordem }).eq("id", item.id);
        if (error) throw error;
      }
      return { treinamento_id };
    },
    onSuccess: (r) => invalidate(r.treinamento_id),
  });
}
