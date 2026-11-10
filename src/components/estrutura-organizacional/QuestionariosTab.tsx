import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  useQuestionarioModelos,
  useModeloEstrutura,
  useModeloMutations,
  type QuestionarioModelo,
} from '@/hooks/useQuestionarioModelos';
import { QuestionarioEditor } from './QuestionarioEditor';
import { INSTRUCOES_PADRAO, modeloPadraoSecoes, type QSecao } from '@/lib/questionarioCargo';

interface Props {
  companyId: string;
  podeEditar: boolean;
  podeExcluir: boolean;
}

export function QuestionariosTab({ companyId, podeEditar, podeExcluir }: Props) {
  const { data: modelos = [], isLoading } = useQuestionarioModelos(companyId);
  const { salvarModelo, excluirModelo, salvarEstrutura, duplicarModelo } =
    useModeloMutations(companyId);

  const [selecionado, setSelecionado] = useState<string | null>(null);
  const { data: estruturaSalva } = useModeloEstrutura(selecionado);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [secoes, setSecoes] = useState<QSecao[]>([]);
  const [excluindo, setExcluindo] = useState<QuestionarioModelo | null>(null);

  const modelo = modelos.find((m) => m.id === selecionado) ?? null;

  useEffect(() => {
    if (modelo) {
      setNome(modelo.nome);
      setDescricao(modelo.descricao ?? '');
      setInstrucoes(modelo.instrucoes ?? '');
    }
  }, [modelo]);

  useEffect(() => {
    if (estruturaSalva) setSecoes(estruturaSalva);
  }, [estruturaSalva]);

  const criarModelo = async (comPadrao: boolean) => {
    const id = await salvarModelo.mutateAsync({
      values: {
        nome: comPadrao ? 'Questionário de Análise de Cargos' : 'Novo questionário',
        descricao: comPadrao ? 'Modelo baseado no formulário padrão de análise de cargos' : null,
        instrucoes: INSTRUCOES_PADRAO,
        ativo: true,
      },
    });
    if (comPadrao) {
      await salvarEstrutura.mutateAsync({ modeloId: id, secoes: modeloPadraoSecoes() });
    }
    setSelecionado(id);
  };

  const salvarTudo = async () => {
    if (!selecionado) return;
    await salvarModelo.mutateAsync({
      id: selecionado,
      values: { nome, descricao, instrucoes },
    });
    await salvarEstrutura.mutateAsync({ modeloId: selecionado, secoes });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Modelos de questionário</CardTitle>
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
              {!m.ativo && <Badge variant="secondary">Inativo</Badge>}
            </button>
          ))}

          {podeEditar && (
            <div className="space-y-2 pt-2">
              <Button className="w-full" variant="default" onClick={() => criarModelo(true)}>
                <Sparkles className="mr-2 h-4 w-4" /> Criar com modelo padrão
              </Button>
              <Button className="w-full" variant="outline" onClick={() => criarModelo(false)}>
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
              Selecione ou crie um modelo para editar as perguntas.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="rounded-xl">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-base">Dados do modelo</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => duplicarModelo.mutate({ modelo, secoes })}
                  >
                    <Copy className="mr-2 h-4 w-4" /> Duplicar
                  </Button>
                  {podeExcluir && (
                    <Button variant="outline" size="sm" onClick={() => setExcluindo(modelo)}>
                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
                    </Button>
                  )}
                  {podeEditar && (
                    <Button size="sm" onClick={salvarTudo} disabled={salvarEstrutura.isPending}>
                      Salvar modelo
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>Nome</Label>
                    <Input disabled={!podeEditar} value={nome} onChange={(e) => setNome(e.target.value)} />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input
                      disabled={!podeEditar}
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Instruções exibidas ao colaborador</Label>
                  <Textarea
                    rows={8}
                    disabled={!podeEditar}
                    value={instrucoes}
                    onChange={(e) => setInstrucoes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <QuestionarioEditor secoes={secoes} onChange={setSecoes} readOnly={!podeEditar} />

            {podeEditar && (
              <div className="flex justify-end">
                <Button onClick={salvarTudo} disabled={salvarEstrutura.isPending}>
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
              O modelo "{excluindo?.nome}" será removido. Questionários já enviados a colaboradores
              não são afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (excluindo) excluirModelo.mutate(excluindo.id);
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
