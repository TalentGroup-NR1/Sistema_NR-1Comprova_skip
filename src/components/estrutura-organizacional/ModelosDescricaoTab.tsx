import { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, Copy, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  useDescricaoModelos,
  useDescricaoModeloMutations,
  type DescricaoModelo,
} from '@/hooks/useDescricaoModelos';
import { DescricaoModeloEditor } from './DescricaoModeloEditor';
import { modeloPadraoBlocos, type DBloco } from '@/lib/descricaoModelo';

interface Props {
  companyId: string;
  podeEditar: boolean;
  podeExcluir: boolean;
}

export function ModelosDescricaoTab({ companyId, podeEditar, podeExcluir }: Props) {
  const { data: modelos = [], isLoading } = useDescricaoModelos(companyId);
  const { salvar, excluir, duplicar, definirPadrao } = useDescricaoModeloMutations(companyId);

  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [blocos, setBlocos] = useState<DBloco[]>([]);
  const [excluindo, setExcluindo] = useState<DescricaoModelo | null>(null);

  const modelo = modelos.find((m) => m.id === selecionado) ?? null;

  useEffect(() => {
    if (modelo) {
      setNome(modelo.nome);
      setDescricao(modelo.descricao ?? '');
      setBlocos(modelo.blocos);
    }
  }, [modelo]);

  const criar = async (comPadrao: boolean) => {
    const id = await salvar.mutateAsync({
      values: {
        nome: comPadrao ? 'Modelo padrão de descrição' : 'Novo modelo',
        descricao: comPadrao ? 'Blocos padrão do formulário de descrição de cargo' : null,
        blocos: comPadrao ? modeloPadraoBlocos() : [],
        padrao: modelos.length === 0,
        ativo: true,
      },
    });
    setSelecionado(id);
  };

  const salvarTudo = () => {
    if (!selecionado) return;
    salvar.mutate({ id: selecionado, values: { nome, descricao, blocos } });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modelos de descrição</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && modelos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum modelo criado ainda.</p>
          )}
          {modelos.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelecionado(m.id)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border p-3 text-left transition-colors hover:bg-muted ${
                selecionado === m.id ? 'border-primary bg-muted' : ''
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-primary" />
                {m.nome}
              </span>
              {m.padrao && <Badge variant="secondary">Padrão</Badge>}
            </button>
          ))}

          {podeEditar && (
            <div className="space-y-2 pt-2">
              <Button className="w-full" onClick={() => criar(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Criar com blocos padrão
              </Button>
              <Button className="w-full" variant="outline" onClick={() => criar(false)}>
                <Plus className="mr-2 h-4 w-4" /> Modelo em branco
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {!modelo ? (
          <Card className="rounded-xl">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Selecione ou crie um modelo para montar os blocos da descrição de cargo.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-xl">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Dados do modelo</CardTitle>
                <div className="flex flex-wrap gap-2">
                  {podeEditar && !modelo.padrao && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => definirPadrao.mutate(modelo.id)}
                    >
                      <Star className="mr-2 h-4 w-4" /> Definir como padrão
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => duplicar.mutate(modelo)}>
                    <Copy className="mr-2 h-4 w-4" /> Duplicar
                  </Button>
                  {podeExcluir && (
                    <Button variant="outline" size="sm" onClick={() => setExcluindo(modelo)}>
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
                    </Button>
                  )}
                  {podeEditar && (
                    <Button size="sm" onClick={salvarTudo} disabled={salvar.isPending}>
                      Salvar modelo
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nome</Label>
                  <Input
                    disabled={!podeEditar}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    disabled={!podeEditar}
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-muted-foreground">
              Os blocos abaixo aparecem no formulário de descrição de cargo e, automaticamente, no
              questionário do colaborador — exceto os marcados como internos do RH.
            </p>

            <DescricaoModeloEditor
              blocos={blocos}
              onChange={setBlocos}
              readOnly={!podeEditar}
            />

            {podeEditar && (
              <div className="flex justify-end">
                <Button onClick={salvarTudo} disabled={salvar.isPending}>
                  Salvar modelo
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo</AlertDialogTitle>
            <AlertDialogDescription>
              O modelo "{excluindo?.nome}" será removido. As descrições já criadas mantêm os dados
              preenchidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (excluindo) excluir.mutate(excluindo.id);
                if (excluindo?.id === selecionado) setSelecionado(null);
                setExcluindo(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
