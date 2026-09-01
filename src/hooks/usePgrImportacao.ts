import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";

export interface DadosEmpresaPgr {
  nome: string | null;
  cnpj: string | null;
  responsavel_tecnico: string | null;
  cargo_responsavel: string | null;
  data_elaboracao: string | null;
  validade: string | null;
}

export interface RiscoExtraido {
  categoria: string;
  nome: string;
  descricao: string | null;
  probabilidade: number;
  severidade: number;
  local_exposicao: string | null;
  medidas_existentes: string | null;
}

export interface AcaoExtraida {
  medida: string;
  prazo_sugerido: string | null;
  responsavel_sugerido: string | null;
  prioridade: "alta" | "media" | "baixa";
  risco_referenciado: string | null;
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

/** Faz polling no status da importação até sair de 'processando'. */
async function aguardarResultado(importacaoId: string, timeoutMs = 60_000): Promise<PgrImportacao> {
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
      const storagePath = `pgr-importacoes/${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos_analise")
        .upload(storagePath, file, { upsert: false });
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

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
      if (insertError) throw new Error(`Falha ao registrar: ${insertError.message}`);

      // Invocar Edge Function de análise (fire-and-forget em background,
      // o polling abaixo aguarda o resultado sem bloquear o preflight).
      supabase.functions
        .invoke("pgr-importar", { body: { importacao_id: importacao.id } })
        .catch(async (fnErr) => {
          console.warn("[usePgrImportacao] Edge Function error (background):", fnErr);
          // Se a função falhar completamente (CORS, crash, 500, timeout), atualiza o DB para não ficar travado
          await (supabase as any)
            .from("pgr_importacoes")
            .update({ status: "erro", erro_mensagem: `Erro na execução da análise: ${fnErr.message ?? String(fnErr)}` })
            .eq("id", importacao.id);
        });

      // Polling: aguarda o status sair de 'processando' (max 60s)
      const resultado = await aguardarResultado(importacao.id, 60_000);
      return resultado;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pgr-importacoes"] }),
  });
}

// ──────────────────────────────────────────────────────────────
// Confirmar extração: salva dados revisados e ativa plano de ação
// ──────────────────────────────────────────────────────────────
export function useConfirmarImportacaoPgr() {
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

      // Salva os dados confirmados na importação
      const { error: updateErr } = await (supabase as any)
        .from("pgr_importacoes")
        .update({
          status: "confirmado",
          dados_empresa: dadosEmpresa,
          riscos,
          plano_acao: planoAcao,
        })
        .eq("id", importacaoId);
      if (updateErr) throw updateErr;

      return { importacaoId, totalRiscos: riscos.length, totalAcoes: planoAcao.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pgr-importacoes"] });
      qc.invalidateQueries({ queryKey: ["nr1-planos-risco"] });
    },
  });
}
