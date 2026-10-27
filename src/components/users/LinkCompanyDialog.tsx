import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Loader2, Info } from 'lucide-react';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { useCompanies } from '@/hooks/useCompanies';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { useUserMutations } from '@/hooks/useUserMutations';
import { UserProfile } from '@/hooks/useUsers';
import { supabase } from '@/integrations/supabase/client';

const roleLabels: Record<string, string> = {
  admin_empresa: 'Admin Empresa',
  analista_rh: 'Analista RH',
  gestor_departamento: 'Gestor de Departamento',
  colaborador: 'Colaborador',
};

const linkCompanySchema = z.object({
  company_id: z.string().min(1, 'Selecione uma empresa'),
  role: z.enum([
    'admin_empresa',
    'analista_rh',
    'gestor_departamento',
    'colaborador',
  ]),
  is_default: z.boolean().default(false),
});

type LinkCompanyFormValues = z.infer<typeof linkCompanySchema>;

interface LinkCompanyDialogProps {
  open: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

export function LinkCompanyDialog({ open, onClose, user }: LinkCompanyDialogProps) {
  const { isAdminMaster, isSuperAdmin } = useAuth();
  const { data: allCompanies, isLoading: loadingAllCompanies } = useCompanies();
  const { userCompanies: myCompanies, isLoading: loadingMyCompanies } = useUserCompanies();
  const { linkUserToCompany } = useUserMutations();

  // Buscar empresas com as quais o usuário já tem vínculo
  const { data: existingCompanyIds, isLoading: loadingExisting } = useQuery({
    queryKey: ['user_existing_companies', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      const { data, error } = await supabase
        .from('user_companies' as any)
        .select('company_id')
        .eq('user_id', user.user_id);

      if (error) {
        console.warn('Erro ao carregar vínculos existentes:', error.message);
        return [];
      }
      return (data || []).map((r: any) => r.company_id as string);
    },
    enabled: !!user?.user_id && open,
  });

  // Base de empresas que o chamador pode atribuir:
  // Super Admin / Master: todas as empresas ativas
  // Admin Empresa: apenas as empresas às quais o próprio chamador é admin
  const baseCompanies = (isAdminMaster || isSuperAdmin)
    ? (allCompanies || []).filter((c) => c.status === 'active')
    : (myCompanies || [])
        .filter((c) => c.role === 'admin_empresa')
        .map((c) => ({
          id: c.companyId,
          name: c.name,
          cnpj: c.cnpj,
          status: 'active',
        }));

  // Filtrar apenas as empresas onde o usuário alvo ainda NÃO tem vínculo
  const availableCompanies = baseCompanies.filter(
    (c) => !(existingCompanyIds || []).includes(c.id)
  );

  const form = useForm<LinkCompanyFormValues>({
    resolver: zodResolver(linkCompanySchema),
    defaultValues: {
      company_id: '',
      role: 'colaborador',
      is_default: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        company_id: '',
        role: 'colaborador',
        is_default: false,
      });
    }
  }, [open, form]);

  const onSubmit = async (values: LinkCompanyFormValues) => {
    if (!user?.user_id) return;

    const selectedCompany = availableCompanies.find((c) => c.id === values.company_id);

    await linkUserToCompany.mutateAsync({
      user_id: user.user_id,
      company_id: values.company_id,
      company_name: selectedCompany?.name,
      role: values.role as AppRole,
      is_default: values.is_default,
    });

    onClose();
  };

  const isLoading =
    loadingAllCompanies ||
    loadingMyCompanies ||
    loadingExisting ||
    linkUserToCompany.isPending;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Vincular a Outra Empresa
          </DialogTitle>
          <DialogDescription>
            Conceda acesso a uma empresa adicional para{' '}
            <strong className="text-foreground">{user?.full_name || user?.email}</strong>.
          </DialogDescription>
        </DialogHeader>

        {availableCompanies.length === 0 && !loadingExisting ? (
          <Alert className="bg-muted/50 border-border">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              Este usuário já está vinculado a todas as empresas disponíveis para seu perfil de acesso.
            </AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Select de Empresa */}
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa Alvo</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa para vincular" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCompanies.map((comp) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.name} {comp.cnpj ? `(${comp.cnpj})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Select de Papel */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel na Empresa</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o papel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin_empresa">
                          {roleLabels.admin_empresa} (Gestão Total da Empresa)
                        </SelectItem>
                        <SelectItem value="analista_rh">
                          {roleLabels.analista_rh} (Operação de RH)
                        </SelectItem>
                        <SelectItem value="gestor_departamento">
                          {roleLabels.gestor_departamento} (Gestão de Equipe)
                        </SelectItem>
                        <SelectItem value="colaborador">
                          {roleLabels.colaborador} (Acesso Colaborador)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      O papel define as permissões do usuário especificamente nesta empresa.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Checkbox Empresa Padrão */}
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Definir como empresa padrão</FormLabel>
                      <FormDescription>
                        Ao marcar, esta empresa será aberta automaticamente quando o usuário fizer login.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || availableCompanies.length === 0}
                  className="gradient-primary text-primary-foreground"
                >
                  {linkUserToCompany.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Vinculando...
                    </>
                  ) : (
                    'Vincular Empresa'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
