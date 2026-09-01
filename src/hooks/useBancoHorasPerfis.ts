import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export interface BancoHorasPerfil {
  id: string;
  company_id: string;
  nome: string;
  periodo_fechamento_banco:
    | "mensal"
    | "bimestral"
    | "trimestral"
    | "quadrimestral"
    | "semestral"
    | "anual";
  banco_horas_inicio: string | null;
  ativo: boolean;
  is_padrao: boolean;
  created_at?: string;
  updated_at?: string;
}

export function useBancoHorasPerfis(companyIdArg?: string | null) {
  const effectiveCompanyId = useEffectiveCompanyId();
  const companyId = companyIdArg ?? effectiveCompanyId;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["banco-horas-perfis", companyId],
    queryFn: async () => {
      if (!companyId) return [] as BancoHorasPerfil[];
      const { data, error } = await supabase
        .from("banco_horas_perfis" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("is_padrao", { ascending: false })
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BancoHorasPerfil[];
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["banco-horas-perfis", companyId] });

  const upsert = useMutation({
    mutationFn: async (payload: Partial<BancoHorasPerfil> & { id?: string }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const base = { ...payload, company_id: companyId };
      if (payload.id) {
        const { data, error } = await supabase
          .from("banco_horas_perfis" as any)
          .update(base)
          .eq("id", payload.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("banco_horas_perfis" as any)
        .insert(base)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Perfil salvo");
    },
    onError: (e: any) => toast.error("Erro ao salvar perfil: " + e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("banco_horas_perfis" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Perfil excluído");
    },
    onError: (e: any) => toast.error("Erro ao excluir: " + e.message),
  });

  const setPadrao = useMutation({
    mutationFn: async (id: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      // Clear existing default first (unique partial index enforces single default)
      const { error: e1 } = await supabase
        .from("banco_horas_perfis" as any)
        .update({ is_padrao: false })
        .eq("company_id", companyId)
        .eq("is_padrao", true);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("banco_horas_perfis" as any)
        .update({ is_padrao: true })
        .eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: async () => {
      await invalidate();
      toast.success("Padrão atualizado");
    },
    onError: (e: any) => toast.error("Erro: " + e.message),
  });

  return { perfis: query.data ?? [], isLoading: query.isLoading, upsert, remove, setPadrao };
}
