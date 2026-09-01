import { Fragment, useMemo, useState } from 'react';
import { Search, ClipboardList, Users, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDescricoesComQuestionario } from '@/hooks/useDescricaoQuestionario';
import { useQuestionarioAtribuicoes } from '@/hooks/useQuestionarioAtribuicoes';

interface Props {
  companyId: string;
  onAbrirDescricao: (descricaoId: string) => void;
}

function DetalheAtribuicoes({ questionarioId }: { questionarioId: string }) {
  const { data: atribuicoes = [] } = useQuestionarioAtribuicoes(questionarioId);
  if (atribuicoes.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhum colaborador habilitado.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {atribuicoes.map((a) => (
        <Badge
          key={a.id}
          variant={a.status === 'preenchido' ? 'default' : 'secondary'}
          className="font-normal"
        >
          {a.colaborador_nome} · {a.status === 'preenchido' ? 'preenchido' : a.status === 'em_andamento' ? 'em andamento' : 'pendente'}
        </Badge>
      ))}
    </div>
  );
}

export function MinhasAtividadesAdminTab({ companyId, onAbrirDescricao }: Props) {
  const { data: descricoes = [], isLoading } = useDescricoesComQuestionario(companyId);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<string | null>(null);

  const lista = useMemo(
    () => descricoes.filter((d) => d.titulo.toLowerCase().includes(busca.toLowerCase())),
    [descricoes, busca],
  );

  const totalHabilitados = descricoes.reduce((n, d) => n + d.total, 0);
  const totalPreenchidos = descricoes.reduce((n, d) => n + d.preenchidos, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 pt-5">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{descricoes.filter((d) => d.total > 0).length}</p>
              <p className="text-xs text-muted-foreground">Cargos em construção</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 pt-5">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalHabilitados}</p>
              <p className="text-xs text-muted-foreground">Colaboradores habilitados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="flex items-center gap-3 pt-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{totalPreenchidos}</p>
              <p className="text-xs text-muted-foreground">Questionários preenchidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar descrição de cargo"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <Card className="rounded-xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição de cargo</TableHead>
                <TableHead className="w-48">Progresso</TableHead>
                <TableHead className="w-40">Situação</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && lista.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhuma descrição de cargo encontrada.
                  </TableCell>
                </TableRow>
              )}
              {lista.map((d) => (
                <Fragment key={d.id}>
                  <TableRow>
                    <TableCell className="font-medium">{d.titulo}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress
                          value={d.total ? (d.preenchidos / d.total) * 100 : 0}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {d.preenchidos}/{d.total} preenchido(s)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {!d.descricao_questionario_id ? (
                        <Badge variant="outline">Sem questionário</Badge>
                      ) : d.total === 0 ? (
                        <Badge variant="secondary">Não habilitado</Badge>
                      ) : d.preenchidos === d.total ? (
                        <Badge className="bg-emerald-100 text-emerald-800">Completo</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">Aguardando</Badge>
                      )}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      {d.descricao_questionario_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandido(expandido === d.id ? null : d.id)}
                        >
                          {expandido === d.id ? 'Ocultar' : 'Detalhes'}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => onAbrirDescricao(d.id)}>
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandido === d.id && d.descricao_questionario_id && (
                    <TableRow>
                      <TableCell colSpan={4} className="bg-muted/30">
                        <DetalheAtribuicoes questionarioId={d.descricao_questionario_id} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
