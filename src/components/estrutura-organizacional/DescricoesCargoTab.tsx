import { useState } from 'react';
import { FileText, Plus, Pencil, Trash2, Search, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCargos, useDepartamentos } from '@/hooks/useEstruturaConfig';
import {
  useDescricoesCargo,
  useDescricaoCargoMutations,
  type DescricaoCargo,
} from '@/hooks/useDescricoesCargo';
import { DescricaoCargoForm } from './DescricaoCargoForm';
import { useDescricaoCargoPdf } from '@/hooks/useDescricaoCargoPdf';

interface Props {
  companyId: string | null;
  podeEditar: boolean;
  podeExcluir: boolean;
}

export function DescricoesCargoTab({ companyId, podeEditar, podeExcluir }: Props) {
  const { data: descricoes = [], isLoading } = useDescricoesCargo(companyId);
  const { data: cargos = [] } = useCargos(companyId);
  const { data: departamentos = [] } = useDepartamentos(companyId);
  const { excluir } = useDescricaoCargoMutations(companyId);
  const { gerar, gerando } = useDescricaoCargoPdf(companyId);

  const [editando, setEditando] = useState<DescricaoCargo | null>(null);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState('');

  if (criando || editando) {
    return (
      <DescricaoCargoForm
        companyId={companyId}
        descricao={editando}
        podeEditar={podeEditar}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
      />
    );
  }

  const nomeCargo = (id: string | null) => cargos.find((c) => c.id === id)?.nome ?? '—';
  const nomeDep = (id: string | null) => departamentos.find((d) => d.id === id)?.nome ?? '—';

  const filtradas = descricoes.filter((d) =>
    `${d.titulo} ${nomeCargo(d.cargo_id)} ${nomeDep(d.departamento_id)}`
      .toLowerCase()
      .includes(busca.trim().toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar descrição..."
            className="pl-8"
          />
        </div>
        {podeEditar && (
          <Button onClick={() => setCriando(true)} disabled={!companyId}>
            <Plus className="mr-2 h-4 w-4" /> Nova Descrição
          </Button>
        )}
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Nenhuma descrição de cargo cadastrada</p>
              <p className="text-sm text-muted-foreground">
                Crie a primeira descrição com responsabilidades, competências e fatores.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título da Descrição</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => setEditando(d)}
                    >
                      <TableCell className="font-medium">{d.titulo}</TableCell>
                      <TableCell>{nomeCargo(d.cargo_id)}</TableCell>
                      <TableCell>{nomeDep(d.departamento_id)}</TableCell>
                      <TableCell>
                        <Badge variant={d.ativo ? 'default' : 'secondary'}>
                          {d.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Baixar PDF"
                            disabled={gerando}
                            onClick={() => gerar(d)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditando(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {podeExcluir && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => excluir.mutate(d.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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
    </div>
  );
}
