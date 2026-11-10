import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { getMonth, differenceInYears, differenceInDays, addYears, parseISO, getDate } from "date-fns";
import type { WorkAnniversary } from "./useDashboardMetrics";

interface Colaborador {
  id: string;
  full_name: string;
  birth_date: string;
  admission_date: string;
  department: string;
  job_title: string;
  status: string;
  avatar_url?: string;
}

interface ColaboradorDashboardMetrics {
  aniversariantes: Colaborador[];
  aniversariosEmpresa: WorkAnniversary[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for collaborator dashboard - fetches only birthdays and work anniversaries
 * (no sensitive HR metrics like turnover, hires, terminations)
 */
export function useColaboradorDashboardMetrics(): ColaboradorDashboardMetrics {
  const effectiveCompanyId = useEffectiveCompanyId();
  
  const currentDate = new Date();
  const currentMonth = getMonth(currentDate) + 1; // 1-12

  const canQuery = !!effectiveCompanyId;

  // Query para aniversariantes do mês
  const { data: aniversariantes = [], isLoading: loadingAniversariantes } = useQuery({
    queryKey: ['colab-dashboard-aniversariantes', effectiveCompanyId, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, birth_date, admission_date, department, job_title, status, avatar_url')
        .eq('status', 'ATIVO')
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      
      // Filter by birth month in frontend (Supabase doesn't support EXTRACT directly)
      return (data || []).filter(colab => {
        if (!colab.birth_date) return false;
        const birthMonth = new Date(colab.birth_date).getMonth() + 1;
        return birthMonth === currentMonth;
      }).sort((a, b) => {
        const dayA = new Date(a.birth_date).getDate();
        const dayB = new Date(b.birth_date).getDate();
        return dayA - dayB;
      }) as Colaborador[];
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Query para aniversários de empresa
  const { data: aniversariosEmpresa = [], isLoading: loadingAnivEmpresa } = useQuery({
    queryKey: ['colab-dashboard-aniv-empresa', effectiveCompanyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, birth_date, admission_date, department, job_title, status, avatar_url')
        .eq('status', 'ATIVO')
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const result: WorkAnniversary[] = [];
      (data || []).forEach(colab => {
        if (!colab.admission_date) return;
        const admissionDate = parseISO(colab.admission_date);
        const anos = differenceInYears(today, admissionDate);
        
        if (anos >= 1) {
          // Calculate next anniversary date
          let nextAnniversary = addYears(admissionDate, anos);
          if (nextAnniversary < today) {
            nextAnniversary = addYears(admissionDate, anos + 1);
          }
          
          const daysUntil = differenceInDays(nextAnniversary, today);
          const isToday = daysUntil === 0;
          
          // Show only next 60 days
          if (daysUntil >= 0 && daysUntil <= 60) {
            result.push({ 
              colaborador: colab as Colaborador, 
              anos: isToday ? anos : anos + 1,
              daysUntil,
              isToday,
            });
          }
        }
      });
      
      return result.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 10);
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = loadingAniversariantes || loadingAnivEmpresa;

  return {
    aniversariantes,
    aniversariosEmpresa,
    isLoading,
    error: null,
  };
}
