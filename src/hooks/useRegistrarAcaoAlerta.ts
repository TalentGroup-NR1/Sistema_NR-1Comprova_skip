import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface RegistrarAcaoInput {
  alertaId: string;
  acao: string;
  novoStatus: "aberto" | "em_acao" | "resolvido" | "descartado";
}

export function useRegistrarAcaoAlerta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarAcaoInput) => {
      const { error } = await supabase.rpc("registrar_acao_alerta", {
        p_alerta_id: input.alertaId,
        p_acao: input.acao,
        p_novo_status: input.novoStatus,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cuidar-alertas"] });
      toast({ title: "Ação registrada", description: "Alerta atualizado com sucesso." });
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message || "Falha ao registrar ação.", variant: "destructive" });
    },
  });
}
