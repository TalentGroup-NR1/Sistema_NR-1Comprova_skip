import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AulaTipo,
  AulaTreinamento,
  ModuloTreinamento,
  useCurriculo,
} from "./useProgressoAula";

export * from "./useProgressoAula";

// Compatibility aliases
export type TreinamentoAula = AulaTreinamento;
export type TreinamentoModulo = ModuloTreinamento;

const db = supabase as any;

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
      titulo: string;
      descricao?: string | null;
      ordem: number;
    }) => {
      const { data, error } = await db.from("modulos_treinamento").insert(payload).select().single();
      if (error) throw error;
      return data as ModuloTreinamento;
    },
    onSuccess: (_d, v) => {
      invalidate(v.treinamento_id);
      toast.success("Módulo criado");
    },
    onError: (e: Error) => toast.error(`Erro ao criar módulo: ${e.message}`),
  });
}

export function useUpdateModulo() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({
      id,
      treinamento_id,
      ...data
    }: { id: string; treinamento_id: string } & Partial<ModuloTreinamento>) => {
      const { error } = await db.from("modulos_treinamento").update(data).eq("id", id);
      if (error) throw error;
      return { treinamento_id };
    },
    onSuccess: (r) => invalidate(r.treinamento_id),
    onError: (e: Error) => toast.error(`Erro ao atualizar módulo: ${e.message}`),
  });
}

export function useDeleteModulo() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ id, treinamento_id }: { id: string; treinamento_id: string }) => {
      const { error } = await db.from("modulos_treinamento").delete().eq("id", id);
      if (error) throw error;
      return { treinamento_id };
    },
    onSuccess: (r) => {
      invalidate(r.treinamento_id);
      toast.success("Módulo excluído");
    },
    onError: (e: Error) => toast.error(`Erro ao excluir módulo: ${e.message}`),
  });
}

export function useUpsertAula() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<AulaTreinamento> & { treinamento_id: string }) => {
      if (id) {
        const { treinamento_id, ...rest } = payload;
        const { error } = await db.from("aulas_treinamento").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("aulas_treinamento").insert(payload);
        if (error) throw error;
      }
      return { treinamento_id: payload.treinamento_id };
    },
    onSuccess: (r) => {
      invalidate(r.treinamento_id);
      toast.success("Aula salva");
    },
    onError: (e: Error) => toast.error(`Erro ao salvar aula: ${e.message}`),
  });
}

export function useDeleteAula() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({ id, treinamento_id }: { id: string; treinamento_id: string }) => {
      const { error } = await db.from("aulas_treinamento").delete().eq("id", id);
      if (error) throw error;
      return { treinamento_id };
    },
    onSuccess: (r) => {
      invalidate(r.treinamento_id);
      toast.success("Aula excluída");
    },
    onError: (e: Error) => toast.error(`Erro ao excluir aula: ${e.message}`),
  });
}

export function useReordenarAulas() {
  const invalidate = useInvalidateCurriculo();
  return useMutation({
    mutationFn: async ({
      treinamento_id,
      itens,
    }: {
      treinamento_id: string;
      itens: { id: string; ordem: number }[];
    }) => {
      for (const item of itens) {
        const { error } = await db.from("aulas_treinamento").update({ ordem: item.ordem }).eq("id", item.id);
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
    mutationFn: async ({
      treinamento_id,
      itens,
    }: {
      treinamento_id: string;
      itens: { id: string; ordem: number }[];
    }) => {
      for (const item of itens) {
        const { error } = await db.from("modulos_treinamento").update({ ordem: item.ordem }).eq("id", item.id);
        if (error) throw error;
      }
      return { treinamento_id };
    },
    onSuccess: (r) => invalidate(r.treinamento_id),
  });
}
