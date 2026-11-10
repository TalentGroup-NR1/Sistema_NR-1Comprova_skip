import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePlataformaEmpresas } from '@/hooks/usePlataforma';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Boxes, MoreVertical } from 'lucide-react';
import { GerenciarModulosEmpresaDialog } from './GerenciarModulosEmpresaDialog';
import { CompanyLifecycleModal, CompanyLifecycleTargetStatus } from './CompanyLifecycleModal';

const PAGE_SIZE = 20;

export function renderCompanyStatusBadge(status: string | null | undefined) {
  switch (status) {
    case 'ativa':
      return (
        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
          Ativa
        </Badge>
      );
    case 'suspensa':
      return (
        <Badge
          variant="secondary"
          className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
        >
          Suspensa
        </Badge>
      );
    case 'encerrada':
      return (
        <Badge variant="destructive">
          Encerrada
        </Badge>
      );
    default:
      console.warn(`[PlataformaEmpresasTable] Status desconhecido para empresa: "${status}"`);
      return (
        <Badge variant="outline" className="text-muted-foreground font-normal">
          —
        </Badge>
      );
  }
}

export function PlataformaEmpresasTable() {
  const { data: empresas, isLoading } = usePlataformaEmpresas();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todos');
  const [page, setPage] = useState(1);
  const [empresaModulos, setEmpresaModulos] = useState<{ id: string; name: string; brand_name?: string | null } | null>(null);

  const [lifecycleModal, setLifecycleModal] = useState<{
    company: { id: string; name: string; brand_name?: string | null; status: 'ativa' | 'suspensa' | 'encerrada' };
    targetStatus: CompanyLifecycleTargetStatus;
  } | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (empresas ?? []).filter(e => {
      const matchTerm =
        !term ||
        e.name?.toLowerCase().includes(term) ||
        e.brand_name?.toLowerCase().includes(term) ||
        e.cnpj?.toLowerCase().includes(term);
      const matchStatus = status === 'todos' || e.status === status;
      return matchTerm && matchStatus;
    });
  }, [empresas, search, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Card className="rounded-xl">
      <CardHeader className="space-y-4">
        <CardTitle className="text-base">Empresas cadastradas</CardTitle>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Buscar por nome ou CNPJ"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativa">Ativas</SelectItem>
              <SelectItem value="suspensa">Suspensas</SelectItem>
              <SelectItem value="encerrada">Encerradas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marca</TableHead>
                <TableHead>Razão social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Colaboradores</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={7} className="text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-muted-foreground">Nenhuma empresa encontrada.</TableCell></TableRow>
              )}
              {rows.map(e => {
                const isAtiva = e.status === 'ativa';
                const isSuspensa = e.status === 'suspensa';
                const isEncerrada = e.status === 'encerrada';

                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {e.brand_name || e.name}
                        {e.is_internal && <Badge variant="secondary">Interna</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">{e.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{e.cnpj ?? '—'}</TableCell>
                    <TableCell>
                      {renderCompanyStatusBadge(e.status)}
                    </TableCell>
                    <TableCell className="text-right">{e.total_colaboradores}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(e.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEmpresaModulos({
                              id: e.id,
                              name: e.name,
                              brand_name: e.brand_name,
                            })
                          }
                          title="Gerenciar módulos contratados pela empresa"
                        >
                          <Boxes className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                          Módulos
                        </Button>

                        {isEncerrada && (
                          <Badge variant="outline" className="text-muted-foreground font-normal">
                            Terminal
                          </Badge>
                        )}

                        {isAtiva && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={e.is_internal}
                              title={e.is_internal ? 'Empresas internas não podem ser suspensas' : undefined}
                              onClick={() =>
                                setLifecycleModal({
                                  company: { id: e.id, name: e.name, brand_name: e.brand_name, status: 'ativa' },
                                  targetStatus: 'suspensa',
                                })
                              }
                            >
                              Suspender
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={e.is_internal}
                                  title={e.is_internal ? 'Empresas internas não podem ser encerradas' : 'Mais ações'}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                  onClick={() =>
                                    setLifecycleModal({
                                      company: { id: e.id, name: e.name, brand_name: e.brand_name, status: 'ativa' },
                                      targetStatus: 'encerrada',
                                    })
                                  }
                                >
                                  Encerrar empresa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}

                        {isSuspensa && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              disabled={e.is_internal}
                              onClick={() =>
                                setLifecycleModal({
                                  company: { id: e.id, name: e.name, brand_name: e.brand_name, status: 'suspensa' },
                                  targetStatus: 'ativa',
                                })
                              }
                            >
                              Reativar
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={e.is_internal}
                                  title={e.is_internal ? 'Empresas internas não podem ser encerradas' : 'Mais ações'}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive cursor-pointer"
                                  onClick={() =>
                                    setLifecycleModal({
                                      company: { id: e.id, name: e.name, brand_name: e.brand_name, status: 'suspensa' },
                                      targetStatus: 'encerrada',
                                    })
                                  }
                                >
                                  Encerrar empresa
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Página {currentPage} de {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Anterior
              </Button>
              <Button size="sm" variant="outline" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <GerenciarModulosEmpresaDialog
        open={!!empresaModulos}
        onOpenChange={(open) => !open && setEmpresaModulos(null)}
        empresa={empresaModulos}
      />

      <CompanyLifecycleModal
        isOpen={!!lifecycleModal}
        onClose={() => setLifecycleModal(null)}
        company={lifecycleModal?.company ?? null}
        targetStatus={lifecycleModal?.targetStatus ?? 'suspensa'}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['plataforma'] });
        }}
      />
    </Card>
  );
}
