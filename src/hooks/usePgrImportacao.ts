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
// Iniciar importação: faz upload do PDF e cria o registro
// ──────────────────────────────────────────────────────────────
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

      // Invocar Edge Function de análise
      const { error: fnError } = await supabase.functions.invoke("pgr-importar", {
        body: { importacao_id: importacao.id },
      });
      if (fnError) {
        // Não falha o fluxo: o status ficará 'processando' e o usuário pode retentar
        console.warn("Edge Function pgr-importar retornou erro:", fnError);
      }

      // Buscar registro atualizado
      const { data: updated, error: refetchError } = await (supabase as any)
        .from("pgr_importacoes").select("*").eq("id", importacao.id).single();
      if (refetchError) throw refetchError;
      return updated as PgrImportacao;
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
