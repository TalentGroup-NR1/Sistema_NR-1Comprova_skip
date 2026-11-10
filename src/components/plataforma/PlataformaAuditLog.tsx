import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlataformaAuditLogs } from '@/hooks/usePlataforma';

const ACTION_LABELS: Record<string, string> = {
  empresa_suspensa: 'Empresa suspensa',
  empresa_ativada: 'Empresa ativada',
};

export function PlataformaAuditLog() {
  const { data: logs, isLoading } = usePlataformaAuditLogs();
  const [action, setAction] = useState('todos');

  const filtered = useMemo(
    () => (logs ?? []).filter(l => action === 'todos' || l.action === action),
    [logs, action],
  );

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="text-base">Log de auditoria</CardTitle>
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Tipo de ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as ações</SelectItem>
            <SelectItem value="empresa_suspensa">Empresa suspensa</SelectItem>
            <SelectItem value="empresa_ativada">Empresa ativada</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/hora</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-muted-foreground">Nenhuma ação registrada.</TableCell></TableRow>
            )}
            {filtered.map(log => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>{log.user_email ?? '—'}</TableCell>
                <TableCell>{ACTION_LABELS[log.action] ?? log.action}</TableCell>
                <TableCell>{log.target_company_name ?? '—'}</TableCell>
                <TableCell>{log.ip_address ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
