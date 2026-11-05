import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TreinamentoTipo, TreinamentoStatus } from "@/hooks/useTreinamentos";

export interface CategoriaPlataforma {
  id: string;
  company_id: null;
  nome: string;
  descricao: string | null;
  cor: string;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface TreinamentoGlobal {
  id: string;
  company_id: null;
  categoria_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: TreinamentoTipo;
  url_conteudo: string | null;
  nome_arquivo: string | null;
  duracao_estimada_minutos: number | null;
  nivel: string | null;
  idioma: string | null;
  tags: string[] | null;
  tempo_minimo_minutos: number;
  quiz_obrigatorio: boolean;
  termo_ciencia_obrigatorio: boolean;
  texto_termo_ciencia: string | null;
  status: TreinamentoStatus;
  publicado_em: string | null;
  publicado_por_user_id: string | null;
  obrigatorio: boolean;
  target_company_ids: string[] | null;
  target_contract_types: string[] | null;
  capa_path: string | null;
  destaque: boolean;
  origem: 'plataforma';
  gera_certificado: boolean;
  validade_meses: number | null;
  clientes_habilitados: number;
  created_at: string;
  updated_at: string;
  categoria?: {
    id: string;
    nome: string;
    cor: string;
  } | null;
}

export interface CreateTreinamentoGlobalDTO {
  titulo: string;
  descricao?: string | null;
  tipo: TreinamentoTipo;
  url_conteudo?: string | null;
  nome_arquivo?: string | null;
  categoria_id?: string | null;
  duracao_estimada_minutos?: number | null;
  nivel?: string | null;
  gera_certificado?: boolean;
  validade_meses?: number | null;
  status?: TreinamentoStatus;
}

export interface UpdateTreinamentoGlobalDTO {
  id: string;
  titulo?: string;
  descricao?: string | null;
  tipo?: TreinamentoTipo;
  url_conteudo?: string | null;
  nome_arquivo?: string | null;
  categoria_id?: string | null;
  duracao_estimada_minutos?: number | null;
  nivel?: string | null;
  gera_certificado?: boolean;
  validade_meses?: number | null;
  status?: TreinamentoStatus;
}

export function useCategoriasPlataforma() {
  return useQuery({
    queryKey: ["categorias-plataforma"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_treinamento")
        .select("*")
        .is("company_id", null)
        .order("ordem", { ascending: true });

      if (error) throw error;
      return (data || []) as CategoriaPlataforma[];
    },
  });
}

export function useCreateCategoriaPlataforma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { nome: string; descricao?: string | null; cor?: string; ordem?: number }) => {
      const { data, error } = await supabase
        .from("categorias_treinamento")
        .insert({
          company_id: null,
          nome: dto.nome.trim(),
          descricao: dto.descricao?.trim() || null,
          cor: dto.cor || "#6366f1",
          ordem: dto.ordem ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-plataforma"] });
      toast({
        title: "Categoria criada",
        description: "Categoria da plataforma cadastrada com sucesso.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao criar categoria",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateCategoriaPlataforma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: { id: string; nome: string; descricao?: string | null; cor?: string }) => {
      const { data, error } = await supabase
        .from("categorias_treinamento")
        .update({
          nome: dto.nome.trim(),
          descricao: dto.descricao?.trim() || null,
          cor: dto.cor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dto.id)
        .is("company_id", null)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-plataforma"] });
      queryClient.invalidateQueries({ queryKey: ["treinamentos-globais"] });
      toast({
        title: "Categoria atualizada",
        description: "Alterações salvas com sucesso.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteCategoriaPlataforma() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("categorias_treinamento")
        .delete()
        .eq("id", id)
        .is("company_id", null);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categorias-plataforma"] });
      toast({
        title: "Categoria removida",
        description: "Categoria excluída do catálogo global.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useTreinamentosGlobais() {
  return useQuery({
    queryKey: ["treinamentos-globais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treinamentos")
        .select(`
          *,
          categoria:categorias_treinamento(id, nome, cor)
        `)
        .eq("origem", "plataforma")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Agregação de clientes habilitados (retorna 0 enquanto etapa 8.6 não habilita)
      const list = (data || []).map((t) => ({
        ...t,
        clientes_habilitados: 0,
      })) as TreinamentoGlobal[];

      return list;
    },
  });
}

export function useCreateTreinamentoGlobal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTreinamentoGlobalDTO) => {
      const isLink = dto.tipo === "link";
      const { data, error } = await supabase
        .from("treinamentos")
        .insert({
          company_id: null,
          origem: "plataforma",
          titulo: dto.titulo.trim(),
          descricao: dto.descricao?.trim() || null,
          tipo: dto.tipo,
          url_conteudo: dto.url_conteudo || null,
          nome_arquivo: dto.nome_arquivo || null,
          categoria_id: dto.categoria_id || null,
          duracao_estimada_minutos: dto.duracao_estimada_minutos || null,
          nivel: dto.nivel || null,
          gera_certificado: isLink ? false : (dto.gera_certificado ?? true),
          validade_meses: dto.validade_meses || null,
          status: dto.status || "rascunho",
          publicado_em: dto.status === "publicado" ? new Date().toISOString() : null,
          obrigatorio: false,
          destaque: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treinamentos-globais"] });
      toast({
        title: "Treinamento criado",
        description: "Treinamento adicionado ao Catálogo Global da Plataforma.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao criar treinamento global",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTreinamentoGlobal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateTreinamentoGlobalDTO) => {
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (dto.titulo !== undefined) payload.titulo = dto.titulo.trim();
      if (dto.descricao !== undefined) payload.descricao = dto.descricao?.trim() || null;
      if (dto.tipo !== undefined) {
        payload.tipo = dto.tipo;
        if (dto.tipo === "link") {
          payload.gera_certificado = false;
        }
      }
      if (dto.url_conteudo !== undefined) payload.url_conteudo = dto.url_conteudo;
      if (dto.nome_arquivo !== undefined) payload.nome_arquivo = dto.nome_arquivo;
      if (dto.categoria_id !== undefined) payload.categoria_id = dto.categoria_id || null;
      if (dto.duracao_estimada_minutos !== undefined) payload.duracao_estimada_minutos = dto.duracao_estimada_minutos || null;
      if (dto.nivel !== undefined) payload.nivel = dto.nivel || null;
      if (dto.gera_certificado !== undefined && dto.tipo !== "link") payload.gera_certificado = dto.gera_certificado;
      if (dto.validade_meses !== undefined) payload.validade_meses = dto.validade_meses || null;
      if (dto.status !== undefined) {
        payload.status = dto.status;
        if (dto.status === "publicado") {
          payload.publicado_em = new Date().toISOString();
        }
      }

      const { data, error } = await supabase
        .from("treinamentos")
        .update(payload)
        .eq("id", dto.id)
        .eq("origem", "plataforma")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treinamentos-globais"] });
      toast({
        title: "Treinamento atualizado",
        description: "Alterações salvas no Catálogo Global com sucesso.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao atualizar treinamento global",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}

export function useToggleStatusTreinamentoGlobal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TreinamentoStatus }) => {
      const payload: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (status === "publicado") {
        payload.publicado_em = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("treinamentos")
        .update(payload)
        .eq("id", id)
        .eq("origem", "plataforma")
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["treinamentos-globais"] });
      const statusLabel = variables.status === "publicado" ? "Publicado" : variables.status === "arquivado" ? "Arquivado" : "Rascunho";
      toast({
        title: `Treinamento ${statusLabel}`,
        description: `O status do curso no catálogo foi alterado para ${statusLabel.toLowerCase()}.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Erro ao alterar status",
        description: err.message,
        variant: "destructive",
      });
    },
  });
}
