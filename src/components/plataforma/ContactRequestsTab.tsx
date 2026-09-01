import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Copy, Mail, Search, Inbox } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CONTACT_REQUEST_STATUS_LABEL,
  ContactRequestStatus,
  useContactRequests,
  useUpdateContactRequestStatus,
} from '@/hooks/useContactRequests';

const STATUS_VARIANT: Record<ContactRequestStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  nova: 'default',
  em_contato: 'secondary',
  convertida: 'outline',
  descartada: 'destructive',
};

export function ContactRequestsTab() {
  const { data, isLoading } = useContactRequests();
  const updateStatus = useUpdateContactRequestStatus();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'todas' | ContactRequestStatus>('todas');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((r) => {
      const matchStatus = status === 'todas' || r.status === status;
      const matchTerm =
        !term ||
        [r.name, r.company, r.email].some((v) => (v ?? '').toLowerCase().includes(term));
      return matchStatus && matchTerm;
    });
  }, [data, search, status]);

  const copyEmail = async (email: string) => {
    await navigator.clipboard.writeText(email);
    toast.success('E-mail copiado');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Inbox className="h-4 w-4 text-primary" />
          Solicitações de demonstração
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa ou e-mail"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as situações</SelectItem>
              {(Object.keys(CONTACT_REQUEST_STATUS_LABEL) as ContactRequestStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {CONTACT_REQUEST_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma solicitação encontrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="min-w-[220px]">Mensagem</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.company}</TableCell>
                    <TableCell className="text-xs">
                      <div>{r.email}</div>
                      {r.phone && <div className="text-muted-foreground">{r.phone}</div>}
                    </TableCell>
                    <TableCell className="max-w-sm text-xs text-muted-foreground">
                      <span className="line-clamp-2">{r.message || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_VARIANT[r.status]} className="whitespace-nowrap">
                          {CONTACT_REQUEST_STATUS_LABEL[r.status]}
                        </Badge>
                        <Select
                          value={r.status}
                          onValueChange={(v) =>
                            updateStatus.mutate({ id: r.id, status: v as ContactRequestStatus })
                          }
                        >
                          <SelectTrigger className="h-8 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.keys(CONTACT_REQUEST_STATUS_LABEL) as ContactRequestStatus[]).map(
                              (s) => (
                                <SelectItem key={s} value={s}>
                                  {CONTACT_REQUEST_STATUS_LABEL[s]}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Copiar e-mail"
                          onClick={() => copyEmail(r.email)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Responder por e-mail" asChild>
                          <a href={`mailto:${r.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
