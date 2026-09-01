import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, ArrowLeft, Info } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QuestionarioRunner } from '@/components/estrutura-organizacional/QuestionarioRunner';
import { PsicoMinhasAvaliacoes } from '@/components/mapa-riscos/psico/PsicoMinhasAvaliacoes';
import {
  useMinhasAtividades,
  useQuestionarioColaborador,
  useRespostasMutations,
} from '@/hooks/useMinhasAtividades';
import type { AtribuicaoStatus } from '@/hooks/useQuestionarioAtribuicoes';
import { toast } from '@/hooks/use-toast';

const STATUS_META: Record<AtribuicaoStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  pendente: { label: 'Pendente', variant: 'destructive' as never },
  em_andamento: { label: 'Em andamento', variant: 'secondary' },
  preenchido: { label: 'Preenchido', variant: 'default' },
};

export default function MinhasAtividades() {
  const [params, setParams] = useSearchParams();
  const atribuicaoId = params.get('a');
  const { data: atividades = [], isLoading } = useMinhasAtividades();
  const { data: questionario, isLoading: carregandoQ } = useQuestionarioColaborador(atribuicaoId);
  const { salvarRascunho, enviar } = useRespostasMutations(atribuicaoId);

  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  const [lendoInstrucoes, setLendoInstrucoes] = useState(true);

  useEffect(() => {
    if (questionario) {
      setRespostas(questionario.respostas ?? {});
      setLendoInstrucoes(questionario.status !== 'preenchido');
    }
  }, [questionario]);

  const readOnly = questionario?.status === 'preenchido';

  const faltando = useMemo(() => {
    if (!questionario) return [];
    return questionario.secoes
      .flatMap((s) => s.perguntas)
      .filter((p) => {
        if (!p.obrigatorio) return false;
        const v = respostas[p.id];
        if (Array.isArray(v)) return v.length === 0;
        return !v || String(v).trim() === '';
      })
      .map((p) => p.titulo);
  }, [questionario, respostas]);

  const submeter = async () => {
    if (faltando.length > 0) {
      toast({
        title: 'Responda as perguntas obrigatórias',
        description: faltando.slice(0, 3).join(' · '),
        variant: 'destructive',
      });
      return;
    }
    await enviar.mutateAsync(respostas);
    setParams({});
  };

  if (atribuicaoId) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => setParams({})}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>

          {carregandoQ && <p className="text-muted-foreground">Carregando questionário...</p>}

          {questionario && (
            <>
              <div>
                <h1 className="text-2xl font-bold">{questionario.titulo}</h1>
                <p className="text-muted-foreground">
                  Questionário de análise de cargo — suas respostas ajudam a construir a descrição
                  da função.
                </p>
              </div>

              {lendoInstrucoes ? (
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Info className="h-5 w-5 text-primary" /> Instruções
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {questionario.instrucoes ||
                        'Leia cada pergunta com atenção e responda pensando no cargo, não na sua pessoa.'}
                    </p>
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm">
                      <p className="mb-2 font-medium">Identificação (preenchida automaticamente)</p>
                      <div className="grid gap-1 md:grid-cols-2">
                        {Object.entries(questionario.identificacao)
                          .filter(([, v]) => !!v)
                          .map(([k, v]) => (
                            <div key={k} className="flex gap-2">
                              <span className="capitalize text-muted-foreground">
                                {k.replace('_', ' ')}:
                              </span>
                              <span className="font-medium">{v}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                    <Button onClick={() => setLendoInstrucoes(false)}>Começar a responder</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {readOnly && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Questionário enviado</AlertTitle>
                      <AlertDescription>
                        Suas respostas já foram enviadas ao RH. Caso precise alterar algo, solicite
                        a reabertura.
                      </AlertDescription>
                    </Alert>
                  )}

                  <QuestionarioRunner
                    secoes={questionario.secoes}
                    respostas={respostas}
                    onChange={setRespostas}
                    readOnly={readOnly}
                  />

                  {!readOnly && (
                    <div className="sticky bottom-4 flex justify-end gap-2 rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur">
                      <Button
                        variant="outline"
                        onClick={() => salvarRascunho.mutate(respostas)}
                        disabled={salvarRascunho.isPending}
                      >
                        Salvar rascunho
                      </Button>
                      <Button onClick={submeter} disabled={enviar.isPending}>
                        Enviar respostas
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-7 w-7 text-primary" />
            Minhas Atividades
          </h1>
          <p className="text-muted-foreground">
            Questionários habilitados para você
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Descrição de cargo</h2>

          {isLoading && <p className="text-muted-foreground">Carregando...</p>}

          {!isLoading && atividades.length === 0 && (
            <Card className="rounded-xl">
              <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground" />
                <p className="font-medium">Nenhum questionário pendente</p>
                <p className="text-sm text-muted-foreground">
                  Quando o RH habilitar um questionário para você, ele aparecerá aqui.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {atividades.map((a) => (
              <Card key={a.id} className="rounded-xl transition-shadow hover:shadow-md">
                <CardContent className="flex items-start justify-between gap-3 pt-5">
                  <div className="space-y-1">
                    <p className="font-medium">{a.titulo}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Recebido em {new Date(a.data_atribuicao).toLocaleDateString('pt-BR')}
                    </p>
                    <Badge variant={STATUS_META[a.status].variant}>
                      {STATUS_META[a.status].label}
                    </Badge>
                  </div>
                  <Button size="sm" onClick={() => setParams({ a: a.id })}>
                    {a.status === 'preenchido' ? 'Visualizar' : 'Responder'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Avaliações psicossociais (NR-1)</h2>
            <p className="text-sm text-muted-foreground">
              Respostas anônimas, analisadas apenas de forma agregada por grupo
            </p>
          </div>
          <PsicoMinhasAvaliacoes />
        </section>
      </div>
    </MainLayout>
  );
}
