import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { toast } from "sonner";

export type CuidarConteudoTipo = "video" | "artigo" | "cartilha";
export type CuidarConteudoStatus = "ativo" | "inativo";
export type CuidarConteudoOrigem = "url" | "upload";

export const CUIDAR_BUCKET = "cuidar-materiais";
export const CUIDAR_MAX_BYTES = 500 * 1024 * 1024; // 500 MB

export interface CuidarConteudo {
  id: string;
  company_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: CuidarConteudoTipo;
  url: string | null;
  categoria: string;
  status: CuidarConteudoStatus;
  origem: CuidarConteudoOrigem;
  storage_path: string | null;
  mime_type: string | null;
  tamanho_bytes: number | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
  /** Campos editoriais (vitrine) */
  capa_path: string | null;
  conteudo_detalhado: string | null;
  parceiro_nome: string | null;
  parceiro_url: string | null;
  parceiro_cta: string | null;
  permite_download: boolean;
  destaque: boolean;
  duracao_min: number | null;
}

export interface CuidarConteudoInput {
  titulo: string;
  descricao?: string | null;
  tipo: CuidarConteudoTipo;
  categoria: string;
  status: CuidarConteudoStatus;
  origem: CuidarConteudoOrigem;
  url?: string | null;
  storage_path?: string | null;
  mime_type?: string | null;
  tamanho_bytes?: number | null;
  capa_path?: string | null;
  conteudo_detalhado?: string | null;
  parceiro_nome?: string | null;
  parceiro_url?: string | null;
  parceiro_cta?: string | null;
  permite_download?: boolean;
  destaque?: boolean;
  duracao_min?: number | null;
}


export const CATEGORIAS_CUIDAR = [
  "Burnout",
  "Estresse",
  "Assédio",
  "Bem-estar",
  "Ansiedade",
  "Sono",
  "Relacionamentos",
  "Liderança",
  "Outros",
];

/** Sanitiza nome de arquivo removendo acentos, espaços e caracteres especiais. */
export function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot).toLowerCase() : "";
  const clean = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "arquivo";
  return `${clean}${ext}`;
}

/** Formata bytes em string legível. */
export function formatarTamanho(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Lista materiais visíveis para o colaborador (apenas ativos, RLS aplica filtro). */
export function useListarConteudosAtivos() {
  return useQuery({
    queryKey: ["cuidar_conteudos", "ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cuidar_conteudos")
        .select("*")
        .eq("status", "ativo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CuidarConteudo[];
    },
  });
}

/** Lista todos os materiais (visão admin). Inclui globais (company_id NULL). */
export function useListarConteudosAdmin() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["cuidar_conteudos", "admin", companyId],
    queryFn: async () => {
      let query = supabase
        .from("cuidar_conteudos")
        .select("*")
        .order("created_at", { ascending: false });
      // Quando uma empresa específica está selecionada, inclui também os
      // materiais globais (company_id IS NULL) para que admin_master enxergue
      // tudo que está visível para os colaboradores daquela empresa.
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as CuidarConteudo[];
    },
  });
}

/** Gera signed URL temporária (1h) para preview/download. */
export async function getCuidarSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(CUIDAR_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Faz upload de arquivo no bucket. Lança em caso de erro. */
export async function uploadCuidarArquivo(
  file: File,
  companyId: string | null,
): Promise<{ storage_path: string; mime_type: string; tamanho_bytes: number }> {
  if (file.size > CUIDAR_MAX_BYTES) {
    throw new Error("Arquivo excede o limite de 500MB.");
  }
  const folder = companyId ?? "global";
  const path = `${folder}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const { error } = await supabase.storage.from(CUIDAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return {
    storage_path: path,
    mime_type: file.type || "application/octet-stream",
    tamanho_bytes: file.size,
  };
}

export const CUIDAR_CAPA_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Faz upload da imagem de capa (pasta `<empresa|global>/capas/`). */
export async function uploadCuidarCapa(
  file: File,
  companyId: string | null,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("A capa deve ser uma imagem (JPG, PNG ou WebP).");
  }
  if (file.size > CUIDAR_CAPA_MAX_BYTES) {
    throw new Error("A imagem de capa deve ter até 5MB.");
  }
  const folder = companyId ?? "global";
  const path = `${folder}/capas/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;
  const { error } = await supabase.storage.from(CUIDAR_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

/** Resolve (com cache) a URL assinada de uma capa. */
export function useCuidarCapaUrl(capaPath: string | null | undefined) {
  return useQuery({
    queryKey: ["cuidar_capa_url", capaPath],
    queryFn: () => getCuidarSignedUrl(capaPath as string),
    enabled: !!capaPath,
    staleTime: 50 * 60 * 1000,
    retry: false,
  });
}

/** Aceita apenas links http/https para evitar `javascript:` e afins. */
export function sanitizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}


export function useGerenciarConteudos() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const companyId = useEffectiveCompanyId();

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["cuidar_conteudos"] });

  const removerArquivoStorage = async (path: string | null) => {
    if (!path) return;
    await supabase.storage.from(CUIDAR_BUCKET).remove([path]);
  };

  const criar = useMutation({
    mutationFn: async (input: CuidarConteudoInput) => {
      const { data, error } = await supabase
        .from("cuidar_conteudos")
        .insert({
          titulo: input.titulo,
          descricao: input.descricao ?? null,
          tipo: input.tipo,
          categoria: input.categoria,
          status: input.status,
          origem: input.origem,
          url: input.origem === "url" ? input.url ?? null : null,
          storage_path: input.origem === "upload" ? input.storage_path ?? null : null,
          mime_type: input.mime_type ?? null,
          tamanho_bytes: input.tamanho_bytes ?? null,
          capa_path: input.capa_path ?? null,
          conteudo_detalhado: input.conteudo_detalhado ?? null,
          parceiro_nome: input.parceiro_nome ?? null,
          parceiro_url: input.parceiro_url ?? null,
          parceiro_cta: input.parceiro_cta ?? null,
          permite_download: input.permite_download ?? true,
          destaque: input.destaque ?? false,
          duracao_min: input.duracao_min ?? null,
          company_id: companyId,
          criado_por: user?.id ?? null,
        })
        .select()
        .single();
      if (error) {
        // rollback: se já fez upload e a linha falhou, remove o arquivo
        if (input.origem === "upload" && input.storage_path) {
          await removerArquivoStorage(input.storage_path);
        }
        throw error;
      }
      return data as CuidarConteudo;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Material cadastrado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao cadastrar"),
  });

  const atualizar = useMutation({
    mutationFn: async ({
      id,
      input,
      previousStoragePath,
      previousCapaPath,
    }: {
      id: string;
      input: CuidarConteudoInput;
      previousStoragePath?: string | null;
      previousCapaPath?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("cuidar_conteudos")
        .update({
          titulo: input.titulo,
          descricao: input.descricao ?? null,
          tipo: input.tipo,
          categoria: input.categoria,
          status: input.status,
          origem: input.origem,
          url: input.origem === "url" ? input.url ?? null : null,
          storage_path: input.origem === "upload" ? input.storage_path ?? null : null,
          mime_type: input.mime_type ?? null,
          tamanho_bytes: input.tamanho_bytes ?? null,
          capa_path: input.capa_path ?? null,
          conteudo_detalhado: input.conteudo_detalhado ?? null,
          parceiro_nome: input.parceiro_nome ?? null,
          parceiro_url: input.parceiro_url ?? null,
          parceiro_cta: input.parceiro_cta ?? null,
          permite_download: input.permite_download ?? true,
          destaque: input.destaque ?? false,
          duracao_min: input.duracao_min ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      // remove arquivo antigo se foi substituído
      if (
        previousStoragePath &&
        previousStoragePath !== input.storage_path
      ) {
        await removerArquivoStorage(previousStoragePath);
      }
      if (previousCapaPath && previousCapaPath !== input.capa_path) {
        await removerArquivoStorage(previousCapaPath);
      }
      return data as CuidarConteudo;
    },

    onSuccess: () => {
      invalidate();
      toast.success("Material atualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao atualizar"),
  });

  const alternarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CuidarConteudoStatus }) => {
      const { error } = await supabase
        .from("cuidar_conteudos")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao alterar status"),
  });

  const excluir = useMutation({
    mutationFn: async (conteudo: {
      id: string;
      storage_path?: string | null;
      capa_path?: string | null;
    }) => {
      const { error } = await supabase
        .from("cuidar_conteudos")
        .delete()
        .eq("id", conteudo.id);
      if (error) throw error;
      if (conteudo.storage_path) {
        await removerArquivoStorage(conteudo.storage_path);
      }
      if (conteudo.capa_path) {
        await removerArquivoStorage(conteudo.capa_path);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Material excluído");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  const replicarGlobal = useMutation({
    mutationFn: async (conteudo: {
      id: string;
      origem: CuidarConteudoOrigem;
      storage_path: string | null;
      capa_path?: string | null;
    }) => {
      const { data, error } = await supabase.rpc(
        "replicate_cuidar_conteudo_to_all",
        { p_id: conteudo.id },
      );
      if (error) throw error;

      // Se houver arquivo, mover para a pasta 'global/' para que colaboradores
      // de todas as empresas consigam ler (RLS permite folder='global').
      if (
        conteudo.origem === "upload" &&
        conteudo.storage_path &&
        !conteudo.storage_path.startsWith("global/")
      ) {
        const filename = conteudo.storage_path.split("/").pop() ?? "arquivo";
        const novoPath = `global/${crypto.randomUUID()}-${filename}`;
        const { error: moveError } = await supabase.storage
          .from(CUIDAR_BUCKET)
          .move(conteudo.storage_path, novoPath);
        if (!moveError) {
          await supabase
            .from("cuidar_conteudos")
            .update({ storage_path: novoPath })
            .eq("id", conteudo.id);
        }
      }

      // Mesma lógica para a capa.
      if (conteudo.capa_path && !conteudo.capa_path.startsWith("global/")) {
        const filename = conteudo.capa_path.split("/").pop() ?? "capa";
        const novaCapa = `global/capas/${crypto.randomUUID()}-${filename}`;
        const { error: moveError } = await supabase.storage
          .from(CUIDAR_BUCKET)
          .move(conteudo.capa_path, novaCapa);
        if (!moveError) {
          await supabase
            .from("cuidar_conteudos")
            .update({ capa_path: novaCapa })
            .eq("id", conteudo.id);
        }
      }
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Material replicado para todas as empresas");
    },
    onError: (e: any) =>
      toast.error(e?.message ?? "Erro ao replicar material"),
  });

  return { criar, atualizar, alternarStatus, excluir, replicarGlobal };
}

/** Extrai o ID de um vídeo do YouTube de uma URL, ou null. */
export function extractYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
