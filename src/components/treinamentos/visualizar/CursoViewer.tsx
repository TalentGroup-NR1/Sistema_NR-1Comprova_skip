import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Treinamento } from "@/hooks/useTreinamentos";
import { TreinamentoModulo } from "@/hooks/useTreinamentoCurriculo";
import { useMeuProgressoAulas, useMarcarAula } from "@/hooks/useAulaProgresso";
import {
  useMeuProgresso,
  useGetOrCreateProgresso,
  useConcluirTreinamento,
  TreinamentoProgresso,
} from "@/hooks/useTreinamentoProgresso";
import { CursoSidebar } from "./CursoSidebar";
import { AulaPlayer } from "./AulaPlayer";
import { QuizPlayer } from "./QuizPlayer";
import { TermoCiencia } from "./TermoCiencia";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, Lock } from "lucide-react";

interface Props {
  treinamento: Treinamento;
  modulos: TreinamentoModulo[];
}

export function CursoViewer({ treinamento, modulos }: Props) {
  const navigate = useNavigate();
  const aulas = useMemo(() => modulos.flatMap((m) => m.aulas), [modulos]);
  const [aulaAtualId, setAulaAtualId] = useState<string | null>(aulas[0]?.id ?? null);

  const { data: progressoAulas = [] } = useMeuProgressoAulas(treinamento.id);
  const marcarAula = useMarcarAula();

  const { data: progresso, refetch: refetchProgresso } = useMeuProgresso(treinamento.id);
  const getOrCreateProgresso = useGetOrCreateProgresso();
  const concluirTreinamento = useConcluirTreinamento();
  const [progressoData, setProgressoData] = useState<TreinamentoProgresso | null>(null);

  useEffect(() => {
    if (progresso) setProgressoData(progresso);
  }, [progresso]);

  useEffect(() => {
    if (progresso === null || progresso === undefined) {
      getOrCreateProgresso
        .mutateAsync({ treinamentoId: treinamento.id })
        .then((r) => setProgressoData(r))
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treinamento.id]);

  useEffect(() => {
    if (!aulaAtualId && aulas.length) setAulaAtualId(aulas[0].id);
  }, [aulas, aulaAtualId]);

  const concluidas = useMemo(
    () => new Set(progressoAulas.filter((p) => p.concluida).map((p) => p.aula_id)),
    [progressoAulas]
  );

  const percentual = aulas.length ? Math.round((concluidas.size / aulas.length) * 100) : 0;
  const aulaAtual = aulas.find((a) => a.id === aulaAtualId) ?? null;
  const indexAtual = aulas.findIndex((a) => a.id === aulaAtualId);
  const cursoCompleto = aulas.length > 0 && concluidas.size === aulas.length;

  const quizAprovado = !treinamento.quiz_obrigatorio || progressoData?.quiz_aprovado;
  const termoAceito = !treinamento.termo_ciencia_obrigatorio || progressoData?.termo_aceito;
  const jaConcluido = progressoData?.status === "concluido";
  const podeConcluir = cursoCompleto && quizAprovado && termoAceito && !jaConcluido;

  const toggleAula = async (concluida: boolean) => {
    if (!aulaAtual) return;
    await marcarAula.mutateAsync({ aulaId: aulaAtual.id, treinamentoId: treinamento.id, concluida });
  };

  const irPara = (delta: number) => {
    const next = aulas[indexAtual + delta];
    if (next) setAulaAtualId(next.id);
  };

  const handleConcluir = async () => {
    if (!progressoData?.id || !podeConcluir) return;
    await concluirTreinamento.mutateAsync({ progressoId: progressoData.id, treinamentoId: treinamento.id });
    refetchProgresso();
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/treinamentos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{treinamento.titulo}</h1>
          <p className="text-muted-foreground">
            {treinamento.categoria?.nome || "Curso"} • {modulos.length} módulos • {aulas.length} aulas
          </p>
        </div>
        {jaConcluido ? (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Concluído
          </Badge>
        ) : (
          <Badge variant="outline">{percentual}% concluído</Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {aulaAtual ? (
            <>
              <div>
                <h2 className="text-lg font-semibold">{aulaAtual.titulo}</h2>
                {aulaAtual.resumo && <p className="text-sm text-muted-foreground">{aulaAtual.resumo}</p>}
              </div>

              <AulaPlayer aula={aulaAtual} />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => irPara(-1)} disabled={indexAtual <= 0}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Anterior
                  </Button>
                  <Button variant="outline" onClick={() => irPara(1)} disabled={indexAtual >= aulas.length - 1}>
                    Próxima
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                {concluidas.has(aulaAtual.id) ? (
                  <Button variant="ghost" onClick={() => toggleAula(false)}>
                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                    Aula concluída (desmarcar)
                  </Button>
                ) : (
                  <Button
                    onClick={async () => {
                      await toggleAula(true);
                      irPara(1);
                    }}
                    disabled={marcarAula.isPending}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Marcar como concluída
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Alert>
              <AlertDescription>Este curso ainda não possui aulas cadastradas.</AlertDescription>
            </Alert>
          )}

          {treinamento.quiz_obrigatorio && progressoData && (
            <>
              <Separator />
              {cursoCompleto ? (
                <QuizPlayer
                  treinamentoId={treinamento.id}
                  progresso={progressoData}
                  onQuizApproved={() => refetchProgresso()}
                />
              ) : (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>O quiz será liberado após a conclusão de todas as aulas.</AlertDescription>
                </Alert>
              )}
            </>
          )}

          {treinamento.termo_ciencia_obrigatorio && progressoData && (
            <>
              <Separator />
              {cursoCompleto && quizAprovado ? (
                <TermoCiencia
                  progressoId={progressoData.id}
                  treinamentoId={treinamento.id}
                  progresso={progressoData}
                  textoTermo={treinamento.texto_termo_ciencia}
                  onTermoAceito={() => refetchProgresso()}
                />
              ) : (
                <Alert>
                  <Lock className="h-4 w-4" />
                  <AlertDescription>
                    O termo de ciência será liberado após concluir as aulas{treinamento.quiz_obrigatorio ? " e o quiz" : ""}.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {podeConcluir && (
            <Card>
              <CardContent className="pt-6">
                <Button className="w-full" onClick={handleConcluir} disabled={concluirTreinamento.isPending}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Concluir treinamento
                </Button>
              </CardContent>
            </Card>
          )}

          {jaConcluido && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-base text-green-800">Treinamento concluído</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-green-700">
                Parabéns! Você finalizou todas as aulas deste curso.
              </CardContent>
            </Card>
          )}
        </div>

        <CursoSidebar
          modulos={modulos}
          aulaAtualId={aulaAtualId}
          concluidas={concluidas}
          onSelecionar={setAulaAtualId}
          percentual={percentual}
          totalAulas={aulas.length}
        />
      </div>
    </div>
  );
}
