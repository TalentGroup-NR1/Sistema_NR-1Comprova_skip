import { supabase } from "@/integrations/supabase/client";

export interface EmitenteInfo {
  nome: string;
  cargo: string | null;
  email: string;
}

/**
 * Resolve nome completo + cargo do emitente (usuário logado que gera o PDF).
 * Busca em profiles e colaboradores (job_title).
 */
export async function resolverEmitente(userId: string, fallbackEmail: string): Promise<EmitenteInfo> {
  let nome = fallbackEmail;
  let cargo: string | null = null;

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .maybeSingle();
    if (prof?.full_name) nome = prof.full_name;
  } catch {
    /* ignore */
  }

  try {
    const { data: colab } = await supabase
      .from("colaboradores")
      .select("full_name, job_title")
      .eq("user_id", userId)
      .maybeSingle();
    if (colab?.job_title) cargo = colab.job_title;
    if (colab?.full_name && (!nome || nome === fallbackEmail)) nome = colab.full_name;
  } catch {
    /* ignore */
  }

  return { nome, cargo, email: fallbackEmail };
}

/**
 * Resolve nome completo do autor de um comunicado/campanha quando o campo
 * `autor_nome` está com username (sem espaço) ou vazio.
 */
export async function resolverAutorNome(
  autorId: string | null | undefined,
  autorNomeAtual: string | null | undefined
): Promise<string> {
  const atual = (autorNomeAtual || "").trim();
  const pareceUsername = atual && !/\s/.test(atual);
  if (atual && !pareceUsername) return atual;
  if (!autorId) return atual || "—";

  try {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", autorId)
      .maybeSingle();
    if (prof?.full_name) return prof.full_name;
  } catch {
    /* ignore */
  }

  try {
    const { data: colab } = await supabase
      .from("colaboradores")
      .select("full_name")
      .eq("user_id", autorId)
      .maybeSingle();
    if (colab?.full_name) return colab.full_name;
  } catch {
    /* ignore */
  }

  return atual || "—";
}
