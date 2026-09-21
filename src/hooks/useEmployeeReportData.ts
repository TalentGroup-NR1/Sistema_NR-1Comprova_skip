import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeReportPayload } from "@/components/cuidar-mais/relatorio/normalizeReportData";
import type { EmployeeReportData } from "@/components/cuidar-mais/relatorio/types";

export interface UseEmployeeReportDataParams {
  employeeId: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
}

export function useEmployeeReportData({
  employeeId,
  dataInicio,
  dataFim,
}: UseEmployeeReportDataParams) {
  return useQuery<EmployeeReportData | null, Error>({
    queryKey: ["employee-report-data", employeeId, dataInicio, dataFim],
    queryFn: async () => {
      if (!employeeId) return null;

      const { data, error } = await supabase.rpc("get_employee_report_data", {
        p_employee_id: employeeId,
        p_data_inicio: dataInicio ? dataInicio : null,
        p_data_fim: dataFim ? dataFim : null,
      });

      if (error) {
        // NUNCA logar payload ou dados sensíveis (PII)
        throw new Error(error.message || "Erro ao consultar dados probatórios do colaborador");
      }

      return normalizeReportPayload(data);
    },
    enabled: Boolean(employeeId),
    staleTime: 30000,
  });
}
