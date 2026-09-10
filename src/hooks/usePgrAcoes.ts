import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { mapPostgresError } from "./usePgrImportacao";
import { toast } from "sonner";

export interface PgrPlanoAcao {
  id: string;
  company_id: string;
  pgr_importacao_id: string;
  acao: string;
  responsavel_id: string | null;
  cargo_responsavel: string | null;
  prazo: string | null;
  prioridade: "alta" | "media" | "baixa";
  status: "pendente" | "em_andamento" | "concluida" | "validada";
  evidencia_url: string | null;
  historico: any[];
  created_at: string;
  updated_at: string;
  // JOIN data — responsavel_id FK → colaboradores.id
  colaboradores?: {
    full_name: string | null;
  } | null;
}

export function useAcoesPgr(pgrImportacaoId: string) {
  const companyId = useEffectiveCompanyId();
  return useQuery({
    queryKey: ["pgr-acoes", pgrImportacaoId],
    enabled: !!companyId && !!pgrImportacaoId,
    queryFn: async (): Promise<PgrPlanoAcao[]> => {
      const { data, error } = await (supabase as any)
        .from("pgr_plano_acao")
        .select(`
          *,
          colaboradores:responsavel_id (full_name)
        `)
        .eq("company_id", companyId)
        .eq("pgr_importacao_id", pgrImportacaoId)
        .order("created_at", { ascending: true });
        
      if (error) {
        console.error("[usePgrAcoes] Erro ao buscar ações (Supabase raw):", error.code, error.message, error.details);
        throw new Error(mapPostgresError(error));
      }
      return data || [];
    },
  });
}

export function useUpdateAcao() {
  const { user } = useAuth();
  const companyId = useEffectiveCompanyId();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      pgrImportacaoId,
      updates,
      mensagemLog
    }: {
      id: string;
      pgrImportacaoId: string;
      updates: Partial<PgrPlanoAcao>;
      mensagemLog?: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      
      // Busca o histórico atual
      const { data: currentData, error: fetchErr } = await (supabase as any)
        .from("pgr_plano_acao")
        .select("historico")
        .eq("id", id)
        .single();
        
      if (fetchErr) throw new Error(mapPostgresError(fetchErr));
      
      const historicoAtual = currentData?.historico || [];
      const novoHistorico = [...historicoAtual];
      
      if (mensagemLog) {
        novoHistorico.push({
          data: new Date().toISOString(),
          autor_id: user.id,
          mudanca: mensagemLog
        });
      }

      const { data, error: updateErr } = await (supabase as any)
        .from("pgr_plano_acao")
        .update({ ...updates, historico: novoHistorico })
        .eq("id", id)
        .eq("company_id", companyId)
        .select();
        
      if (updateErr) throw new Error(mapPostgresError(updateErr));
      if (!data || data.length === 0) {
        throw new Error("Nenhuma linha atualizada — verifique o status enviado e a permissão");
      }
      return { id, pgrImportacaoId };
    },
    onMutate: async ({ pgrImportacaoId, id, updates }) => {
      await qc.cancelQueries({ queryKey: ["pgr-acoes", pgrImportacaoId] });
      const previousAcoes = qc.getQueryData<PgrPlanoAcao[]>(["pgr-acoes", pgrImportacaoId]);
      
      if (previousAcoes) {
        qc.setQueryData<PgrPlanoAcao[]>(["pgr-acoes", pgrImportacaoId], old => 
          old?.map(acao => acao.id === id ? { ...acao, ...updates } : acao)
        );
      }
      return { previousAcoes, pgrImportacaoId };
    },
    onError: (err, newAcao, context) => {
      console.error("[useUpdateAcao] Erro na mutação:", err);
      toast.error(`Erro ao atualizar ação: ${err.message}`);
      if (context?.previousAcoes) {
        qc.setQueryData(["pgr-acoes", context.pgrImportacaoId], context.previousAcoes);
      }
    },
    onSettled: (data) => {
      if (data?.pgrImportacaoId) {
        qc.invalidateQueries({ queryKey: ["pgr-acoes", data.pgrImportacaoId] });
      }
    },
  });
}

export function useUploadEvidenciaAcao() {
  const companyId = useEffectiveCompanyId();
  return useMutation({
    mutationFn: async ({ file }: { file: File }): Promise<string> => {
      if (!companyId) throw new Error("Empresa não identificada");
      
      const storagePath = `${companyId}/evidencias/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("documentos_analise")
        .upload(storagePath, file, { upsert: false });
        
      if (uploadError) throw new Error(`Falha no upload: ${mapPostgresError(uploadError)}`);
      return storagePath;
    }
  });
}

export function useSincronizarAcoes() {
  const qc = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (p_importacao_id: string) => {
      if (!user) throw new Error("Não autenticado");
      
      const { error } = await supabase.rpc('sincronizar_pgr_acoes', { p_importacao_id });
      
      if (error) {
        console.error("[usePgrAcoes] Erro na RPC de sincronização:", error.code, error.message, error.details);
        throw new Error(`Falha ao sincronizar: ${mapPostgresError(error)}`);
      }
      
      return p_importacao_id;
    },
    onSuccess: (p_importacao_id) => {
      qc.invalidateQueries({ queryKey: ["pgr-acoes", p_importacao_id] });
    }
  });
}
