import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Brain, CheckCircle2, Clock, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  useMinhasAvaliacoesPsico,
  usePsicoQuestionario,
  usePsicoRespostasMutations,
} from '@/hooks/usePsicoAvaliacoes';

const ESCALAS: Record<string, string[]> = {
  likert_5: ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'],
  likert_4: ['Nunca', 'Raramente', 'Frequentemente', 'Sempre'],
  frequencia_5: ['Nunca', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'],
};

function opcoes(tipo: string) {
  return ESCALAS[tipo] ?? ESCALAS.likert_5;
}

function Runner({ atribuicaoId, onVoltar }: { atribuicaoId: string; onVoltar: () => void }) {
  const { data: q, isLoading } = usePsicoQuestionario(atribuicaoId);
  const { salvarRascunho, enviar } = usePsicoRespostasMutations(atribuicaoId);
  const [respostas, setRespostas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (q) setRespostas(q.rascunho ?? {});
  }, [q]);

  const perguntas = useMemo(
    () => (q?.instrumento?.dimensoes ?? []).flatMap((d) => d.perguntas),
    [q]
  );
  const respondidas = perguntas.filter((p) => respostas[p.id] != null).length;
  const pct = perguntas.length ? Math.round((respondidas / perguntas.length) * 100) : 0;
  const readOnly = q?.status === 'preenchido';

  const submeter = async () => {
    if (respondidas < perguntas.length) {
      toast({
        title: 'Responda todas as perguntas',
        description: `${perguntas.length - respondidas} pergunta(s) pendente(s).`,
        variant: 'destructive',
      });
      return;
    }
    await enviar.mutateAsync(respostas);
    onVoltar();
  };

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (!q) return null;

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onVoltar}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <div>
        <h2 className="text-xl font-bold">{q.titulo}</h2>
        <p className="text-sm text-muted-foreground">{q.instrumento.nome}</p>
      </div>

      <Alert>
        <Lock className="h-4 w-4" />
        <AlertTitle>Suas respostas são anônimas</AlertTitle>
        <AlertDescription>
          Os resultados são analisados apenas de forma agregada por grupo, nunca individualmente.
        </AlertDescription>
      </Alert>

      {readOnly && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Questionário já respondido</AlertTitle>
          <AlertDescription>Obrigado por participar desta avaliação.</AlertDescription>
        </Alert>
      )}

      {!readOnly && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {respondidas} de {perguntas.length} respondidas
            </span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
        </div>
      )}

      <div className="space-y-4">
        {q.instrumento.dimensoes.map((d) => (
          <Card key={d.id} className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">{d.nome}</CardTitle>
              {d.descricao && (
                <p className="text-sm text-muted-foreground">{d.descricao}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {d.perguntas.map((p) => (
                <div key={p.id} className="space-y-2">
                  <p className="text-sm font-medium">{p.texto_pergunta}</p>
                  <RadioGroup
                    value={respostas[p.id] != null ? String(respostas[p.id]) : ''}
                    onValueChange={(v) =>
                      !readOnly && setRespostas((r) => ({ ...r, [p.id]: Number(v) }))
                    }
                    disabled={readOnly}
                    className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
                  >
                    {opcoes(p.tipo_escala).map((label, idx) => {
                      const valor = idx + 1;
                      const id = `${p.id}-${valor}`;
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-2 rounded-lg border p-2 text-sm"
                        >
                          <RadioGroupItem value={String(valor)} id={id} />
                          <Label htmlFor={id} className="cursor-pointer text-xs font-normal">
                            {label}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}

export function PsicoMinhasAvaliacoes() {
  const { data: avaliacoes = [], isLoading } = useMinhasAvaliacoesPsico();
  const [atual, setAtual] = useState<string | null>(null);

  if (atual) return <Runner atribuicaoId={atual} onVoltar={() => setAtual(null)} />;

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  if (avaliacoes.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
          <Brain className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Nenhuma avaliação psicossocial pendente</p>
          <p className="text-sm text-muted-foreground">
            Quando o RH abrir uma campanha para o seu grupo, ela aparecerá aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {avaliacoes.map((a) => (
        <Card key={a.atribuicao_id} className="rounded-xl transition-shadow hover:shadow-md">
          <CardContent className="flex items-start justify-between gap-3 pt-5">
            <div className="space-y-1">
              <p className="font-medium">{a.titulo}</p>
              <p className="text-xs text-muted-foreground">
                {a.instrumento_nome} · {a.total_perguntas} perguntas
              </p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Até {new Date(`${a.data_fim}T12:00:00`).toLocaleDateString('pt-BR')}
              </p>
              <Badge variant={a.status === 'preenchido' ? 'default' : 'secondary'}>
                {a.status === 'preenchido'
                  ? 'Respondido'
                  : a.status === 'em_andamento'
                    ? 'Em andamento'
                    : 'Pendente'}
              </Badge>
            </div>
            <Button size="sm" onClick={() => setAtual(a.atribuicao_id)}>
              {a.status === 'preenchido' ? 'Visualizar' : 'Responder'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
