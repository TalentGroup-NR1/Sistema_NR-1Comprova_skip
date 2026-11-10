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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { UserProfile } from '@/hooks/useUsers';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { useUpdateUserRole } from '@/hooks/useUpdateUserRole';
import { ShieldAlert, User, Mail, ShieldCheck, Loader2, Building2, Wrench, Users } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/constants';

const roleIcons: Record<AppRole, React.ComponentType<{ className?: string }>> = {
  admin_master: ShieldAlert,
  admin_empresa: Building2,
  analista_rh: Wrench,
  gestor_departamento: Users,
  colaborador: User,
};

interface ChangeUserRoleDialogProps {
  user: UserProfile | null;
  open: boolean;
  onClose: () => void;
  totalCompanyAdmins?: number;
}

export function ChangeUserRoleDialog({
  user,
  open,
  onClose,
  totalCompanyAdmins,
}: ChangeUserRoleDialogProps) {
  const { isAdminMaster, isSuperAdmin, companyId: authCompanyId } = useAuth();
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
  // admin_master e super_admin podem atribuir qualquer papel, inclusive admin_master
  // admin_empresa pode atribuir admin_empresa, analista_rh, gestor_departamento, colaborador
  const availableRoles: AppRole[] = isAdminMaster || isSuperAdmin
    ? ['admin_master', 'admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador']
    : ['admin_empresa', 'analista_rh', 'gestor_departamento', 'colaborador'];

  const isTargetAdmin = user.role === 'admin_empresa';
  const isLastAdmin = isTargetAdmin && (totalCompanyAdmins !== undefined ? totalCompanyAdmins <= 1 : false);
  const isDemotingLastAdmin = isLastAdmin && selectedRole !== 'admin_empresa';

  const isSameRole = selectedRole === user.role;
  const isLoading = updateRoleMutation.isPending;

  const handleSave = async () => {
    if (!selectedRole || isSameRole || isDemotingLastAdmin) return;
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
    <TooltipProvider delayDuration={150}>
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
            {/* Aviso de Salvaguarda do Último Admin */}
            {isLastAdmin && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Salvaguarda do Último Administrador</p>
                  <p className="text-amber-500/90 mt-0.5">
                    Operação bloqueada: a empresa deve possuir pelo menos um Administrador ativo. Não é permitido rebaixar o único administrador.
                  </p>
                </div>
              </div>
            )}

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
                  {user.role ? (ROLE_LABELS[user.role] || user.role) : 'Indefinido'}
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
                  {availableRoles.map((r) => {
                    const isDemotion = isTargetAdmin && r !== 'admin_empresa';
                    const isOptionDisabled = isLastAdmin && isDemotion;
                    const Icon = roleIcons[r];
                    const label = ROLE_LABELS[r] || r;

                    if (isOptionDisabled) {
                      return (
                        <Tooltip key={r}>
                          <TooltipTrigger asChild>
                            <div>
                              <SelectItem value={r} disabled className="opacity-50 cursor-not-allowed">
                                <div className="flex items-center gap-2">
                                  {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                                  <span>{label} (Bloqueado)</span>
                                </div>
                              </SelectItem>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            Operação bloqueada: a empresa deve possuir pelo menos um Administrador ativo.
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <SelectItem key={r} value={r}>
                        <div className="flex items-center gap-2">
                          {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                          <span>{label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {selectedRole === 'admin_empresa' && (
                  'Administrador Empresa terá controle total sobre as configurações e colaboradores da empresa.'
                )}
                {selectedRole === 'analista_rh' && (
                  'Administrador Operacional terá permissão operacional para gestão de colaboradores, férias e comunicados.'
                )}
                {selectedRole === 'gestor_departamento' && (
                  'Gestor de Departamento terá acesso aos colaboradores da sua equipe com as restrições deliberadas da NR-1.'
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    onClick={handleSave}
                    disabled={isLoading || isSameRole || !selectedRole || isDemotingLastAdmin}
                    className="gradient-primary"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Perfil
                  </Button>
                </span>
              </TooltipTrigger>
              {isDemotingLastAdmin && (
                <TooltipContent>
                  Operação bloqueada: a empresa deve possuir pelo menos um Administrador ativo.
                </TooltipContent>
              )}
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
