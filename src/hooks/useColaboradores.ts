import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { useAuth } from '@/hooks/useAuth';
import { useGestorFilter } from '@/hooks/useGestorFilter';
import { toast } from 'sonner';
import { parseDateBR, parseCurrency, formatDateToISO } from '@/lib/validators/colaborador';
import type { ColaboradorFormData, DependenteFormData } from '@/lib/validators/colaborador';

function dateBRtoISO(value?: string | null): string | null {
  if (!value) return null;
  const d = parseDateBR(value);
  return d ? formatDateToISO(d) : null;
}

export interface Colaborador {
  id: string;
  company_id: string;
  matricula: string | null;
  full_name: string;
  social_name: string | null;
  birth_date: string;
  naturalidade: string | null;
  nacionalidade: string | null;
  marital_status: string | null;
  sex: string | null;
  ethnicity: string | null;
  education_level: string | null;
  avatar_url: string | null;
  cpf: string;
  cnpj: string | null;
  contract_type: string;
  cargo_id: string | null;
  job_title: string;
  job_level: string | null;
  department: string;
  manager_name: string | null;
  gestor_id: string | null;
  gestor_nome: string | null;
  base_salary: number;
  payment_method: string;
  work_shift_type: string | null;
  admission_date: string;
  termination_date: string | null;
  work_schedule: string | null;
  work_schedule_id: string | null;
  corporate_email: string;
  email_pessoal: string | null;
  phone: string | null;
  telefone_secundario: string | null;
  address_zip_code: string | null;
  address_country: string | null;
  address_state: string | null;
  address_city: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  gestao_tecnica: string | null;
  empresa_cliente: string | null;
  is_banco_horas: boolean;
  jornada_diaria_minutos: number | null;
  is_substituicao: boolean;
  substituicao_colaborador_id: string | null;
  substituicao_colaborador_nome: string | null;
  cursos_realizados: string | null;
  alinhamento_notas: string | null;
  curriculo_path: string | null;
  humanguide_notas: string | null;
  humanguide_path: string | null;
  ultima_ferias_inicio: string | null;
  ultima_ferias_fim: string | null;
  data_corte_ferias: string | null;
  dependentes?: Dependente[];
}

export interface Dependente {
  id: string;
  colaborador_id: string;
  name: string;
  birth_date: string;
  relationship: string;
  created_at: string;
}

export function useNextMatricula() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return useQuery({
    queryKey: ['next-matricula', effectiveCompanyId],
    queryFn: async () => {
      if (!effectiveCompanyId) return '';

      const { data, error } = await supabase
        .from('colaboradores')
        .select('matricula')
        .eq('company_id', effectiveCompanyId)
        .not('matricula', 'is', null)
        .not('matricula', 'eq', '');

      if (error) {
        console.error('Error fetching matriculas:', error);
        return '';
      }

      const matriculas = (data || [])
        .map((c: any) => c.matricula as string)
        .filter(Boolean);

      if (matriculas.length === 0) return '0001';

      // Extract numeric parts and find the max
      let maxNum = 0;
      let padLength = 4;
      for (const mat of matriculas) {
        const digits = mat.replace(/\D/g, '');
        if (digits) {
          const num = parseInt(digits, 10);
          if (num > maxNum) {
            maxNum = num;
            padLength = Math.max(padLength, digits.length);
          }
        }
      }

      return String(maxNum + 1).padStart(padLength, '0');
    },
    enabled: !!effectiveCompanyId,
  });
}

export function useColaboradores() {
  const effectiveCompanyId = useEffectiveCompanyId();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { gestorColaboradorId, shouldFilterByGestor, isLoadingGestor } = useGestorFilter();

  return useQuery({
    queryKey: ['colaboradores', effectiveCompanyId, gestorColaboradorId],
    enabled: isAuthenticated && !authLoading && !isLoadingGestor,
    retry: (failureCount, error: any) => {
      const msg = String(error?.message ?? '');
      if (msg.includes('rate_limit_exceeded')) return false;
      return failureCount < 2;
    },
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_colaboradores_seguro', {
        p_company_id: effectiveCompanyId ?? null,
        p_gestor_id: shouldFilterByGestor ? gestorColaboradorId : null,
      });

      if (error) {
        const msg = String(error.message ?? '');
        if (msg.includes('rate_limit_exceeded')) {
          toast.error('Muitas requisições. Por segurança, tente novamente em alguns instantes.');
        } else {
          console.error('Error fetching colaboradores:', error);
        }
        throw error;
      }

      const rows = (data ?? []) as any[];

      const colaboradoresMap = new Map<string, string>();
      rows.forEach((colab) => {
        colaboradoresMap.set(colab.id, colab.full_name);
      });

      return rows.map((colab) => ({
        ...colab,
        gestor_nome: colab.gestor_id ? colaboradoresMap.get(colab.gestor_id) || null : null,
        substituicao_colaborador_nome: colab.substituicao_colaborador_id
          ? colaboradoresMap.get(colab.substituicao_colaborador_id) || null
          : null,
      })) as Colaborador[];
    },
  });
}

export function useColaborador(id: string | null) {
  return useQuery({
    queryKey: ['colaborador', id],
    queryFn: async () => {
      if (!id) return null;

      const { data: colaborador, error: colaboradorError } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('id', id)
        .single();

      if (colaboradorError) {
        console.error('Error fetching colaborador:', colaboradorError);
        throw colaboradorError;
      }

      const { data: dependentes, error: dependentesError } = await supabase
        .from('dependentes')
        .select('*')
        .eq('colaborador_id', id);

      if (dependentesError) {
        console.error('Error fetching dependentes:', dependentesError);
      }

      // Fetch gestor name if gestor_id exists
      let gestorNome = null;
      if (colaborador.gestor_id) {
        const { data: gestor } = await supabase
          .from('colaboradores')
          .select('full_name')
          .eq('id', colaborador.gestor_id)
          .single();
        gestorNome = gestor?.full_name || null;
      }

      return {
        ...colaborador,
        gestor_nome: gestorNome,
        substituicao_colaborador_nome: null,
        dependentes: dependentes || [],
      } as Colaborador;
    },
    enabled: !!id,
  });
}

export function useCreateColaborador() {
  const queryClient = useQueryClient();
  const effectiveCompanyId = useEffectiveCompanyId();
  const { companyId } = useAuth();

  return useMutation({
    mutationFn: async (data: ColaboradorFormData & { dependentes?: DependenteFormData[] }) => {
      // Use the effective company ID for admin master, or user's company for others
      const targetCompanyId = effectiveCompanyId || companyId;
      
      if (!targetCompanyId) {
        throw new Error('Selecione uma empresa para cadastrar o colaborador');
      }

      const { dependentes, ...colaboradorData } = data;

      // Parse dates and salary
      const birthDate = parseDateBR(colaboradorData.birth_date);
      const admissionDate = parseDateBR(colaboradorData.admission_date);
      const baseSalary = parseCurrency(colaboradorData.base_salary);

      if (!birthDate || !admissionDate) {
        throw new Error('Datas inválidas');
      }

      const { data: newColaborador, error: colaboradorError } = await supabase
        .from('colaboradores')
        .insert({
          company_id: targetCompanyId,
          matricula: colaboradorData.matricula || null,
          full_name: colaboradorData.full_name,
          social_name: colaboradorData.social_name || null,
          birth_date: formatDateToISO(birthDate),
          naturalidade: colaboradorData.naturalidade || null,
          nacionalidade: colaboradorData.nacionalidade || 'Brasileira',
          marital_status: colaboradorData.marital_status || null,
          sex: colaboradorData.sex || null,
          ethnicity: colaboradorData.ethnicity || null,
          education_level: colaboradorData.education_level || null,
          avatar_url: colaboradorData.avatar_url || null,
          cpf: colaboradorData.cpf,
          cnpj: colaboradorData.cnpj || null,
          razao_social: colaboradorData.razao_social || null,
          data_pagamento: colaboradorData.data_pagamento || null,
          rg: (colaboradorData as any).rg || null,
          pis: (colaboradorData as any).pis || null,
          ctps_numero: (colaboradorData as any).ctps_numero || null,
          ctps_serie: (colaboradorData as any).ctps_serie || null,
          contract_type: colaboradorData.contract_type,
          cargo_id: (colaboradorData as any).cargo_id || null,
          job_title: colaboradorData.job_title,
          job_level: colaboradorData.job_level || null,
          department: colaboradorData.department,
          manager_name: colaboradorData.manager_name || null,
          gestor_id: colaboradorData.gestor_id || null,
          gestao_tecnica: colaboradorData.gestao_tecnica || null,
          empresa_cliente: colaboradorData.empresa_cliente || null,
          is_banco_horas: colaboradorData.is_banco_horas || false,
          jornada_diaria_minutos: null,
          banco_horas_perfil_id: (colaboradorData as any).banco_horas_perfil_id || null,
          is_substituicao: colaboradorData.is_substituicao || false,
          substituicao_colaborador_id: colaboradorData.is_substituicao ? (colaboradorData.substituicao_colaborador_id || null) : null,
          base_salary: baseSalary,
          payment_method: colaboradorData.payment_method,
          work_shift_type: colaboradorData.work_shift_type || null,
          admission_date: formatDateToISO(admissionDate),
          work_schedule: colaboradorData.work_schedule || null,
          work_schedule_id: colaboradorData.work_schedule_id || null,
          corporate_email: colaboradorData.corporate_email || null,
          email_pessoal: colaboradorData.email_pessoal,
          phone: colaboradorData.phone || null,
          telefone_secundario: colaboradorData.telefone_secundario || null,
          address_zip_code: colaboradorData.address_zip_code || null,
          address_country: colaboradorData.address_country || 'Brasil',
          address_state: colaboradorData.address_state || null,
          address_city: colaboradorData.address_city || null,
          address_street: colaboradorData.address_street || null,
          address_number: colaboradorData.address_number || null,
          address_complement: colaboradorData.address_complement || null,
          address_neighborhood: colaboradorData.address_neighborhood || null,
          status: colaboradorData.status || 'ATIVO',
          cursos_realizados: colaboradorData.cursos_realizados || null,
          alinhamento_notas: (colaboradorData as any).alinhamento_notas || null,
          curriculo_path: (colaboradorData as any).curriculo_path || null,
          humanguide_notas: (colaboradorData as any).humanguide_notas || null,
          humanguide_path: (colaboradorData as any).humanguide_path || null,
          ultima_ferias_inicio: dateBRtoISO(colaboradorData.ultima_ferias_inicio),
          ultima_ferias_fim: dateBRtoISO(colaboradorData.ultima_ferias_fim),
          data_corte_ferias: dateBRtoISO(colaboradorData.data_corte_ferias),
        })
        .select()
        .single();

      if (colaboradorError) {
        console.error('Error creating colaborador:', colaboradorError);
        throw colaboradorError;
      }

      // Insert dependentes if any
      if (dependentes && dependentes.length > 0) {
        const dependentesData = dependentes.map((dep) => {
          const depBirthDate = parseDateBR(dep.birth_date);
          return {
            colaborador_id: newColaborador.id,
            name: dep.name,
            birth_date: depBirthDate ? formatDateToISO(depBirthDate) : null,
            relationship: dep.relationship,
          };
        });

        const { error: dependentesError } = await supabase
          .from('dependentes')
          .insert(dependentesData);

        if (dependentesError) {
          console.error('Error creating dependentes:', dependentesError);
        }
      }

      return newColaborador;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Colaborador cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error creating colaborador:', error);
      if (error.message.includes('colaboradores_cpf_company_unique')) {
        toast.error('CPF já cadastrado nesta empresa');
      } else if (error.message.includes('colaboradores_email_company_unique')) {
        toast.error('E-mail corporativo já cadastrado nesta empresa');
      } else if (error.message.includes('colaboradores_matricula_company_unique')) {
        toast.error('Matrícula já cadastrada nesta empresa');
      } else {
        toast.error('Erro ao cadastrar colaborador: ' + error.message);
      }
    },
  });
}

export function useUpdateColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ColaboradorFormData & { dependentes?: DependenteFormData[] } }) => {
      const { dependentes, ...colaboradorData } = data;

      // Parse dates and salary
      const birthDate = parseDateBR(colaboradorData.birth_date);
      const admissionDate = parseDateBR(colaboradorData.admission_date);
      const baseSalary = parseCurrency(colaboradorData.base_salary);

      if (!birthDate || !admissionDate) {
        throw new Error('Datas inválidas');
      }

      const { data: updatedColaborador, error: colaboradorError } = await supabase
        .from('colaboradores')
        .update({
          matricula: colaboradorData.matricula || null,
          full_name: colaboradorData.full_name,
          social_name: colaboradorData.social_name || null,
          birth_date: formatDateToISO(birthDate),
          naturalidade: colaboradorData.naturalidade || null,
          nacionalidade: colaboradorData.nacionalidade || 'Brasileira',
          marital_status: colaboradorData.marital_status || null,
          sex: colaboradorData.sex || null,
          ethnicity: colaboradorData.ethnicity || null,
          education_level: colaboradorData.education_level || null,
          avatar_url: colaboradorData.avatar_url || null,
          cpf: colaboradorData.cpf,
          cnpj: colaboradorData.cnpj || null,
          razao_social: colaboradorData.razao_social || null,
          data_pagamento: colaboradorData.data_pagamento || null,
          rg: (colaboradorData as any).rg || null,
          pis: (colaboradorData as any).pis || null,
          ctps_numero: (colaboradorData as any).ctps_numero || null,
          ctps_serie: (colaboradorData as any).ctps_serie || null,
          contract_type: colaboradorData.contract_type,
          cargo_id: (colaboradorData as any).cargo_id || null,
          job_title: colaboradorData.job_title,
          job_level: colaboradorData.job_level || null,
          department: colaboradorData.department,
          manager_name: colaboradorData.manager_name || null,
          gestor_id: colaboradorData.gestor_id || null,
          gestao_tecnica: colaboradorData.gestao_tecnica || null,
          empresa_cliente: colaboradorData.empresa_cliente || null,
          is_banco_horas: colaboradorData.is_banco_horas || false,
          jornada_diaria_minutos: null,
          banco_horas_perfil_id: (colaboradorData as any).banco_horas_perfil_id || null,
          is_substituicao: colaboradorData.is_substituicao || false,
          substituicao_colaborador_id: colaboradorData.is_substituicao ? (colaboradorData.substituicao_colaborador_id || null) : null,
          base_salary: baseSalary,
          payment_method: colaboradorData.payment_method,
          work_shift_type: colaboradorData.work_shift_type || null,
          admission_date: formatDateToISO(admissionDate),
          
          work_schedule: colaboradorData.work_schedule || null,
          work_schedule_id: colaboradorData.work_schedule_id || null,
          corporate_email: colaboradorData.corporate_email || null,
          email_pessoal: colaboradorData.email_pessoal,
          phone: colaboradorData.phone || null,
          telefone_secundario: colaboradorData.telefone_secundario || null,
          address_zip_code: colaboradorData.address_zip_code || null,
          address_country: colaboradorData.address_country || 'Brasil',
          address_state: colaboradorData.address_state || null,
          address_city: colaboradorData.address_city || null,
          address_street: colaboradorData.address_street || null,
          address_number: colaboradorData.address_number || null,
          address_complement: colaboradorData.address_complement || null,
          address_neighborhood: colaboradorData.address_neighborhood || null,
          status: colaboradorData.status || 'ATIVO',
          cursos_realizados: colaboradorData.cursos_realizados || null,
          alinhamento_notas: (colaboradorData as any).alinhamento_notas || null,
          curriculo_path: (colaboradorData as any).curriculo_path || null,
          humanguide_notas: (colaboradorData as any).humanguide_notas || null,
          humanguide_path: (colaboradorData as any).humanguide_path || null,
          ultima_ferias_inicio: dateBRtoISO(colaboradorData.ultima_ferias_inicio),
          ultima_ferias_fim: dateBRtoISO(colaboradorData.ultima_ferias_fim),
          data_corte_ferias: dateBRtoISO(colaboradorData.data_corte_ferias),
        })
        .eq('id', id)
        .select()
        .single();

      if (colaboradorError) {
        console.error('Error updating colaborador:', colaboradorError);
        throw colaboradorError;
      }

      // Delete existing dependentes and re-insert
      await supabase.from('dependentes').delete().eq('colaborador_id', id);

      if (dependentes && dependentes.length > 0) {
        const dependentesData = dependentes.map((dep) => {
          const depBirthDate = parseDateBR(dep.birth_date);
          return {
            colaborador_id: id,
            name: dep.name,
            birth_date: depBirthDate ? formatDateToISO(depBirthDate) : null,
            relationship: dep.relationship,
          };
        });

        const { error: dependentesError } = await supabase
          .from('dependentes')
          .insert(dependentesData);

        if (dependentesError) {
          console.error('Error updating dependentes:', dependentesError);
        }
      }

      return updatedColaborador;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      queryClient.invalidateQueries({ queryKey: ['colaborador', id] });
      toast.success('Colaborador atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error updating colaborador:', error);
      if (error.message.includes('colaboradores_cpf_company_unique')) {
        toast.error('CPF já cadastrado nesta empresa');
      } else if (error.message.includes('colaboradores_email_company_unique')) {
        toast.error('E-mail corporativo já cadastrado nesta empresa');
      } else if (error.message.includes('colaboradores_matricula_company_unique')) {
        toast.error('Matrícula já cadastrada nesta empresa');
      } else {
        toast.error('Erro ao atualizar colaborador: ' + error.message);
      }
    },
  });
}

export function useDeleteColaborador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaboradores')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting colaborador:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Colaborador excluído com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error deleting colaborador:', error);
      toast.error('Erro ao excluir colaborador: ' + error.message);
    },
  });
}

export function useUpdateColaboradorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ATIVO' | 'FERIAS' | 'DESLIGADO' | 'LICENCA' }) => {
      const { data, error } = await supabase
        .from('colaboradores')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating colaborador status:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });
}
