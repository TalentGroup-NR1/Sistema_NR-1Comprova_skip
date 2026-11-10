import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { toast } from "sonner";
import { Treinamento } from "./useTreinamentos";

export interface EmpresaTreinamentoHabilitado {
  id: string;
  company_id: string;
  treinamento_id: string;
  habilitado: boolean;
  obrigatorio: boolean;
  habilitado_por: string | null;
  habilitado_em: string;
  created_at: string;
  updated_at: string;
}

export function isSaudeMentalOuPsicossocial(titulo?: string | null, categoriaNome?: string | null): boolean {
  const keywords = [
    "saúde mental",
    "saude mental",
    "ansiedade",
    "psicossocial",
    "bem-estar",
    "bem estar",
    "emoções",
    "emocoes",
    "estresse",
    "assédio",
    "assedio",
  ];
  const text = `${titulo || ""} ${categoriaNome || ""}`.toLowerCase();
  return keywords.some((kw) => text.includes(kw));
}

// Hook para buscar os cursos da plataforma publicados para o cliente
export function useTreinamentosPlataformaPublicados() {
  return useQuery({
    queryKey: ["treinamentos-plataforma-publicados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treinamentos")
        .select(`
          *,
          categoria:categorias_treinamento(id, nome, cor)
        `)
        .eq("origem", "plataforma")
        .is("company_id", null)
        .eq("status", "publicado")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar catálogo da plataforma:", error);
        throw error;
      }

      return (data as Treinamento[]) || [];
    },
  });
}

// Hook para buscar o mapa de habilitações da empresa atual
export function useEmpresaHabilitacoesMap() {
  const companyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ["empresa-treinamentos-habilitados", companyId],
    queryFn: async () => {
      if (!companyId) return {};

      const { data, error } = await supabase
        .from("empresa_treinamentos_habilitados")
        .select("treinamento_id, habilitado, obrigatorio, habilitado_em")
        .eq("company_id", companyId);

      if (error) {
        console.error("Erro ao carregar habilitações da empresa:", error);
        throw error;
      }

      const map: Record<string, { habilitado: boolean; obrigatorio: boolean; habilitado_em: string }> = {};
      (data || []).forEach((row) => {
        map[row.treinamento_id] = {
          habilitado: row.habilitado,
          obrigatorio: row.obrigatorio,
          habilitado_em: row.habilitado_em,
        };
      });

      return map;
    },
    enabled: !!companyId,
  });
}

// Hook para alternar habilitação / obrigatoriedade
export function useSalvarHabilitacaoTreinamento() {
  const queryClient = useQueryClient();
  const companyId = useEffectiveCompanyId();

  return useMutation({
    mutationFn: async ({
      treinamentoId,
      habilitado,
      obrigatorio,
    }: {
      treinamentoId: string;
      habilitado: boolean;
      obrigatorio: boolean;
    }) => {
      if (!companyId) {
        throw new Error("Empresa não selecionada.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("empresa_treinamentos_habilitados")
        .upsert(
          {
            company_id: companyId,
            treinamento_id: treinamentoId,
            habilitado,
            obrigatorio: habilitado ? obrigatorio : false,
            habilitado_por: user?.id ?? null,
            habilitado_em: now,
            updated_at: now,
          },
          {
            onConflict: "company_id,treinamento_id",
          }
        )
        .select()
        .single();

      if (error) {
        console.error("Erro ao salvar habilitação do treinamento:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["empresa-treinamentos-habilitados", companyId] });
      queryClient.invalidateQueries({ queryKey: ["treinamentos-publicados", companyId] });
      queryClient.invalidateQueries({ queryKey: ["treinamentos", companyId] });
      toast.success(
        variables.habilitado
          ? "Treinamento habilitado para os colaboradores"
          : "Treinamento desabilitado para os colaboradores"
      );
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar treinamento.");
    },
  });
}

