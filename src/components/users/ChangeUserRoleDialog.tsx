import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserProfile } from '@/hooks/useUsers';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { useUpdateUserRole } from '@/hooks/useUpdateUserRole';
import { ShieldAlert, User, Mail, ShieldCheck, Loader2 } from 'lucide-react';

const roleLabels: Record<AppRole, string> = {
  admin_master: 'Admin Master',
  admin_empresa: 'Admin Empresa',
  analista_rh: 'Analista RH',
  gestor_departamento: 'Gestor de Departamento',
  colaborador: 'Colaborador',
};

interface ChangeUserRoleDialogProps {
  user: UserProfile | null;
  open: boolean;
  onClose: () => void;
}

export function ChangeUserRoleDialog({ user, open, onClose }: ChangeUserRoleDialogProps) {
  const { isAdminMaster, companyId: authCompanyId } = useAuth();
  const updateRoleMutation = useUpdateUserRole();
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');

  useEffect(() => {
    if (user?.role) {
      setSelectedRole(user.role);
    } else {
      setSelectedRole('colaborador');
    }
  }, [user]);

  if (!user) return null;

  const targetCompanyId = user.company_id || authCompanyId;

  // Papéis disponíveis conforme o perfil do chamador
  const availableRoles: AppRole[] = isAdminMaster
    ? ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']
    : ['analista_rh', 'gestor_departamento', 'colaborador'];

  const isSameRole = selectedRole === user.role;
  const isLoading = updateRoleMutation.isPending;

  const handleSave = async () => {
    if (!selectedRole || isSameRole) return;
    if (!targetCompanyId) {
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        userId: user.user_id,
        companyId: targetCompanyId,
        newRole: selectedRole as AppRole,
      });
      onClose();
    } catch {
      // Erro exibido pelo toast da mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Alterar Perfil de Acesso
          </DialogTitle>
          <DialogDescription>
            Atualize o nível de acesso do usuário ativo. A senha e as credenciais de login permanecem 100% intactas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Informações somente leitura do usuário */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-foreground font-medium">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{user.full_name || 'Sem nome'}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
              <Mail className="h-4 w-4" />
              <span>{user.email || 'Sem e-mail'}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">Perfil Atual:</span>
              <Badge variant="outline" className="font-semibold">
                {user.role ? roleLabels[user.role] : 'Indefinido'}
              </Badge>
            </div>
          </div>

          {/* Seleção do novo perfil */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Novo Perfil <span className="text-destructive">*</span>
            </label>
            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as AppRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione o novo perfil" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              {selectedRole === 'gestor_departamento' && (
                'Gestor de Departamento terá acesso aos colaboradores da sua equipe com as restrições deliberadas da NR-1.'
              )}
              {selectedRole === 'analista_rh' && (
                'Analista RH terá permissão operacional para gestão de colaboradores, férias e comunicados.'
              )}
              {selectedRole === 'colaborador' && (
                'Colaborador terá acesso padrão ao autoatendimento e módulo NR-1.'
              )}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || isSameRole || !selectedRole}
            className="gradient-primary"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Perfil
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
