import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { useCompanies } from '@/hooks/useCompanies';
import { useUserMutations } from '@/hooks/useUserMutations';
import { UserProfile } from '@/hooks/useUsers';
import { Loader2 } from 'lucide-react';

const roleLabels: Record<AppRole, string> = {
  admin_master: 'Admin Master',
  admin_empresa: 'Admin Empresa',
  analista_rh: 'Analista RH',
  gestor_departamento: 'Gestor de Departamento',
  colaborador: 'Colaborador',
};

const createUserSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  role: z.enum(['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']),
  company_id: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

const editUserSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
  role: z.enum(['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']),
  company_id: z.string().optional(),
}).refine(data => !data.password || data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  user?: UserProfile | null;
}

export function UserForm({ open, onClose, user }: UserFormProps) {
  const { isAdminMaster, companyId } = useAuth();
  const { data: companies } = useCompanies();
  const { createUser, updateUser } = useUserMutations();

  const isEditing = !!user;
  const schema = isEditing ? editUserSchema : createUserSchema;

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
      password: '',
      confirmPassword: '',
      role: user?.role || 'colaborador',
      company_id: user?.company_id || companyId || undefined,
    },
  });

  const onSubmit = async (values: z.infer<typeof createUserSchema>) => {
    if (isEditing && user) {
      await updateUser.mutateAsync({
        user_id: user.user_id,
        email: values.email,
        full_name: values.full_name,
        role: values.role as AppRole,
        ...(values.password ? { password: values.password } : {}),
      });
    } else {
      await createUser.mutateAsync({
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        role: values.role as AppRole,
        company_id: isAdminMaster ? values.company_id : companyId || undefined,
      });
    }
    onClose();
    form.reset();
  };

  // Roles available based on caller's role
  const availableRoles: AppRole[] = isAdminMaster
    ? ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']
    : ['analista_rh', 'gestor_departamento', 'colaborador'];

  const isLoading = createUser.isPending || updateUser.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do usuário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{isEditing ? 'Nova Senha (opcional)' : 'Senha'}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Perfil</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {roleLabels[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isAdminMaster && (
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Empresa</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "__none__" ? undefined : val)} defaultValue={field.value || "__none__"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma (Admin Master)</SelectItem>
                        {companies?.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
