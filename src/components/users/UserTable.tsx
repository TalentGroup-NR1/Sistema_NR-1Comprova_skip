import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Mail,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { UserProfile } from '@/hooks/useUsers';
import { useUserMutations } from '@/hooks/useUserMutations';
import { useAuth, AppRole } from '@/hooks/useAuth';
import { ChangeUserRoleDialog } from './ChangeUserRoleDialog';
import { LinkCompanyDialog } from './LinkCompanyDialog';
import { useResendAcessoByUserId } from '@/hooks/useColaboradoresPendentes';

const roleLabels: Record<AppRole, string> = {
  admin_master: 'Admin Master',
  admin_empresa: 'Admin Empresa',
  analista_rh: 'Analista RH',
  gestor_departamento: 'Gestor',
  colaborador: 'Colaborador',
};

const roleBadgeColors: Record<AppRole, string> = {
  admin_master: 'bg-destructive/10 text-destructive border-destructive/20',
  admin_empresa: 'bg-primary/10 text-primary border-primary/20',
  analista_rh: 'bg-info/10 text-info border-info/20',
  gestor_departamento: 'bg-warning/10 text-warning border-warning/20',
  colaborador: 'bg-success/10 text-success border-success/20',
};

interface UserTableProps {
  users: UserProfile[];
  isLoading?: boolean;
}

export function UserTable({ users, isLoading }: UserTableProps) {
  const { isAdminMaster, isSuperAdmin, isAdminEmpresa, role: callerRole, user: currentUser } = useAuth();
  const { toggleUserStatus } = useUserMutations();
  const resendAcesso = useResendAcessoByUserId();
  const [changingRoleUser, setChangingRoleUser] = useState<UserProfile | null>(null);
  const [linkingCompanyUser, setLinkingCompanyUser] = useState<UserProfile | null>(null);

  const canLinkCompany = isAdminMaster || isSuperAdmin || isAdminEmpresa;

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Permissão para alterar papel e ativar/desativar
  // (admin_empresa NÃO pode alterar outro admin_empresa nem a si mesmo)
  const canModifyRoleAndStatus = (targetUser: UserProfile) => {
    if (targetUser.user_id === currentUser?.id) return false;
    if (isAdminMaster || isSuperAdmin) return true;
    if (targetUser.role === 'admin_master' || targetUser.role === 'admin_empresa') {
      return false;
    }
    return true;
  };

  // Permissão para reenviar convite de senha (permitido para admin_empresa sobre qualquer membro da mesma empresa)
  const canResendInvite = (targetUser: UserProfile) => {
    if (targetUser.user_id === currentUser?.id) return false;
    if (isAdminMaster || isSuperAdmin || isAdminEmpresa) return true;
    return false;
  };

  // Permissão para vincular a outra empresa (permitido para admin_empresa/admin_master sobre qualquer usuário)
  const canLinkUserToCompany = (_targetUser: UserProfile) => {
    return !!canLinkCompany;
  };

  const handleToggleStatus = async (user: UserProfile) => {
    await toggleUserStatus.mutateAsync({
      user_id: user.user_id,
      is_active: !user.is_active,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Carregando usuários...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Nenhum usuário encontrado
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Perfil</TableHead>
            {isAdminMaster && <TableHead>Empresa</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {user.full_name || 'Sem nome'}
                    </p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {user.role && (
                  <Badge className={roleBadgeColors[user.role]}>
                    {roleLabels[user.role]}
                  </Badge>
                )}
              </TableCell>
              {isAdminMaster && (
                <TableCell className="text-muted-foreground text-sm">
                  {user.company_name || '-'}
                </TableCell>
              )}
              <TableCell>
                {user.is_active ? (
                  <Badge className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                  </Badge>
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                    <XCircle className="h-3 w-3 mr-1" /> Inativo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {(() => {
                  const isSelf = user.user_id === currentUser?.id;
                  const allowRoleAndStatus = canModifyRoleAndStatus(user);
                  const allowResend = canResendInvite(user);
                  const allowLinkCompany = canLinkUserToCompany(user);
                  const hasAnyAction = allowRoleAndStatus || allowResend || allowLinkCompany;

                  return (
                    <div className="flex items-center justify-end gap-2">
                      {isSelf && (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">
                          Você
                        </Badge>
                      )}

                      {hasAnyAction && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {allowRoleAndStatus && (
                              <DropdownMenuItem onClick={() => setChangingRoleUser(user)}>
                                <ShieldCheck className="h-4 w-4 mr-2 text-primary" /> Alterar Perfil
                              </DropdownMenuItem>
                            )}

                            {allowLinkCompany && (
                              <DropdownMenuItem onClick={() => setLinkingCompanyUser(user)}>
                                <Building2 className="h-4 w-4 mr-2 text-primary" /> Vincular a outra empresa
                              </DropdownMenuItem>
                            )}

                            {allowResend && (
                              <DropdownMenuItem
                                disabled={resendAcesso.isPending}
                                onClick={() => resendAcesso.mutate({ user_id: user.user_id })}
                              >
                                <Mail className="h-4 w-4 mr-2" /> Reenviar convite de senha
                              </DropdownMenuItem>
                            )}

                            {allowRoleAndStatus && (
                              user.is_active ? (
                                <DropdownMenuItem 
                                  className="text-warning"
                                  onClick={() => handleToggleStatus(user)}
                                >
                                  <Lock className="h-4 w-4 mr-2" /> Desativar
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="text-success"
                                  onClick={() => handleToggleStatus(user)}
                                >
                                  <Unlock className="h-4 w-4 mr-2" /> Ativar
                                </DropdownMenuItem>
                              )
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      <ChangeUserRoleDialog
        open={!!changingRoleUser}
        onClose={() => setChangingRoleUser(null)}
        user={changingRoleUser}
      />

      {linkingCompanyUser && (
        <LinkCompanyDialog
          open={!!linkingCompanyUser}
          onClose={() => setLinkingCompanyUser(null)}
          user={linkingCompanyUser}
        />
      )}
    </>
  );
}
