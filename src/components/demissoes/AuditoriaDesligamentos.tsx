import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, UserMinus, UserCheck, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { parseISODate } from '@/lib/validators/colaborador';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuditoriaDesligamentos } from '@/hooks/useDesligamentos';

interface AuditoriaDesligamentosProps {
  companyId: string | null;
}

const TIPOS_DESLIGAMENTO_LABELS: Record<string, string> = {
  pedido_demissao: 'Pedido de demissão',
  sem_justa_causa: 'Sem justa causa',
  justa_causa: 'Justa causa',
  termino_contrato: 'Término de contrato',
  acordo: 'Acordo',
  outros: 'Outros',
};

export function AuditoriaDesligamentos({ companyId }: AuditoriaDesligamentosProps) {
  const { data: auditoria, isLoading } = useAuditoriaDesligamentos(companyId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!auditoria || auditoria.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum registro de auditoria encontrado.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Colaborador</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Data Desligamento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Motivo/Observação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditoria.map((registro) => (
            <TableRow key={registro.id}>
              <TableCell className="whitespace-nowrap">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {format(new Date(registro.criado_em), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </TableCell>
              <TableCell>
                {registro.acao === 'desligar' ? (
                  <Badge variant="destructive" className="gap-1">
                    <UserMinus className="h-3 w-3" />
                    Desligamento
                  </Badge>
                ) : (
                  <Badge variant="default" className="gap-1">
                    <UserCheck className="h-3 w-3" />
                    Reativação
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {(registro.colaborador as any)?.full_name || '-'}
              </TableCell>
              <TableCell>
                {(registro.colaborador as any)?.department || '-'}
              </TableCell>
              <TableCell>
                {registro.data_desligamento
                  ? format(parseISODate(registro.data_desligamento), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })
                  : '-'}
              </TableCell>
              <TableCell>
                {registro.tipo_desligamento
                  ? TIPOS_DESLIGAMENTO_LABELS[registro.tipo_desligamento] ||
                    registro.tipo_desligamento
                  : '-'}
              </TableCell>
              <TableCell className="max-w-[250px] truncate">
                {registro.motivo || registro.observacao || '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
