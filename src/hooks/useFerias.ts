import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useGestorFilter } from "./useGestorFilter";
import { toast } from "@/hooks/use-toast";
import { addYears, addMonths, differenceInDays, parseISO, isBefore, isAfter, startOfDay } from "date-fns";
import { formatDateToISO } from "@/lib/validators/colaborador";
import {
  calcularPeriodoAquisitivoAtual,
  calcularPeriodosAquisitivos as engineCalcularPeriodos,
  isFeriasVencidas,
  type FeriasInputs,
} from "@/lib/feriasEngine";

export interface PeriodoAquisitivo {
  id: string;
  colaborador_id: string;
  company_id: string;
  data_inicio_aquisitivo: string;
  data_fim_aquisitivo: string;
  data_limite_gozo: string;
  dias_adquiridos: number;
  status: 'aberto' | 'fechado' | 'vencido';
  created_at: string;
  updated_at: string;
}

export interface FeriasGozo {
  id: string;
  periodo_aquisitivo_id: string;
  colaborador_id: string;
  company_id: string;
  data_inicio_gozo: string;
  data_fim_gozo: string;
  dias_gozados: number;
  abono_pecuniario_dias?: number;
  data_pagamento: string;
  status: 'planejado' | 'aprovado' | 'gozado' | 'cancelado';
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ColaboradorComFerias {
  id: string;
  full_name: string;
  job_title: string;
  department: string;
  empresa_cliente?: string | null;
  admission_date: string;
  status: string;
  ultima_ferias_inicio?: string | null;
  ultima_ferias_fim?: string | null;
  data_corte_ferias?: string | null;
  periodos_aquisitivos: PeriodoAquisitivo[];
  ferias_gozo: FeriasGozo[];
}

// Calculate acquisition periods, considering optional legacy fields.
// Backward-compatible signature: accepts string (admission only) or full FeriasInputs.
export function calcularPeriodosAquisitivos(
  input: string | FeriasInputs
): { inicio: Date; fim: Date; limite: Date; numero: number }[] {
  const inputs: FeriasInputs = typeof input === "string" ? { admission_date: input } : input;
  const calculados = engineCalcularPeriodos(inputs);
  return calculados.map((p, idx) => ({
    inicio: p.inicio,
    fim: p.fim,
    limite: p.limite,
    numero: idx + 1,
  }));
}

// Get vacation status for a collaborator.
// Backward-compatible: aceita só `admissionDate` ou um objeto com os campos legados.
export function getStatusFerias(
  admissionDateOrInputs: string | FeriasInputs,
  periodosDB: PeriodoAquisitivo[],
  gozosDB: FeriasGozo[]
) {
  const inputs: FeriasInputs =
    typeof admissionDateOrInputs === "string"
      ? { admission_date: admissionDateOrInputs }
      : admissionDateOrInputs;

  const today = new Date();
  const periodoAtual = calcularPeriodoAquisitivoAtual(inputs, today);

  const diasGozados = gozosDB
    .filter(g => g.status !== 'cancelado')
    .reduce((sum, g) => sum + g.dias_gozados + (g.abono_pecuniario_dias || 0), 0);

  // Vencidas só se passou do limite (fim + 12 meses)
  if (isAfter(today, periodoAtual.limite)) {
    return { status: 'vencido', label: 'Férias Vencidas', color: 'destructive' as const };
  }

  if (diasGozados >= 30) {
    return { status: 'gozado', label: 'Férias Gozadas', color: 'secondary' as const };
  }

  if (periodoAtual.fim <= today) {
    return { status: 'adquirido', label: 'Direito Adquirido', color: 'default' as const };
  }

  return { status: 'aquisitivo', label: 'Em Aquisição', color: 'outline' as const };
}


// Hook to fetch collaborators with vacation data
export function useColaboradoresComFerias() {
  const { isAdminMaster, companyId } = useAuth();
  const { selectedCompanyId } = useCompanyContext();
  const effectiveCompanyId = isAdminMaster ? selectedCompanyId : companyId;
  const { gestorColaboradorId, shouldFilterByGestor } = useGestorFilter();
  
  return useQuery({
    queryKey: ['colaboradores-ferias', effectiveCompanyId, gestorColaboradorId],
    queryFn: async () => {
      // Garante que todos os colaboradores elegíveis possuam períodos aquisitivos
      // (inclusive o em curso), para aparecerem corretamente no Saldo em Aberto.
      try {
        await supabase.rpc('ensure_periodos_aquisitivos_company' as any, {
          p_company_id: effectiveCompanyId ?? null,
        });
      } catch (e) {
        console.warn('ensure_periodos_aquisitivos_company falhou:', e);
      }

      let query = supabase
        .from('colaboradores')
        .select('id, full_name, job_title, department, empresa_cliente, admission_date, status, company_id, contract_type, ultima_ferias_inicio, ultima_ferias_fim, data_corte_ferias')
        .eq('status', 'ATIVO')
        // Trava de elegibilidade: apenas vínculos com direito legal a férias
        .in('contract_type', ['CLT', 'Aprendiz', 'Estágio'])
        .order('full_name');
      
      if (effectiveCompanyId) {
        query = query.eq('company_id', effectiveCompanyId);
      }

      // Gestor departamento: only see their direct reports
      if (shouldFilterByGestor && gestorColaboradorId) {
        query = query.eq('gestor_id', gestorColaboradorId);
      }
      
      const { data: colaboradores, error } = await query;
      
      if (error) throw error;
      
      // Fetch vacation data for all collaborators
      const colaboradorIds = colaboradores?.map(c => c.id) || [];
      
      const [periodosRes, gozosRes] = await Promise.all([
        supabase
          .from('ferias_periodos_aquisitivos')
          .select('*')
          .in('colaborador_id', colaboradorIds),
        supabase
          .from('ferias_gozo')
          .select('*')
          .in('colaborador_id', colaboradorIds)
      ]);
      
      if (periodosRes.error) throw periodosRes.error;
      if (gozosRes.error) throw gozosRes.error;
      
      return colaboradores?.map(c => ({
        ...c,
        periodos_aquisitivos: periodosRes.data?.filter(p => p.colaborador_id === c.id) || [],
        ferias_gozo: gozosRes.data?.filter(g => g.colaborador_id === c.id) || []
      })) || [];
    },
    enabled: isAdminMaster || !!effectiveCompanyId
  });
}

// Hook to fetch vacation data for a specific collaborator
export function useFeriasColaborador(colaboradorId: string | null) {
  return useQuery({
    queryKey: ['ferias-colaborador', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return null;
      
      const [colaboradorRes, periodosRes, gozosRes] = await Promise.all([
        supabase
          .from('colaboradores')
          .select('id, full_name, job_title, department, admission_date, manager_name, company_id, contract_type, ultima_ferias_inicio, ultima_ferias_fim, data_corte_ferias')
          .eq('id', colaboradorId)
          .single(),
        supabase
          .from('ferias_periodos_aquisitivos')
          .select('*')
          .eq('colaborador_id', colaboradorId)
          .order('data_inicio_aquisitivo', { ascending: true }),
        supabase
          .from('ferias_gozo')
          .select('*')
          .eq('colaborador_id', colaboradorId)
          .order('data_inicio_gozo', { ascending: false })
      ]);
      
      if (colaboradorRes.error) throw colaboradorRes.error;
      if (periodosRes.error) throw periodosRes.error;
      if (gozosRes.error) throw gozosRes.error;
      
      return {
        colaborador: colaboradorRes.data,
        periodos: periodosRes.data || [],
        gozos: gozosRes.data || []
      };
    },
    enabled: !!colaboradorId
  });
}

// Hook to sync/create acquisition periods for a collaborator
export function useSyncPeriodosAquisitivos() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      colaboradorId,
      companyId,
      admissionDate,
      ultimaFeriasInicio,
      ultimaFeriasFim,
      dataCorteFerias,
    }: {
      colaboradorId: string;
      companyId: string;
      admissionDate: string;
      ultimaFeriasInicio?: string | null;
      ultimaFeriasFim?: string | null;
      dataCorteFerias?: string | null;
    }) => {
      // Fetch existing periods from DB
      const { data: existingPeriodos, error: fetchError } = await supabase
        .from("ferias_periodos_aquisitivos")
        .select("*")
        .eq("colaborador_id", colaboradorId)
        .order("data_inicio_aquisitivo", { ascending: true });

      if (fetchError) throw fetchError;

      // Calculate periods that should exist (respeita histórico legado)
      const periodoAtual = calcularPeriodoAquisitivoAtual({
        admission_date: admissionDate,
        ultima_ferias_inicio: ultimaFeriasInicio,
        ultima_ferias_fim: ultimaFeriasFim,
        data_corte_ferias: dataCorteFerias,
      });
      const periodosCalculados = calcularPeriodosAquisitivos({
        admission_date: admissionDate,
        ultima_ferias_inicio: ultimaFeriasInicio,
        ultima_ferias_fim: ultimaFeriasFim,
        data_corte_ferias: dataCorteFerias,
      });
      const today = startOfDay(new Date());

      // Quando há histórico legado (ultima_ferias ou data_corte), remover períodos
      // obsoletos no DB que iniciam ANTES da base calculada e que não possuem
      // nenhum gozo vinculado (não destrói histórico real).
      if (periodoAtual.origem !== "admissao" && existingPeriodos && existingPeriodos.length > 0) {
        const baseISO = formatDateToISO(periodoAtual.inicio);
        const obsoletos = existingPeriodos.filter(
          (p) => p.data_inicio_aquisitivo < baseISO
        );
        if (obsoletos.length > 0) {
          const ids = obsoletos.map((o) => o.id);
          // Verificar gozos vinculados
          const { data: gozosVinc } = await supabase
            .from("ferias_gozo")
            .select("periodo_aquisitivo_id")
            .in("periodo_aquisitivo_id", ids);
          const idsComGozo = new Set((gozosVinc || []).map((g) => g.periodo_aquisitivo_id));
          const idsParaDeletar = ids.filter((id) => !idsComGozo.has(id));
          if (idsParaDeletar.length > 0) {
            await supabase
              .from("ferias_periodos_aquisitivos")
              .delete()
              .in("id", idsParaDeletar);
          }
        }
      }

      // Recarregar lista após eventual limpeza
      const { data: refreshed } = await supabase
        .from("ferias_periodos_aquisitivos")
        .select("*")
        .eq("colaborador_id", colaboradorId)
        .order("data_inicio_aquisitivo", { ascending: true });
      const baseList = refreshed || existingPeriodos || [];

      // Find periods that need to be created (including the in-progress one, so
      // the collaborator always has a current acquisition period in DB).
      const periodosParaCriar = periodosCalculados
        .filter((calc) => {
          // Check if already exists in DB
          const jaExiste = baseList.some(
            (existing) => existing.data_inicio_aquisitivo === formatDateToISO(calc.inicio)
          );
          return !jaExiste;
        })

        .map((calc) => {
          // Determine status
          let status: 'aberto' | 'fechado' | 'vencido' = 'aberto';
          if (isAfter(today, calc.limite)) {
            status = 'vencido';
          }
          
          return {
            colaborador_id: colaboradorId,
            company_id: companyId,
            data_inicio_aquisitivo: formatDateToISO(calc.inicio),
            data_fim_aquisitivo: formatDateToISO(calc.fim),
            data_limite_gozo: formatDateToISO(calc.limite),
            dias_adquiridos: 30,
            status,
          };
        });

      if (periodosParaCriar.length > 0) {
        const { data, error } = await supabase
          .from("ferias_periodos_aquisitivos")
          .insert(periodosParaCriar)
          .select();

        if (error) throw error;
        
        // Return merged list
        return [...baseList, ...(data || [])];
      }

      return baseList;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ferias-colaborador"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores-ferias"] });
    },
    onError: (error: Error) => {
      console.error("Erro ao sincronizar períodos aquisitivos:", error);
      toast({ 
        title: "Erro ao sincronizar períodos aquisitivos", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });
}

// Create acquisition period
export function useCreatePeriodoAquisitivo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<PeriodoAquisitivo, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('ferias_periodos_aquisitivos')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      toast({ title: "Período aquisitivo criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar período aquisitivo", description: error.message, variant: "destructive" });
    }
  });
}

// Create vacation period (gozo)
export function useCreateFeriasGozo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<FeriasGozo, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('ferias_gozo')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      toast({ title: "Período de férias lançado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao lançar férias", description: error.message, variant: "destructive" });
    }
  });
}

// Update vacation period status
export function useUpdateFeriasGozo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<FeriasGozo> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('ferias_gozo')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      toast({ title: "Férias atualizadas com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar férias", description: error.message, variant: "destructive" });
    }
  });
}

// Approve vacation request (RPC)
export function useAprovarFeriasGozo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gozoId: string) => {
      const { error } = await supabase.rpc('aprovar_ferias_gozo', { p_gozo_id: gozoId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      queryClient.invalidateQueries({ queryKey: ['ferias-pendentes-aprovacao'] });
      toast({ title: 'Solicitação aprovada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao aprovar', description: error.message, variant: 'destructive' });
    }
  });
}

// Reject vacation request (RPC)
export function useRecusarFeriasGozo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ gozoId, motivo }: { gozoId: string; motivo: string }) => {
      const { error } = await supabase.rpc('recusar_ferias_gozo', { p_gozo_id: gozoId, p_motivo: motivo });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      queryClient.invalidateQueries({ queryKey: ['ferias-pendentes-aprovacao'] });
      toast({ title: 'Solicitação recusada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao recusar', description: error.message, variant: 'destructive' });
    }
  });
}

// Mark as taken
export function useMarcarFeriasGozadas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (gozoId: string) => {
      const { error } = await supabase.rpc('marcar_ferias_gozadas', { p_gozo_id: gozoId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      toast({ title: 'Férias marcadas como gozadas' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  });
}

// Pending approvals list
export function useFeriasPendentesAprovacao() {
  const { isAdminMaster, companyId } = useAuth();
  const { selectedCompanyId } = useCompanyContext();
  const effectiveCompanyId = isAdminMaster ? selectedCompanyId : companyId;
  const { gestorColaboradorId, shouldFilterByGestor } = useGestorFilter();

  return useQuery({
    queryKey: ['ferias-pendentes-aprovacao', effectiveCompanyId, gestorColaboradorId],
    queryFn: async () => {
      let colQuery = supabase
        .from('colaboradores')
        .select('id, full_name, job_title, department, gestor_id, company_id, contract_type')
        .eq('status', 'ATIVO')
        // Trava de elegibilidade: apenas vínculos com direito legal a férias
        .in('contract_type', ['CLT', 'Aprendiz', 'Estágio']);
      if (effectiveCompanyId) colQuery = colQuery.eq('company_id', effectiveCompanyId);
      if (shouldFilterByGestor && gestorColaboradorId) colQuery = colQuery.eq('gestor_id', gestorColaboradorId);
      const { data: colabs, error: ce } = await colQuery;
      if (ce) throw ce;
      const ids = (colabs || []).map(c => c.id);
      if (ids.length === 0) return [];
      const { data: gozos, error } = await supabase
        .from('ferias_gozo')
        .select('*')
        .in('colaborador_id', ids)
        .eq('status', 'planejado')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (gozos || []).map(g => {
        const c = colabs?.find(c => c.id === g.colaborador_id);
        return { ...g, colaborador: c };
      });
    },
    enabled: isAdminMaster || !!effectiveCompanyId
  });
}

// Delete vacation period
export function useDeleteFeriasGozo() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ferias_gozo')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      toast({ title: "Período de férias removido" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover férias", description: error.message, variant: "destructive" });
    }
  });
}

// Delete acquisition period (only if there are no linked gozos)
export function useDeletePeriodoAquisitivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Guard: bloquear exclusão se houver gozos vinculados
      const { data: gozos, error: errGozos } = await supabase
        .from('ferias_gozo')
        .select('id')
        .eq('periodo_aquisitivo_id', id)
        .limit(1);
      if (errGozos) throw errGozos;
      if (gozos && gozos.length > 0) {
        throw new Error('Existem lançamentos de férias vinculados a este período. Exclua-os antes.');
      }

      const { error } = await supabase
        .from('ferias_periodos_aquisitivos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      toast({ title: 'Período aquisitivo removido' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover período', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRecalcularVinculacaoGozos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (colaboradorId: string) => {
      const { data, error } = await supabase.rpc('recalcular_vinculacao_gozos', {
        p_colaborador_id: colaboradorId,
      });
      if (error) throw error;
      const atualizados = (data || []).filter((r: any) => r.atualizado).length;
      return { total: data?.length || 0, atualizados };
    },
    onSuccess: ({ atualizados, total }) => {
      queryClient.invalidateQueries({ queryKey: ['ferias-colaborador'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores-ferias'] });
      toast({
        title: 'Vínculos recalculados',
        description: atualizados > 0
          ? `${atualizados} de ${total} lançamentos foram corrigidos.`
          : `Nenhuma correção necessária (${total} lançamentos verificados).`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao recalcular', description: error.message, variant: 'destructive' });
    },
  });
}

