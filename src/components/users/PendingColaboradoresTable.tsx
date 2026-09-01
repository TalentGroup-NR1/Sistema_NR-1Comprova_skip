import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { KeyRound, Calendar, Briefcase, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useColaboradoresPendentes, useResendAcessoColaborador, type ColaboradorPendente } from '@/hooks/useColaboradoresPendentes';
import { FinalizeColaboradorDialog } from './FinalizeColaboradorDialog';
import { useAuth } from '@/hooks/useAuth';

function getInitials(name: string | null) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface PendingColaboradoresTableProps {
  searchTerm?: string;
}

export function PendingColaboradoresTable({ searchTerm = '' }: PendingColaboradoresTableProps) {
  const { isAdminMaster } = useAuth();
  const { data: pendingColaboradores, isLoading } = useColaboradoresPendentes();
  const resendAcesso = useResendAcessoColaborador();
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorPendente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredColaboradores = pendingColaboradores?.filter(colab =>
    colab.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    colab.email_pessoal.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleResend = async (colaborador: ColaboradorPendente, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await resendAcesso.mutateAsync({ colaborador_id: colaborador.id });
    } catch {
      // error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (filteredColaboradores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <KeyRound className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum cadastro pendente</p>
        <p className="text-sm">Todos os colaboradores com e-mail já possuem acesso ao sistema.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Departamento</TableHead>
            {isAdminMaster && <TableHead>Empresa</TableHead>}
            <TableHead>Admissão</TableHead>
            <TableHead className="w-[180px]">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredColaboradores.map((colaborador) => (
            <TableRow key={colaborador.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-warning/10 text-warning text-xs">
                      {getInitials(colaborador.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{colaborador.full_name}</p>
                    <p className="text-sm text-muted-foreground">{colaborador.email_pessoal}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  {colaborador.job_title}
                </div>
              </TableCell>
              <TableCell>{colaborador.department}</TableCell>
              {isAdminMaster && (
                <TableCell>
                  <Badge variant="outline">{colaborador.company_name || '-'}</Badge>
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {format(parseISO(colaborador.admission_date), 'dd/MM/yyyy', { locale: ptBR })}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedColaborador(colaborador);
                      setDialogOpen(true);
                    }}
                    className="gradient-primary text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                    Liberar
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    title="Reenviar e-mail de acesso"
                    disabled={resendAcesso.isPending}
                    onClick={(e) => handleResend(colaborador, e)}
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <FinalizeColaboradorDialog
        colaborador={selectedColaborador}
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedColaborador(null);
        }}
      />
    </>
  );
}
