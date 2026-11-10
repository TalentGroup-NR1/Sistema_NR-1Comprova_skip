import { useState } from 'react';
import { format, differenceInYears, differenceInMonths, differenceInDays, addYears, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, UserCheck, Loader2, Pencil } from 'lucide-react';
import { parseISODate } from '@/lib/validators/colaborador';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useColaboradoresDesligados } from '@/hooks/useDesligamentos';
import { ReativarColaboradorDialog } from './ReativarColaboradorDialog';
import { DetalhesDesligamentoDialog } from './DetalhesDesligamentoDialog';
import { EditarDesligamentoDialog } from './EditarDesligamentoDialog';

interface ColaboradoresDesligadosTabProps {
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

export function ColaboradoresDesligadosTab({ companyId }: ColaboradoresDesligadosTabProps) {
  const [search, setSearch] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detalhesColaborador, setDetalhesColaborador] = useState<any>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [editarColaborador, setEditarColaborador] = useState<any>(null);
  const [editarOpen, setEditarOpen] = useState(false);

  const { data: colaboradores, isLoading } = useColaboradoresDesligados(companyId);

  const filteredColaboradores = colaboradores?.filter((colaborador) =>
    colaborador.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleReativar = (colaborador: any) => {
    setSelectedColaborador(colaborador);
    setDialogOpen(true);
  };

  function calcularPermanencia(admissionDate: string, terminationDate: string): string {
    const inicio = parseISODate(admissionDate);
    const fim = parseISODate(terminationDate);
    const anos = differenceInYears(fim, inicio);
    const meses = differenceInMonths(fim, addYears(inicio, anos));
    const dias = differenceInDays(fim, addMonths(addYears(inicio, anos), meses));
    const partes: string[] = [];
    if (anos > 0) partes.push(`${anos}a`);
    if (meses > 0) partes.push(`${meses}m`);
    if (dias > 0 || partes.length === 0) partes.push(`${dias}d`);
    return partes.join(' ');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredColaboradores?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum colaborador desligado encontrado.
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Data Desligamento</TableHead>
                <TableHead>Permanência</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredColaboradores?.map((colaborador) => (
                <TableRow
                  key={colaborador.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => { setDetalhesColaborador(colaborador); setDetalhesOpen(true); }}
                >
                  <TableCell className="font-medium">
                    {colaborador.full_name}
                  </TableCell>
                  <TableCell>{colaborador.job_title}</TableCell>
                  <TableCell>{colaborador.department}</TableCell>
                  <TableCell>
                    {colaborador.termination_date
                      ? format(parseISODate(colaborador.termination_date), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })
                      : '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {colaborador.admission_date && colaborador.termination_date
                      ? calcularPermanencia(colaborador.admission_date, colaborador.termination_date)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {TIPOS_DESLIGAMENTO_LABELS[colaborador.tipo_desligamento || ''] ||
                        colaborador.tipo_desligamento ||
                        '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {colaborador.motivo_desligamento || '-'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setEditarColaborador(colaborador); setEditarOpen(true); }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleReativar(colaborador); }}
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Reativar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ReativarColaboradorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        colaborador={selectedColaborador}
      />

      <DetalhesDesligamentoDialog
        open={detalhesOpen}
        onOpenChange={setDetalhesOpen}
        colaborador={detalhesColaborador}
      />

      <EditarDesligamentoDialog
        open={editarOpen}
        onOpenChange={setEditarOpen}
        colaborador={editarColaborador}
      />
    </div>
  );
}
