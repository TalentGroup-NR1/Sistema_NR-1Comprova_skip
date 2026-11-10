import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ReplicationResult {
  company_name: string;
  success: boolean;
  error_message: string | null;
}

// Hook to count how many companies will receive the replicated record
export function useReplicationTargetCount(sourceCompanyId: string | null) {
  return useQuery({
    queryKey: ["replication-target-count", sourceCompanyId],
    queryFn: async () => {
      if (!sourceCompanyId) return 0;
      
      const { data, error } = await supabase.rpc("count_replication_targets", {
        p_source_company_id: sourceCompanyId,
      });

      if (error) throw error;
      return data as number;
    },
    enabled: !!sourceCompanyId,
    staleTime: 60000, // 1 minute
  });
}

// Hook to replicate a Pulse Campaign
export function useReplicatePulseCampaign() {
  return useMutation({
    mutationFn: async ({
      campaignId,
      sourceCompanyId,
    }: {
      campaignId: string;
      sourceCompanyId: string;
    }) => {
      const { data, error } = await supabase.rpc("replicate_pulse_campaign", {
        p_campaign_id: campaignId,
        p_source_company_id: sourceCompanyId,
      });

      if (error) throw error;
      return data as ReplicationResult[];
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success(`Campanha replicada para ${successCount} empresas!`);
      } else if (successCount > 0) {
        toast.warning(
          `Replicado para ${successCount} empresas. ${failCount} falhas.`
        );
      } else {
        toast.error("Falha ao replicar para todas as empresas.");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na replicação: ${error.message}`);
    },
  });
}

// Hook to replicate a Ciclo de Avaliação
export function useReplicateCicloAvaliacao() {
  return useMutation({
    mutationFn: async ({
      cicloId,
      sourceCompanyId,
    }: {
      cicloId: string;
      sourceCompanyId: string;
    }) => {
      const { data, error } = await supabase.rpc("replicate_ciclo_avaliacao", {
        p_ciclo_id: cicloId,
        p_source_company_id: sourceCompanyId,
      });

      if (error) throw error;
      return data as ReplicationResult[];
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success(`Ciclo replicado para ${successCount} empresas!`);
      } else if (successCount > 0) {
        toast.warning(
          `Replicado para ${successCount} empresas. ${failCount} falhas.`
        );
      } else {
        toast.error("Falha ao replicar para todas as empresas.");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na replicação: ${error.message}`);
    },
  });
}

// Hook to replicate a Comunicado
export function useReplicateComunicado() {
  return useMutation({
    mutationFn: async ({
      comunicadoId,
      sourceCompanyId,
    }: {
      comunicadoId: string;
      sourceCompanyId: string;
    }) => {
      const { data, error } = await supabase.rpc("replicate_comunicado", {
        p_comunicado_id: comunicadoId,
        p_source_company_id: sourceCompanyId,
      });

      if (error) throw error;
      return data as ReplicationResult[];
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success(`Comunicado replicado para ${successCount} empresas!`);
      } else if (successCount > 0) {
        toast.warning(
          `Replicado para ${successCount} empresas. ${failCount} falhas.`
        );
      } else {
        toast.error("Falha ao replicar para todas as empresas.");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na replicação: ${error.message}`);
    },
  });
}

// Hook to replicate a Questionário Cuidar+/NR1
export function useReplicateQuestionarioCuidarPlus() {
  return useMutation({
    mutationFn: async ({
      questionarioId,
      sourceCompanyId,
    }: {
      questionarioId: string;
      sourceCompanyId: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "replicate_questionario_cuidar_plus",
        {
          p_questionario_id: questionarioId,
          p_source_company_id: sourceCompanyId,
        }
      );

      if (error) throw error;
      return data as ReplicationResult[];
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success(`Questionário replicado para ${successCount} empresas!`);
      } else if (successCount > 0) {
        toast.warning(
          `Replicado para ${successCount} empresas. ${failCount} falhas.`
        );
      } else {
        toast.error("Falha ao replicar para todas as empresas.");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na replicação: ${error.message}`);
    },
  });
}

// Hook to replicate a Questionnaire Template (Diário de Bordo)
export function useReplicateQuestionnaireTemplate() {
  return useMutation({
    mutationFn: async ({
      templateId,
      sourceCompanyId,
    }: {
      templateId: string;
      sourceCompanyId: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "replicate_questionnaire_template",
        {
          p_template_id: templateId,
          p_source_company_id: sourceCompanyId,
        }
      );

      if (error) throw error;
      return data as ReplicationResult[];
    },
    onSuccess: (results) => {
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success(`Template replicado para ${successCount} empresas!`);
      } else if (successCount > 0) {
        toast.warning(
          `Replicado para ${successCount} empresas. ${failCount} falhas.`
        );
      } else {
        toast.error("Falha ao replicar para todas as empresas.");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro na replicação: ${error.message}`);
    },
  });
}
