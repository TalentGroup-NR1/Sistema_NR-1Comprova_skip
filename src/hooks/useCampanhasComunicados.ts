import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";

export type CampanhaStatus = "agendado" | "ativo" | "encerrado";

export interface CampanhaMaterial {
  nome: string;
  url: string;
  tipo?: string;
}

export interface Campanha {
  id: string;
  company_id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  data_inicio: string;
  data_fim: string;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  materiais?: CampanhaMaterial[];
  exige_leitura?: boolean;
}

function computeStatus(data_inicio: string, data_fim: string): CampanhaStatus {
  const today = new Date().toISOString().split("T")[0];
  if (today < data_inicio) return "agendado";
  if (today > data_fim) return "encerrado";
  return "ativo";
}

export function useCampanhas() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["campanhas-comunicados", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("campanhas_comunicados")
        .select("*")
        .eq("company_id", companyId)
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data as unknown as Campanha[]).map((c) => ({
        ...c,
        status: computeStatus(c.data_inicio, c.data_fim),
      }));
    },
    enabled: !!companyId,
  });
}

export function useCampanhasAtivas() {
  return useQuery({
    queryKey: ["campanhas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_campanhas_ativas");
      if (error) throw error;
      return (data ?? []) as unknown as (Campanha & { status: CampanhaStatus })[];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

export function useCreateCampanha() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const companyId = useEffectiveCompanyId();
  return useMutation({
    mutationFn: async (payload: {
      titulo: string;
      descricao?: string | null;
      imagem_url?: string | null;
      data_inicio: string;
      data_fim: string;
      materiais?: CampanhaMaterial[];
      exige_leitura?: boolean;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      if (payload.data_inicio > payload.data_fim) {
        throw new Error("A data de início deve ser anterior ou igual à data de fim");
      }
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("campanhas_comunicados")
        .insert({
          company_id: companyId,
          titulo: payload.titulo,
          descricao: payload.descricao ?? null,
          imagem_url: payload.imagem_url ?? null,
          data_inicio: payload.data_inicio,
          data_fim: payload.data_fim,
          criado_por: user?.id ?? null,
          materiais: (payload.materiais ?? []) as any,
          exige_leitura: payload.exige_leitura ?? true,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Campanha;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanhas-comunicados"] });
      qc.invalidateQueries({ queryKey: ["campanhas-ativas"] });
      toast({ title: "Campanha criada com sucesso!" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao criar campanha", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateCampanha() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      titulo?: string;
      descricao?: string | null;
      imagem_url?: string | null;
      data_inicio?: string;
      data_fim?: string;
      materiais?: CampanhaMaterial[];
      exige_leitura?: boolean;
    }) => {
      if (payload.data_inicio && payload.data_fim && payload.data_inicio > payload.data_fim) {
        throw new Error("A data de início deve ser anterior ou igual à data de fim");
      }
      const { data, error } = await supabase
        .from("campanhas_comunicados")
        .update(payload as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Campanha;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanhas-comunicados"] });
      qc.invalidateQueries({ queryKey: ["campanhas-ativas"] });
      toast({ title: "Campanha atualizada com sucesso!" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteCampanha() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("campanhas_comunicados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campanhas-comunicados"] });
      qc.invalidateQueries({ queryKey: ["campanhas-ativas"] });
      toast({ title: "Campanha excluída" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });
}

export { computeStatus };
