import { useState } from "react";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Lock,
  AlertCircle,
  Check,
  X,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TreinamentoProgresso } from "@/hooks/useTreinamentoProgresso";
import {
  useQuizPerguntas,
  useTentativasQuiz,
  useEnviarQuiz,
  QuizResultadoCorrecao,
} from "@/hooks/useQuizTreinamento";

interface QuizPlayerProps {
  treinamentoId: string;
  progresso?: TreinamentoProgresso | null;
  onQuizApproved?: () => void;
  notaMinima?: number;
  tentativasMaximas?: number;
  aulasCompletas?: boolean;
  totalAulas?: number;
  aulasConcluidas?: number;
}

export function QuizPlayer({
  treinamentoId,
  progresso,
  onQuizApproved,
  notaMinima = 70,
  tentativasMaximas = 3,
  aulasCompletas = true,
  totalAulas = 0,
  aulasConcluidas = 0,
}: QuizPlayerProps) {
  // Hooks de quiz
  const { data: perguntas = [], isLoading: loadingPerguntas } = useQuizPerguntas(treinamentoId);
  const { data: tentativasData, isLoading: loadingTentativas } = useTentativasQuiz(treinamentoId);
  const enviarQuiz = useEnviarQuiz();

  // Estados locais da tentativa
  const [emAndamento, setEmAndamento] = useState(false);
  const [confirmSairOpen, setConfirmSairOpen] = useState(false);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<QuizResultadoCorrecao | null>(null);

  const totalPerguntas = perguntas.length;
  const tentativasUsadas = tentativasData?.totalTentativas ?? (progresso?.quiz_tentativas || 0);
  const melhorNota = tentativasData?.melhorNota ?? progresso?.quiz_melhor_nota ?? null;
  const jaAprovado = Boolean(tentativasData?.jaAprovado || progresso?.quiz_aprovado);
  const tentativasRestantes =
    tentativasMaximas === 0 ? Infinity : Math.max(0, tentativasMaximas - tentativasUsadas);
  const tentativasEsgotadas = tentativasMaximas > 0 && tentativasRestantes <= 0 && !jaAprovado;

  // Selecionar resposta para uma questão
  const handleSelectResposta = (perguntaId: string, valor: string) => {
    setRespostas((prev) => ({
      ...prev,
      [perguntaId]: valor,
    }));
  };

  // Enviar para correção server-side
  const handleEnviar = async () => {
    try {
      const res = await enviarQuiz.mutateAsync({
        treinamentoId,
        respostas,
      });

      setResultado(res);
      setEmAndamento(false);

      if (res.aprovado) {
        onQuizApproved?.();
      }
    } catch (err) {
      console.error("Erro ao enviar quiz:", err);
    }
  };

  const handleTentarNovamente = () => {
    setRespostas({});
    setResultado(null);
    setEmAndamento(true);
  };

  const handleContinuarAprovado = () => {
    setResultado(null);
    onQuizApproved?.();
  };

  // Helper para extrair valor e label de cada alternativa
  const extrairAlternativa = (alt: any, index: number) => {
    const letraPadrao = String.fromCharCode(65 + index);
    if (typeof alt === "string") {
      return { valor: alt, label: alt, letra: letraPadrao };
    }
    const valor = alt.id || alt.letra || alt.texto || String(alt);
    const label = alt.texto || alt.label || alt.letra || String(alt);
    const letra = alt.letra || letraPadrao;
    return { valor, label, letra };
  };

  // ==========================================
  // ESTADO 1: BLOQUEADO (Aulas Pendentes)
  // ==========================================
  if (!aulasCompletas) {
    return (
      <Alert className="border-muted bg-muted/30">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <AlertTitle className="text-sm font-semibold text-muted-foreground">Avaliação bloqueada</AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground mt-1">
          Conclua todas as aulas para liberar a avaliação. ({aulasConcluidas} de {totalAulas} aulas)
        </AlertDescription>
      </Alert>
    );
  }

  // ==========================================
  // ESTADO 2: TELA DE RESULTADO COM GABARITO (Pós-Envio)
  // ==========================================
  if (resultado) {
    return (
      <Card
        className={
          resultado.aprovado
            ? "border-green-200 bg-green-50/40 dark:bg-green-950/20"
            : "border-red-200 bg-red-50/40 dark:bg-red-950/20"
        }
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {resultado.aprovado ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <div>
                <CardTitle className="text-lg">
                  {resultado.aprovado ? "Aprovado na Avaliação!" : "Reprovado na Avaliação"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Tentativa {tentativasUsadas} de {tentativasMaximas === 0 ? "∞" : tentativasMaximas}
                  {resultado.tentativas_restantes > 0 && ` • ${resultado.tentativas_restantes} restante(s)`}
                </p>
              </div>
            </div>
            <Badge
              className={
                resultado.aprovado
                  ? "bg-green-600 text-white text-xs"
                  : "bg-red-600 text-white text-xs"
              }
            >
              {resultado.aprovado ? "APROVADO" : "REPROVADO"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Métricas da Nota */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-background/80 rounded-xl border">
              <p className="text-2xl font-bold">{resultado.nota.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Nota obtida (mínimo {resultado.nota_minima}%)</p>
            </div>
            <div className="p-4 bg-background/80 rounded-xl border">
              <p className="text-2xl font-bold">
                {resultado.acertos} / {resultado.total_perguntas}
              </p>
              <p className="text-xs text-muted-foreground">Acertos</p>
            </div>
          </div>

          {/* Gabarito Detalhado com Explicações */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Gabarito da Avaliação
              </h4>
              <span className="text-xs text-muted-foreground">
                {resultado.acertos} corretas de {resultado.total_perguntas}
              </span>
            </div>

            <div className="space-y-3">
              {resultado.gabarito.map((item, idx) => (
                <div
                  key={item.pergunta_id || idx}
                  className={`p-4 rounded-xl border text-sm space-y-2 ${
                    item.correta
                      ? "border-green-200 bg-green-50/30 dark:bg-green-950/10"
                      : "border-red-200 bg-red-50/30 dark:bg-red-950/10"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {item.correta ? (
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-green-100 text-green-700 shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-red-100 text-red-700 shrink-0 mt-0.5">
                        <X className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {idx + 1}. {item.enunciado}
                      </p>
                      <div className="mt-2 space-y-1 text-xs">
                        <p className={item.correta ? "text-green-800 dark:text-green-300 font-medium" : "text-red-700 font-medium"}>
                          Sua resposta: {item.resposta_usuario || "(não respondida)"}
                        </p>
                        {!item.correta && (
                          <p className="text-green-800 dark:text-green-300 font-medium">
                            Resposta correta: {item.resposta_correta}
                          </p>
                        )}
                        {item.explicacao && (
                          <div className="p-2.5 rounded-lg bg-background/90 border mt-2 text-muted-foreground">
                            <strong>Explicação:</strong> {item.explicacao}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          {resultado.aprovado ? (
            <Button onClick={handleContinuarAprovado} className="w-full gap-2">
              Continuar <ArrowRight className="h-4 w-4" />
            </Button>
          ) : resultado.tentativas_restantes > 0 ? (
            <Button onClick={handleTentarNovamente} className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Tentar novamente ({resultado.tentativas_restantes} tentativa(s) restante(s))
            </Button>
          ) : (
            <div className="w-full text-center space-y-1">
              <Badge variant="destructive" className="mx-auto">Tentativas esgotadas</Badge>
              <p className="text-xs text-muted-foreground pt-1">
                Você atingiu o limite de tentativas. Contate o RH para orientações.
              </p>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  }

  // ==========================================
  // ESTADO 3: JÁ APROVADO (Sessão Anterior)
  // ==========================================
  if (jaAprovado && !emAndamento) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-green-900 dark:text-green-100">
                Avaliação Aprovada
              </h4>
              <p className="text-xs text-green-800 dark:text-green-300">
                Aprovado com nota {melhorNota ? melhorNota.toFixed(1) : "100"}%. Tentativas usadas: {tentativasUsadas} de{" "}
                {tentativasMaximas === 0 ? "∞" : tentativasMaximas}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ==========================================
  // ESTADO 4: ESGOTADO (Sem Tentativas Restantes)
  // ==========================================
  if (tentativasEsgotadas && !emAndamento) {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertTitle className="text-sm font-semibold">Tentativas esgotadas</AlertTitle>
        <AlertDescription className="text-xs space-y-1 mt-1">
          <p>
            Você utilizou todas as {tentativasMaximas} tentativas permitidas. Nota final:{" "}
            {melhorNota !== null ? `${melhorNota.toFixed(1)}%` : "0.0%"}.
          </p>
          <p className="pt-1">
            Entre em contato com o RH da sua empresa para solicitar liberação ou orientação.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // ==========================================
  // ESTADO 5: EM ANDAMENTO (Respondendo Quiz)
  // ==========================================
  if (emAndamento) {
    const respondidasCount = Object.keys(respostas).filter((k) => respostas[k]).length;
    const todasRespondidas = totalPerguntas > 0 && respondidasCount === totalPerguntas;

    return (
      <Card className="border-primary/40 shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Avaliação do Treinamento</CardTitle>
            <Badge variant="outline" className="text-xs">
              {respondidasCount} de {totalPerguntas} respondidas
            </Badge>
          </div>
          <Progress value={totalPerguntas > 0 ? (respondidasCount / totalPerguntas) * 100 : 0} className="h-1.5 mt-2" />
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {totalPerguntas === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma pergunta encontrada para esta avaliação.</p>
          ) : (
            perguntas.map((perg, pIdx) => {
              const respostaAtual = respostas[perg.id] || "";
              const alternativas = perg.alternativas || [];

              return (
                <div key={perg.id} className="space-y-3 p-4 rounded-xl border border-border/70 bg-card">
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10 shrink-0">
                      Questão {pIdx + 1}
                    </span>
                    <p className="text-sm font-medium text-foreground leading-relaxed">
                      {perg.enunciado}
                    </p>
                  </div>

                  <RadioGroup
                    value={respostaAtual}
                    onValueChange={(val) => handleSelectResposta(perg.id, val)}
                    className="space-y-2 pt-2"
                  >
                    {alternativas.map((alt, aIdx) => {
                      const { valor, label, letra } = extrairAlternativa(alt, aIdx);
                      const isSelected = respostaAtual === valor;

                      return (
                        <div
                          key={valor}
                          onClick={() => handleSelectResposta(perg.id, valor)}
                          className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer text-xs ${
                            isSelected
                              ? "border-primary bg-primary/5 text-foreground font-medium"
                              : "hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <RadioGroupItem value={valor} id={`opt-${perg.id}-${valor}`} />
                          <Label htmlFor={`opt-${perg.id}-${valor}`} className="flex-1 cursor-pointer">
                            <span className="font-semibold mr-1.5 text-primary">{letra})</span>
                            {label}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              );
            })
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (respondidasCount > 0) {
                setConfirmSairOpen(true);
              } else {
                setEmAndamento(false);
              }
            }}
            disabled={enviarQuiz.isPending}
          >
            Sair da avaliação
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleEnviar}
            disabled={!todasRespondidas || enviarQuiz.isPending}
            className="gap-2"
          >
            {enviarQuiz.isPending ? "Corrigindo no servidor..." : "Enviar respostas"}
          </Button>
        </CardFooter>

        {/* Confirmação ao sair */}
        <AlertDialog open={confirmSairOpen} onOpenChange={setConfirmSairOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sair sem enviar?</AlertDialogTitle>
              <AlertDialogDescription>
                Você já preencheu respostas. Se sair agora, suas respostas não serão salvas e nenhuma tentativa será consumida.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuar avaliação</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmSairOpen(false);
                  setEmAndamento(false);
                  setRespostas({});
                }}
              >
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  // ==========================================
  // ESTADO 6: DISPONÍVEL (Pronto para Iniciar)
  // ==========================================
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Avaliação do Treinamento</CardTitle>
        <p className="text-xs text-muted-foreground">
          Avaliação disponível — nota mínima {notaMinima}%, até {tentativasMaximas === 0 ? "ilimitadas" : tentativasMaximas} tentativas.
        </p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-muted/40 rounded-lg border">
            <span className="text-muted-foreground block">Questões</span>
            <span className="font-semibold text-foreground text-sm">
              {loadingPerguntas ? "..." : totalPerguntas}
            </span>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg border">
            <span className="text-muted-foreground block">Nota mínima</span>
            <span className="font-semibold text-foreground text-sm">{notaMinima}%</span>
          </div>
          <div className="p-3 bg-muted/40 rounded-lg border">
            <span className="text-muted-foreground block">Tentativas</span>
            <span className="font-semibold text-foreground text-sm">
              {tentativasUsadas} de {tentativasMaximas === 0 ? "∞" : tentativasMaximas}
            </span>
          </div>
        </div>

        {melhorNota !== null && (
          <p className="text-xs text-muted-foreground">
            Sua melhor nota anterior: <strong>{melhorNota.toFixed(1)}%</strong>
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => {
            setRespostas({});
            setResultado(null);
            setEmAndamento(true);
          }}
          disabled={loadingPerguntas || totalPerguntas === 0}
          className="w-full sm:w-auto"
        >
          Iniciar avaliação
        </Button>
      </CardFooter>
    </Card>
  );
}
