import { useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ColunaTabela<T> {
  header: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T extends { id: string; ativo: boolean }> {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
  itens: T[];
  isLoading?: boolean;
  colunas: ColunaTabela<T>[];
  buscaEm: (row: T) => string;
  podeEditar: boolean;
  podeExcluir: boolean;
  onNovo: () => void;
  onEditar: (row: T) => void;
  onExcluir: (row: T) => void;
  labelNovo: string;
  emptyText: string;
}

const PAGE_SIZE = 8;

export function EntidadeTabela<T extends { id: string; ativo: boolean }>({
  titulo,
  descricao,
  icone,
  itens,
  isLoading,
  colunas,
  buscaEm,
  podeEditar,
  podeExcluir,
  onNovo,
  onEditar,
  onExcluir,
  labelNovo,
  emptyText,
}: Props<T>) {
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(0);

  const filtrados = itens.filter((i) =>
    buscaEm(i).toLowerCase().includes(busca.trim().toLowerCase()),
  );
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = filtrados.slice(paginaAtual * PAGE_SIZE, paginaAtual * PAGE_SIZE + PAGE_SIZE);

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            {icone}
            {titulo}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        </div>
        {podeEditar && (
          <Button size="sm" onClick={onNovo}>
            <Plus className="mr-2 h-4 w-4" /> {labelNovo}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(0);
            }}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {colunas.map((c) => (
                      <TableHead key={c.header} className={c.className}>
                        {c.header}
                      </TableHead>
                    ))}
                    <TableHead>Situação</TableHead>
                    {(podeEditar || podeExcluir) && <TableHead className="w-24">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((row) => (
                    <TableRow key={row.id}>
                      {colunas.map((c) => (
                        <TableCell key={c.header} className={c.className}>
                          {c.render(row)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Badge variant={row.ativo ? 'default' : 'secondary'}>
                          {row.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      {(podeEditar || podeExcluir) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {podeEditar && (
                              <Button variant="ghost" size="icon" onClick={() => onEditar(row)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {podeExcluir && (
                              <Button variant="ghost" size="icon" onClick={() => onExcluir(row)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {totalPaginas > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Página {paginaAtual + 1} de {totalPaginas} · {filtrados.length} registros
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual === 0}
                    onClick={() => setPagina(paginaAtual - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paginaAtual >= totalPaginas - 1}
                    onClick={() => setPagina(paginaAtual + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
