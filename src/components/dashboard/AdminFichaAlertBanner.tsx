import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck, UserPlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { supabase } from '@/integrations/supabase/client';
import { ColaboradorForm } from '@/components/colaboradores/ColaboradorForm';
import { useCreateColaborador } from '@/hooks/useColaboradores';
import type { ColaboradorFormData } from '@/lib/validators/colaborador';
import { toast } from 'sonner';

export function AdminFichaAlertBanner() {
  const { user, isAdminEmpresa, refreshUserData, profile } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();
  const [openForm, setOpenForm] = useState(false);
  const createColaborador = useCreateColaborador();

  // Verifica se o usuário atual (admin_empresa) já possui ficha em colaboradores nesta empresa
  const { data: hasColaborador, isLoading } = useQuery({
    queryKey: ['admin-has-colaborador', user?.id, effectiveCompanyId],
    enabled: !!user?.id && !!effectiveCompanyId && isAdminEmpresa,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id')
        .eq('user_id', user!.id)
        .eq('company_id', effectiveCompanyId!)
        .maybeSingle();

      if (error) {
        console.warn('Erro ao verificar ficha de colaborador do admin:', error.message);
        return true; // Fallback seguro para não incomodar em erro
      }

      return !!data;
    },
  });

  // Não renderiza se não for admin_empresa, se estiver carregando ou se já possui ficha
  if (!isAdminEmpresa || isLoading || hasColaborador) {
    return null;
  }

  const adminName = profile?.full_name || (user?.user_metadata?.full_name as string) || '';
  const adminEmail = profile?.email || user?.email || '';

  const handleSubmit = async (formData: ColaboradorFormData) => {
    try {
      await createColaborador.mutateAsync(formData);
      toast.success('Ficha funcional vinculada com sucesso! Seu perfil de Colaborador foi ativado.');

      // Invalida status local
      queryClient.invalidateQueries({ queryKey: ['admin-has-colaborador', user?.id, effectiveCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      queryClient.invalidateQueries({ queryKey: ['my-colaborador'] });

      // Atualiza o estado global de autenticação reativamente (habilita o seletor Flash imediatamente)
      await refreshUserData();

      setOpenForm(false);
    } catch (err: any) {
      console.error('Falha ao cadastrar ficha de colaborador:', err);
      toast.error(err?.message || 'Falha ao cadastrar ficha funcional.');
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0 mt-0.5">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              Ative seu perfil pessoal de Colaborador
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-2xl">
              Você ainda não possui ficha funcional nesta empresa. Complete seus dados para acessar Minhas Férias, Minhas Tarefas e Diário de Bordo no seu perfil pessoal com o alternador de perfil.
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={() => setOpenForm(true)} 
          className="shrink-0 gap-1.5 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Completar minha ficha
        </Button>
      </div>

      {openForm && (
        <ColaboradorForm
          open={openForm}
          onOpenChange={setOpenForm}
          onSubmit={handleSubmit}
          isSubmitting={createColaborador.isPending}
          initialData={{
            full_name: adminName,
            email_pessoal: adminEmail,
            corporate_email: adminEmail,
          }}
        />
      )}
    </>
  );
}
