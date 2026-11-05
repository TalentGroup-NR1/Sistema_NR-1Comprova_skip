import { useQuery } from "@tanstack/react-query";
import { calcTurnoverRate } from "@/lib/calcTurnover";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "./useEffectiveCompanyId";
import { useAuth } from "./useAuth";
import { startOfMonth, endOfMonth, format, differenceInYears, getMonth, getDate, differenceInDays, addYears, parseISO } from "date-fns";

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

export interface WorkAnniversary {
  colaborador: Colaborador;
  anos: number;
  daysUntil: number;
  isToday: boolean;
}

interface FeedbackCycleReminder {
  id: string;
  milestone_type: string;
  due_date: string;
  status: string;
  colaborador?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    department?: string;
  };
}

export interface EmpresaComFuncionarios {
  id: string;
  name: string;
  count: number;
}

interface DashboardMetrics {
  totalAtivos: number;
  contratadosMes: number;
  demitidosMes: number;
  turnoverRate: number;
  ytdContratados: number;
  ytdDemitidos: number;
  ultimaAdmissaoRef: { mes: number; ano: number; total: number } | null;
  ultimaDemissaoRef: { mes: number; ano: number; total: number } | null;
  aniversariantes: Colaborador[];
  aniversariosEmpresa: WorkAnniversary[];
  diarioBordoReminders: FeedbackCycleReminder[];
  recentes: Colaborador[];
  funcionariosPorEmpresa: EmpresaComFuncionarios[];
  funcionariosPorEmpresaCliente: EmpresaComFuncionarios[];
  showCompanyBreakdown: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useDashboardMetrics(): DashboardMetrics {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { role, isAdminMaster } = useAuth();
  
  const currentDate = new Date();
  const currentMonth = getMonth(currentDate) + 1; // 1-12
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  // Habilitar queries SOMENTE com company_id definido.
  // Regra de Ouro: nenhuma query de métricas operacionais roda sem company_id (zero dados de clientes)
  const canQuery = Boolean(effectiveCompanyId);

  // Query para total de ativos
  const { data: totalAtivos = 0, isLoading: loadingAtivos } = useQuery({
    queryKey: ['dashboard-ativos', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return 0;
      const { count, error } = await supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'ATIVO')
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Query para contratados do mês
  const { data: contratadosMes = 0, isLoading: loadingContratados } = useQuery({
    queryKey: ['dashboard-contratados', effectiveCompanyId, monthStart, monthEnd],
    queryFn: async () => {
      if (!effectiveCompanyId) return 0;
      const { count, error } = await supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .gte('admission_date', monthStart)
        .lte('admission_date', monthEnd)
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Query para demitidos do mês
  const { data: demitidosMes = 0, isLoading: loadingDemitidos } = useQuery({
    queryKey: ['dashboard-demitidos', effectiveCompanyId, monthStart, monthEnd],
    queryFn: async () => {
      if (!effectiveCompanyId) return 0;
      const { count, error } = await supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .gte('termination_date', monthStart)
        .lte('termination_date', monthEnd)
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  // YTD: admissões e desligamentos do ano corrente
  const yearStart = format(new Date(currentDate.getFullYear(), 0, 1), 'yyyy-MM-dd');

  const { data: ytdContratados = 0 } = useQuery({
    queryKey: ['dashboard-ytd-contratados', effectiveCompanyId, yearStart],
    queryFn: async () => {
      if (!effectiveCompanyId) return 0;
      const { count, error } = await supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .gte('admission_date', yearStart)
        .eq('company_id', effectiveCompanyId);
      if (error) throw error;
      return count || 0;
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ytdDemitidos = 0 } = useQuery({
    queryKey: ['dashboard-ytd-demitidos', effectiveCompanyId, yearStart],
    queryFn: async () => {
      if (!effectiveCompanyId) return 0;
      const { count, error } = await supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .gte('termination_date', yearStart)
        .eq('company_id', effectiveCompanyId);
      if (error) throw error;
      return count || 0;
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Última admissão e demissão (para mostrar referência quando o mês corrente está zerado)
  const { data: ultimaAdmissaoRef = null } = useQuery({
    queryKey: ['dashboard-ultima-admissao', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      const { data, error } = await supabase
        .from('colaboradores')
        .select('admission_date')
        .not('admission_date', 'is', null)
        .lt('admission_date', monthStart)
        .eq('company_id', effectiveCompanyId)
        .order('admission_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      const first = data?.[0]?.admission_date;
      if (!first) return null;
      const d = parseISO(first);
      const mes = d.getMonth() + 1;
      const ano = d.getFullYear();
      const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
      const mEnd = format(endOfMonth(d), 'yyyy-MM-dd');
      const { count } = await supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .gte('admission_date', mStart)
        .lte('admission_date', mEnd)
        .eq('company_id', effectiveCompanyId);
      return { mes, ano, total: count || 0 };
    },
    enabled: canQuery && contratadosMes === 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ultimaDemissaoRef = null } = useQuery({
    queryKey: ['dashboard-ultima-demissao', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return null;
      const { data, error } = await supabase
        .from('colaboradores')
        .select('termination_date')
        .not('termination_date', 'is', null)
        .lt('termination_date', monthStart)
        .eq('company_id', effectiveCompanyId)
        .order('termination_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      const first = data?.[0]?.termination_date;
      if (!first) return null;
      const d = parseISO(first);
      const mes = d.getMonth() + 1;
      const ano = d.getFullYear();
      const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
      const mEnd = format(endOfMonth(d), 'yyyy-MM-dd');
      const { count } = await supabase
        .from('colaboradores')
        .select('id', { count: 'exact', head: true })
        .gte('termination_date', mStart)
        .lte('termination_date', mEnd)
        .eq('company_id', effectiveCompanyId);
      return { mes, ano, total: count || 0 };
    },
    enabled: canQuery && demitidosMes === 0,
    staleTime: 5 * 60 * 1000,
  });

  const { data: aniversariantes = [], isLoading: loadingAniversariantes } = useQuery({
    queryKey: ['dashboard-aniversariantes', effectiveCompanyId, currentMonth],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, birth_date, admission_date, department, job_title, status, avatar_url')
        .eq('status', 'ATIVO')
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      
      // Filtrar por mês de aniversário no frontend
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

  // Query para aniversários de empresa (próximos, não apenas do mês)
  const { data: aniversariosEmpresa = [], isLoading: loadingAnivEmpresa } = useQuery({
    queryKey: ['dashboard-aniv-empresa', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, birth_date, admission_date, department, job_title, status, avatar_url')
        .eq('status', 'ATIVO')
        .eq('company_id', effectiveCompanyId);
      
      if (error) throw error;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filtrar colaboradores com aniversário de empresa e calcular dias restantes
      const result: WorkAnniversary[] = [];
      (data || []).forEach(colab => {
        if (!colab.admission_date) return;
        const admissionDate = parseISO(colab.admission_date);
        const anos = differenceInYears(today, admissionDate);
        
        if (anos >= 1) {
          let nextAnniversary = addYears(admissionDate, anos);
          if (nextAnniversary < today) {
            nextAnniversary = addYears(admissionDate, anos + 1);
          }
          
          const daysUntil = differenceInDays(nextAnniversary, today);
          const isToday = daysUntil === 0;
          
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

  // Query para lembretes de Diário de Bordo
  const { data: diarioBordoReminders = [], isLoading: loadingDiarioBordo } = useQuery({
    queryKey: ['dashboard-diario-bordo', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in5Days = new Date(today);
      in5Days.setDate(in5Days.getDate() + 5);
      const todayStr = today.toISOString().slice(0, 10);
      const in5DaysStr = in5Days.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('feedback_cycles')
        .select(`
          id,
          milestone_type,
          due_date,
          status,
          colaborador:colaboradores!inner(id, full_name, avatar_url, department, status)
        `)
        .eq('company_id', effectiveCompanyId)
        .neq('status', 'CONCLUIDO')
        .gte('due_date', todayStr)
        .lte('due_date', in5DaysStr)
        .eq('colaboradores.status', 'ATIVO')
        .order('due_date', { ascending: true })
        .limit(20);
      
      if (error) throw error;
      
      return (data || [])
        .filter((cycle: any) => cycle.colaborador?.status === 'ATIVO')
        .map(cycle => ({
          id: cycle.id,
          milestone_type: cycle.milestone_type,
          due_date: cycle.due_date,
          status: cycle.status,
          colaborador: cycle.colaborador as FeedbackCycleReminder['colaborador'],
        })) as FeedbackCycleReminder[];
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Query para colaboradores recentes
  const { data: recentes = [], isLoading: loadingRecentes } = useQuery({
    queryKey: ['dashboard-recentes', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return [];
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, full_name, birth_date, admission_date, department, job_title, status, avatar_url')
        .eq('status', 'ATIVO')
        .eq('company_id', effectiveCompanyId)
        .order('admission_date', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return (data || []) as Colaborador[];
    },
    enabled: canQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Não exibe agregados ou quebra de empresas para admin_master global (zero vazamento de dados de clientes)
  const funcionariosPorEmpresa: EmpresaComFuncionarios[] = [];
  const funcionariosPorEmpresaCliente: EmpresaComFuncionarios[] = [];
  const showCompanyBreakdown = false;

  const turnoverRate = calcTurnoverRate({
    admissoes: contratadosMes,
    desligamentos: demitidosMes,
    totalFuncionarios: totalAtivos,
  });

  const isLoading = canQuery && (
    loadingAtivos || loadingContratados || loadingDemitidos || 
    loadingAniversariantes || loadingAnivEmpresa || loadingRecentes || 
    loadingDiarioBordo
  );

  return {
    totalAtivos,
    contratadosMes,
    demitidosMes,
    turnoverRate,
    ytdContratados,
    ytdDemitidos,
    ultimaAdmissaoRef,
    ultimaDemissaoRef,
    aniversariantes,
    aniversariosEmpresa,
    diarioBordoReminders,
    recentes,
    funcionariosPorEmpresa,
    funcionariosPorEmpresaCliente,
    showCompanyBreakdown,
    isLoading,
    error: null,
  };
}
