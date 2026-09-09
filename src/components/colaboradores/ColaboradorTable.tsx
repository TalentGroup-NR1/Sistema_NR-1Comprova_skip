import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from 'date-fns';
import { parseISODate } from '@/lib/validators/colaborador';
import { ptBR } from 'date-fns/locale';
import {
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  FileUser,
  ArrowRightLeft,
  Users,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTransferenciasRecentes } from '@/hooks/useTransferenciaColaborador';
import { TransferirColaboradorDialog } from './TransferirColaboradorDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Colaborador } from '@/hooks/useColaboradores';

interface ColaboradorTableProps {
  colaboradores: Colaborador[];
  isLoading?: boolean;
  onEdit: (colaborador: Colaborador) => void;
  onView: (colaborador: Colaborador) => void;
  onDelete: (id: string) => void;
  onNovo?: () => void;
}

const statusStyles: Record<string, string> = {
  ATIVO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  FERIAS: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  DESLIGADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  LICENCA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
};

const statusLabels: Record<string, string> = {
  ATIVO: 'Ativo',
  FERIAS: 'Férias',
  DESLIGADO: 'Desligado',
  LICENCA: 'Licença',
};

const jobLevelLabels: Record<string, string> = {
  ESTAGIARIO: 'Estagiário',
  TRAINEE: 'Trainee',
  JUNIOR: 'Júnior',
  PLENO: 'Pleno',
  SENIOR: 'Sênior',
  ESPECIALISTA: 'Especialista',
  COORDENADOR: 'Coordenador',
  GERENTE: 'Gerente',
  DIRETOR: 'Diretor',
  C_LEVEL: 'C-Level',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function calculateTempoCasa(admissionDate: string): string {
  const admission = parseISODate(admissionDate);
  const now = new Date();

  const years = differenceInYears(now, admission);
  const afterYears = addYears(admission, years);
  const months = differenceInMonths(now, afterYears);
  const afterMonths = addMonths(afterYears, months);
  const days = differenceInDays(now, afterMonths);

  const parts: string[] = [];
  if (years > 0) parts.push(years === 1 ? '1 ano' : `${years} anos`);
  if (months > 0) parts.push(months === 1 ? '1 mês' : `${months} meses`);
  if (days > 0 || parts.length === 0) parts.push(days === 1 ? '1 dia' : `${days} dias`);

  return parts.join(', ');
}

function formatCargoNivel(jobTitle: string, jobLevel: string | null): string {
  if (!jobLevel) {
    return jobTitle || '—';
  }
  const levelLabel = jobLevelLabels[jobLevel] || jobLevel;
  return `${jobTitle} - ${levelLabel}`;
}

export function ColaboradorTable({
  colaboradores,
  isLoading,
  onEdit,
  onView,
  onDelete,
  onNovo,
}: ColaboradorTableProps) {
  const navigate = useNavigate();
  const { isAdminMaster, isAdminEmpresa, role } = useAuth();
  const canTransferir = isAdminMaster || isAdminEmpresa || role === 'analista_rh';
  const { data: recentTransfers } = useTransferenciasRecentes();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [colaboradorToDelete, setColaboradorToDelete] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<Colaborador | null>(null);

  const handleDeleteClick = (id: string) => {
    setColaboradorToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (colaboradorToDelete) {
      onDelete(colaboradorToDelete);
    }
    setDeleteDialogOpen(false);
    setColaboradorToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (colaboradores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="rounded-full bg-primary/10 p-4 text-primary mb-3">
          <Users className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold text-foreground">Convide os primeiros colaboradores</p>
        <p className="text-sm text-muted-foreground max-w-md mt-1 mb-5">
          Adicione os membros da sua equipe para liberar o acesso ao sistema, gerenciar registros e acompanhar o Mapa de Riscos NR-1.
        </p>
        {onNovo && (
          <Button onClick={onNovo} className="gradient-primary text-primary-foreground shadow-sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Cadastrar primeiro colaborador
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="min-w-[200px]">Colaborador</TableHead>
              <TableHead className="min-w-[180px] hidden md:table-cell">Cargo e Nível</TableHead>
              <TableHead className="min-w-[140px] hidden lg:table-cell">Departamento</TableHead>
              <TableHead className="min-w-[110px] hidden xl:table-cell">Admissão</TableHead>
              <TableHead className="min-w-[130px] hidden xl:table-cell">Tempo de Casa</TableHead>
              <TableHead className="min-w-[150px] hidden lg:table-cell">Gestor</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {colaboradores.map((colaborador) => (
            <ContextMenu key={colaborador.id}>
              <ContextMenuTrigger asChild>
                <TableRow 
                  className="group cursor-pointer hover:bg-primary/5 transition-colors"
                  onClick={() => onView(colaborador)}
                >
                <TableCell>
                  <Badge className={statusStyles[colaborador.status] || statusStyles.ATIVO}>
                    {statusLabels[colaborador.status] || colaborador.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={colaborador.avatar_url || ''} alt={colaborador.full_name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getInitials(colaborador.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{colaborador.full_name}</p>
                        {recentTransfers?.has(colaborador.id) && (
                          <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                            <ArrowRightLeft className="h-3 w-3" />
                            Transferido
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {colaborador.email_pessoal || colaborador.corporate_email || '—'}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="font-medium">
                    {formatCargoNivel(colaborador.job_title, colaborador.job_level)}
                  </p>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <p>{colaborador.department || '—'}</p>
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  {format(parseISODate(colaborador.admission_date), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell className="hidden xl:table-cell">
                  <p className="text-muted-foreground">
                    {calculateTempoCasa(colaborador.admission_date)}
                  </p>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <p>{colaborador.gestor_nome || colaborador.manager_name || '—'}</p>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(colaborador); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(colaborador); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/ficha-profissional/${colaborador.id}`); }}>
                        <FileUser className="mr-2 h-4 w-4" />
                        Ficha Profissional
                      </DropdownMenuItem>
                      {canTransferir && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setTransferTarget(colaborador); }}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Transferir para outra empresa
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(colaborador.id); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={() => onView(colaborador)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Perfil
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onEdit(colaborador)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </ContextMenuItem>
                <ContextMenuItem onClick={() => navigate(`/ficha-profissional/${colaborador.id}`)}>
                  <FileUser className="mr-2 h-4 w-4" />
                  Ficha Profissional
                </ContextMenuItem>
                {canTransferir && (
                  <ContextMenuItem onClick={() => setTransferTarget(colaborador)}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transferir para outra empresa
                  </ContextMenuItem>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem 
                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(colaborador.id); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
            ))}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TransferirColaboradorDialog
        open={!!transferTarget}
        onOpenChange={(o) => { if (!o) setTransferTarget(null); }}
        colaborador={transferTarget}
      />
    </>
  );
}
