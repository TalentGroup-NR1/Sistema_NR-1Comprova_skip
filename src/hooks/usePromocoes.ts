import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";

export interface Promocao {
  id: string;
  colaborador_id: string;
  company_id: string;
  data_promocao: string;
  cargo_anterior: string;
  salario_anterior: number;
  nivel_anterior: string | null;
  departamento_anterior: string | null;
  cargo_novo: string;
  salario_novo: number;
  nivel_novo: string | null;
  departamento_novo: string | null;
  motivo: string | null;
  aprovado_por: string;
  observacoes: string | null;
  created_at: string;
  created_by_user_id: string | null;
}

export interface PromocaoWithColaborador extends Promocao {
  colaborador?: {
    full_name: string;
    department: string;
    avatar_url: string | null;
  };
}

export interface CreatePromocaoData {
  colaborador_id: string;
  company_id: string;
  data_promocao: string;
  cargo_novo: string;
  salario_novo: number;
  nivel_novo?: string | null;
  departamento_novo?: string | null;
  motivo?: string | null;
  aprovado_por: string;
  observacoes?: string | null;
}

// Hook para buscar promoções de um colaborador específico
export function usePromocoes(colaboradorId: string | null | undefined) {
  return useQuery({
    queryKey: ["promocoes", colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return [];
      
      const { data, error } = await supabase
        .from("promocoes_colaborador")
        .select("*")
        .eq("colaborador_id", colaboradorId)
        .order("data_promocao", { ascending: false });

      if (error) throw error;
      return data as Promocao[];
    },
    enabled: !!colaboradorId,
  });
}

// Hook para buscar todas as promoções da empresa (para relatórios)
export function usePromocoesEmpresa() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["promocoes-empresa", effectiveCompanyId],
    queryFn: async () => {
      let query = supabase
        .from("promocoes_colaborador")
        .select(`
          *,
          colaborador:colaboradores(full_name, department, avatar_url)
        `)
        .order("data_promocao", { ascending: false });

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PromocaoWithColaborador[];
    },
    enabled: true,
  });
}

// Hook para buscar promoções recentes (para dashboard)
export function usePromocoesRecentes(limit: number = 5) {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["promocoes-recentes", effectiveCompanyId, limit],
    queryFn: async () => {
      let query = supabase
        .from("promocoes_colaborador")
        .select(`
          *,
          colaborador:colaboradores(full_name, department, avatar_url)
        `)
        .order("data_promocao", { ascending: false })
        .limit(limit);

      if (effectiveCompanyId) {
        query = query.eq("company_id", effectiveCompanyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as PromocaoWithColaborador[];
    },
    enabled: true,
  });
}

// Hook para criar uma nova promoção (usando RPC atômica)
export function useCreatePromocao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreatePromocaoData) => {
      const { data: result, error } = await supabase.rpc("registrar_promocao", {
        p_colaborador_id: data.colaborador_id,
        p_company_id: data.company_id,
        p_data_promocao: data.data_promocao,
        p_cargo_novo: data.cargo_novo,
        p_salario_novo: data.salario_novo,
        p_nivel_novo: data.nivel_novo || null,
        p_departamento_novo: data.departamento_novo || null,
        p_motivo: data.motivo || null,
        p_aprovado_por: data.aprovado_por,
        p_observacoes: data.observacoes || null,
      });

      if (error) throw error;
      return result as unknown as Promocao;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["promocoes", variables.colaborador_id] });
      queryClient.invalidateQueries({ queryKey: ["promocoes-empresa"] });
      queryClient.invalidateQueries({ queryKey: ["promocoes-recentes"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      queryClient.invalidateQueries({ queryKey: ["colaborador", variables.colaborador_id] });
      
      toast({
        title: "Promoção registrada",
        description: "A promoção foi registrada e os dados do colaborador atualizados.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar promoção",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook para deletar uma promoção (apenas admin)
export function useDeletePromocao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (promocaoId: string) => {
      const { error } = await supabase
        .from("promocoes_colaborador")
        .delete()
        .eq("id", promocaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promocoes"] });
      queryClient.invalidateQueries({ queryKey: ["promocoes-empresa"] });
      queryClient.invalidateQueries({ queryKey: ["promocoes-recentes"] });
      
      toast({
        title: "Promoção excluída",
        description: "O registro de promoção foi removido.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir promoção",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
