import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";

export interface DadosEmpresaPgr {
  nome: string | null;
  cnpj: string | null;
  responsavel_tecnico: string | null;
  cargo_responsavel: string | null;
  registro_profissional: string | null;
  data_elaboracao: string | null;
  validade: string | null;
}

export interface RiscoExtraido {
  categoria: string;
  nome: string;
  descricao: string | null;
  grupo_exposto?: string | null;
  probabilidade: number | null;
  severidade: number | null;
  nivel?: number | null;
  classificacao?: string | null;
  escala_matriz?: string | null;
  local_exposicao: string | null;
  medidas_existentes: string | null;
  fonte?: string | null;
  confianca?: number | null;
}

export interface AcaoExtraida {
  id?: string;
  medida: string;
  prazo_sugerido: string | null;
  responsavel_sugerido: string | null;
  responsavel_id?: string | null;
  prioridade: "alta" | "media" | "baixa";
  risco_referenciado: string | null;
  status?: "pendente" | "em_andamento" | "concluida" | "validada";
  evidencia_url?: string | null;
  historico?: any[];
  // Campos 5W2H (vindos do Gemini, opcionais)
  por_que?: string | null;
  onde?: string | null;
  como?: string | null;
  custo_estimado?: number | null;
}

export interface ExtracaoRaw {
  dados_empresa: DadosEmpresaPgr;
  riscos: RiscoExtraido[];
  plano_acao: AcaoExtraida[];
  modo_extracao: string;
  aviso?: string;
  motivo_fallback?: string;
}

export interface PgrImportacao {
  id: string;
  company_id: string;
  arquivo_nome: string;
  arquivo_storage: string;
  arquivo_tamanho: number | null;
  status: "processando" | "aguardando_revisao" | "confirmado" | "erro";
  erro_mensagem: string | null;
  extracao_raw: ExtracaoRaw | null;
  modo_extracao: string | null;
  dados_empresa: DadosEmpresaPgr | null;
  riscos: RiscoExtraido[] | null;
  plano_acao: AcaoExtraida[] | null;
  created_at: string;
  updated_at: string;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
export function mapPostgresError(error: any): string {
  if (!error) return "Erro desconhecido.";
  const code = error.code || error.status;
  
  if (code === "42501" || code === 403) {
    return "Acesso negado: Você não tem permissão para realizar esta ação.";
  }
  if (code === "23503") {
    return "Erro de referência: O registro associado não existe mais.";
  }
  if (code === "23505") {
    return "Conflito: Já existe um registro com estes mesmos dados.";
  }
  
  return error.message || "Ocorreu um erro inesperado ao processar a requisição.";
}

// ──────────────────────────────────────────────────────────────
// Listar importações da empresa
// ──────────────────────────────────────────────────────────────
export function usePgrImportacoes() {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["pgr-importacoes", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<PgrImportacao[]> => {
      const { data, error } = await (supabase as any)
        .from("pgr_importacoes")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PgrImportacao[];
    },
  });
}

// ──────────────────────────────────────────────────────────────
// Iniciar importação: faz upload do PDF, cria o registro e aguarda
// o resultado da Edge Function com polling (até 60s).
// ──────────────────────────────────────────────────────────────

/** Faz polling no status da importação até sair de 'processando' (até 120s para documentos volumosos). */
async function aguardarResultado(importacaoId: string, timeoutMs = 120_000): Promise<PgrImportacao> {
  const POLL_INTERVAL = 2_000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const { data, error } = await (supabase as any)
      .from("pgr_importacoes")
      .select("*")
      .eq("id", importacaoId)
      .single();
    if (error) throw new Error(`Falha ao verificar status: ${error.message}`);
    const row = data as PgrImportacao;
    if (row.status !== "processando") return row;
  }

  // Timeout: retorna o registro mesmo que ainda esteja processando
  const { data } = await (supabase as any)
    .from("pgr_importacoes").select("*").eq("id", importacaoId).single();
  return data as PgrImportacao;
}

export function useIniciarImportacaoPgr() {
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<PgrImportacao> => {
      if (!companyId) throw new Error("Selecione uma empresa.");
      if (!user?.id) throw new Error("Não autenticado.");

      // Validações de arquivo
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        throw new Error("Apenas arquivos PDF são aceitos.");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("O arquivo excede o limite máximo de 10MB.");
      }

      // Upload para o Storage
      const storagePath = `${companyId}/pgr-importacoes/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos_analise")
        .upload(storagePath, file, { upsert: false });
      if (uploadError) {
        console.error("[usePgrImportacao] Upload error:", uploadError);
        throw new Error(`Falha no upload: ${mapPostgresError(uploadError)}`);
      }

      // Criar registro de importação
      const { data: importacao, error: insertError } = await (supabase as any)
        .from("pgr_importacoes")
        .insert({
          company_id: companyId,
          criado_por: user.id,
          arquivo_nome: file.name,
          arquivo_storage: storagePath,
          arquivo_tamanho: file.size,
          status: "processando",
        })
        .select()
        .single();
      if (insertError) {
        console.error("[usePgrImportacao] Insert error:", insertError);
        throw new Error(`Falha ao registrar: ${mapPostgresError(insertError)}`);
      }

      // Invocar Edge Function de análise (fire-and-forget em background,
      // o polling abaixo aguarda o resultado sem bloquear o preflight).
      supabase.functions
        .invoke("pgr-importar", { body: { importacao_id: importacao.id } })
        .then(async ({ data, error: fnErr }) => {
          const actualError = fnErr || (data && data.error ? new Error(data.error) : null);
          if (actualError) {
            console.warn("[usePgrImportacao] Edge Function error (background):", actualError);
            const msg = actualError.message ?? "";
            const isCorsOrFetch = msg.includes("Failed to send a request") || msg.includes("NetworkError") || msg.includes("fetch");
            const isSemSecoes = msg.includes("documento_sem_secoes") || msg.includes("sem seções identificáveis") || msg.includes("Nenhuma seção");
            const isCorrompido = msg.includes("corrompido") || msg.includes("formato_invalido");
            const is404 = msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("em atualização") || msg.includes("no longer available");
            const isOverloaded = msg.includes("503") || msg.includes("429") || msg.includes("high demand") || msg.includes("UNAVAILABLE") || msg.includes("alta demanda") || msg.includes("ocupado");
            
            let userFriendlyMsg: string;
            if (isCorsOrFetch) {
              userFriendlyMsg = "Falha de conexão com o serviço de análise (CORS ou rede). Verifique sua conexão e tente novamente.";
            } else if (isSemSecoes) {
              userFriendlyMsg = "Nenhuma seção de Inventário de Riscos ou Plano de Ação foi identificada no documento. Verifique se o arquivo enviado é um PGR completo e legível.";
            } else if (isCorrompido) {
              userFriendlyMsg = "O arquivo PDF enviado parece corrompido ou ilegível. Tente salvar novamente o documento em formato PDF padrão e reenvie.";
            } else if (is404) {
              userFriendlyMsg = "O modelo de IA está em atualização ou temporariamente indisponível. Por favor, contate o suporte técnico.";
            } else if (isOverloaded) {
              userFriendlyMsg = "O serviço de inteligência artificial está temporariamente ocupado com alta demanda. Por favor, aguarde alguns minutos e tente novamente.";
            } else {
              userFriendlyMsg = msg.startsWith("Erro") ? msg : `Erro na execução da análise: ${msg}`;
            }
            await (supabase as any)
              .from("pgr_importacoes")
              .update({ status: "erro", erro_mensagem: userFriendlyMsg })
              .eq("id", importacao.id);
          }
        })
        .catch(async (netErr) => {
          console.warn("[usePgrImportacao] Edge Function Network error (background):", netErr);
          await (supabase as any)
            .from("pgr_importacoes")
            .update({
              status: "erro",
              erro_mensagem: "Falha de conexão com o serviço de análise. Verifique sua conexão e tente novamente.",
            })
            .eq("id", importacao.id);
        });

      // Polling: aguarda o status sair de 'processando' (estendido para 120s para documentos volumosos)
      const resultado = await aguardarResultado(importacao.id, 120_000);
      if (resultado.status === "processando") {
        throw new Error(
          "O documento é extenso e ainda está sendo processado pela IA. A análise continuará em segundo plano — caso demore, tente dividir o arquivo ou importar apenas o inventário de riscos."
        );
      }
      if (resultado.status === "erro") {
        const rawErr = resultado.erro_mensagem || "";
        const isSemSecoes = rawErr.includes("documento_sem_secoes") || rawErr.includes("Nenhuma seção");
        const isCorrompido = rawErr.includes("corrompido") || rawErr.includes("formato_invalido");
        const is404 = rawErr.includes("404") || rawErr.includes("NOT_FOUND") || rawErr.includes("em atualização") || rawErr.includes("no longer available");
        const isOverloaded = rawErr.includes("503") || rawErr.includes("429") || rawErr.includes("high demand") || rawErr.includes("UNAVAILABLE") || rawErr.includes("alta demanda");
        const finalMsg = isSemSecoes
          ? "Nenhuma seção de Inventário de Riscos ou Plano de Ação foi identificada no documento. Verifique se o arquivo enviado é um PGR completo e legível."
          : isCorrompido
          ? "O arquivo PDF enviado parece corrompido ou ilegível. Tente salvar novamente o documento em formato PDF padrão e reenvie."
          : is404
          ? "O modelo de IA está em atualização ou temporariamente indisponível. Por favor, contate o suporte técnico."
          : isOverloaded
          ? "O serviço de inteligência artificial está temporariamente ocupado com alta demanda. Por favor, aguarde alguns minutos e tente novamente."
          : (rawErr || "Falha ao processar o documento do PGR.");
        throw new Error(finalMsg);
      }
      return resultado;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pgr-importacoes"] }),
  });
}

// ──────────────────────────────────────────────────────────────
// Confirmar extração: salva dados revisados e ativa plano de ação
// ──────────────────────────────────────────────────────────────
export function useConfirmarImportacaoPgr() {
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      importacaoId,
      dadosEmpresa,
      riscos,
      planoAcao,
    }: {
      importacaoId: string;
      dadosEmpresa: DadosEmpresaPgr;
      riscos: RiscoExtraido[];
      planoAcao: AcaoExtraida[];
    }) => {
      if (!user?.id) throw new Error("Não autenticado.");
      if (!companyId) throw new Error("Selecione uma empresa.");

      // Salva os dados confirmados na importação
      const actionsWithDefaults = planoAcao.map(a => ({
        ...a,
        id: a.id || crypto.randomUUID(),
        status: a.status || "pendente"
      }));

      const { error: updateErr } = await (supabase as any)
        .from("pgr_importacoes")
        .update({
          status: "confirmado",
          dados_empresa: dadosEmpresa,
          riscos,
          plano_acao: actionsWithDefaults,
        })
        .eq("id", importacaoId);
      if (updateErr) {
        console.error("[usePgrImportacao] Confirm error:", updateErr);
        throw new Error(`Erro ao confirmar: ${mapPostgresError(updateErr)}`);
      }

      // ── Persiste as Ações na tabela viva `pgr_plano_acao` ──
      if (actionsWithDefaults.length > 0) {
        const rowsToInsert = actionsWithDefaults.map((a) => {
          let parsedDate = null;
          if (a.prazo_sugerido && !isNaN(Date.parse(a.prazo_sugerido))) {
             parsedDate = new Date(a.prazo_sugerido).toISOString().split('T')[0];
          }

          return {
            id: a.id,
            company_id: companyId,
            pgr_importacao_id: importacaoId,
            acao: a.medida,
            responsavel_id: a.responsavel_id || null,
            cargo_responsavel: a.responsavel_sugerido || null,
            prazo: parsedDate,
            prioridade: a.prioridade,
            status: a.status,
            evidencia_url: a.evidencia_url || null,
            historico: a.historico || [],
            // Campos 5W2H
            por_que: a.por_que || null,
            onde: a.onde || null,
            como: a.como || null,
            custo_estimado: a.custo_estimado ?? 0,
          };
        });

        const { error: insertActionsErr } = await (supabase as any)
          .from("pgr_plano_acao")
          .upsert(rowsToInsert);
          
        if (insertActionsErr) {
          console.error("[usePgrImportacao] Error inserting actions:", insertActionsErr);
          throw new Error(`Erro ao salvar plano de ação: ${mapPostgresError(insertActionsErr)}`);
        }
      }

      return { importacaoId, totalRiscos: riscos.length, totalAcoes: planoAcao.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-importacoes"] });
      qc.invalidateQueries({ queryKey: ["nr1-planos-risco"] });
    },
  });
}

// ──────────────────────────────────────────────────────────────
// Excluir importação (via Edge Function)
// ──────────────────────────────────────────────────────────────
export function useExcluirImportacaoPgr() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (importacaoId: string) => {
      if (!user?.id) throw new Error("Não autenticado.");

      const { data, error: fnErr } = await supabase.functions.invoke("pgr-excluir", {
        body: { importacao_id: importacaoId }
      });

      const actualError = fnErr || (data && data.error ? new Error(data.error) : null);
      if (actualError) {
        console.error("[usePgrImportacao] Delete error:", actualError);
        throw new Error(`Erro ao excluir: ${mapPostgresError(actualError)}`);
      }

      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pgr-importacoes"] }),
  });
}

// ──────────────────────────────────────────────────────────────
// Atualizar ações de um PGR importado
// ──────────────────────────────────────────────────────────────
export function useUpdatePgrActions() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ importacaoId, planoAcao }: { importacaoId: string, planoAcao: AcaoExtraida[] }) => {
      if (!user?.id) throw new Error("Não autenticado.");
      const { error: updateErr } = await (supabase as any)
        .from("pgr_importacoes")
        .update({ plano_acao: planoAcao })
        .eq("id", importacaoId);
      if (updateErr) {
        console.error("[usePgrImportacao] Update actions error:", updateErr);
        throw new Error(`Erro ao atualizar ações: ${mapPostgresError(updateErr)}`);
      }
      return { importacaoId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-importacoes"] });
    },
  });
}
