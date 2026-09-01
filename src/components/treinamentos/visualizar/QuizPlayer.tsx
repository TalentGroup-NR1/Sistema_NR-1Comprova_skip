import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle, RotateCcw, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  useQuizPerguntas, 
  useQuizConfig,
  TreinamentoQuizPergunta,
} from "@/hooks/useTreinamentos";
import { 
  useRegistrarTentativaQuiz, 
  useMinhasTentativas,
  TreinamentoProgresso,
} from "@/hooks/useTreinamentoProgresso";

interface QuizPlayerProps {
  treinamentoId: string;
  progresso: TreinamentoProgresso;
  onQuizApproved: () => void;
}

export function QuizPlayer({ treinamentoId, progresso, onQuizApproved }: QuizPlayerProps) {
  const { data: perguntas = [], isLoading: loadingPerguntas } = useQuizPerguntas(treinamentoId);
  const { data: config } = useQuizConfig(treinamentoId);
  const { data: tentativas = [] } = useMinhasTentativas(treinamentoId);
  const registrarTentativa = useRegistrarTentativaQuiz();

  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{
    nota: number;
    acertos: number;
    total: number;
    aprovado: boolean;
  } | null>(null);

  const notaMinima = config?.nota_minima || 70;
  const tentativasMaximas = config?.tentativas_maximas || 3;
  const tentativasUsadas = progresso.quiz_tentativas || 0;
  const tentativasRestantes = tentativasMaximas === 0 ? Infinity : tentativasMaximas - tentativasUsadas;
  const podeRefazer = tentativasRestantes > 0 && !progresso.quiz_aprovado;
  const bloqueado = tentativasRestantes <= 0 && !progresso.quiz_aprovado;

  const currentPergunta = perguntas[currentIndex];
  const totalPerguntas = perguntas.length;
  const progressPercent = totalPerguntas > 0 ? ((currentIndex + 1) / totalPerguntas) * 100 : 0;

  const handleSelectResposta = (alternativaId: string) => {
    if (!currentPergunta) return;
    setRespostas(prev => ({
      ...prev,
      [currentPergunta.id]: alternativaId,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalPerguntas - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Calcular resultado
    let acertos = 0;
    perguntas.forEach(pergunta => {
      const alternativaSelecionada = respostas[pergunta.id];
      const alternativaCorreta = pergunta.alternativas?.find(a => a.is_correta);
      if (alternativaSelecionada && alternativaCorreta && alternativaSelecionada === alternativaCorreta.id) {
        acertos++;
      }
    });

    const nota = totalPerguntas > 0 ? (acertos / totalPerguntas) * 100 : 0;
    const aprovado = nota >= notaMinima;

    try {
      await registrarTentativa.mutateAsync({
        treinamentoId,
        notaObtida: nota,
        totalPerguntas,
        acertos,
        aprovado,
        respostas,
      });

      setQuizResult({ nota, acertos, total: totalPerguntas, aprovado });
      
      if (aprovado) {
        onQuizApproved();
      }
    } catch (error) {
      console.error("Erro ao registrar tentativa:", error);
    }
  };

  const handleRetry = () => {
    setQuizStarted(false);
    setCurrentIndex(0);
    setRespostas({});
    setQuizResult(null);
  };

  // Se já está aprovado, mostrar mensagem de sucesso
  if (progresso.quiz_aprovado) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Quiz aprovado!</p>
              <p className="text-sm text-green-600">
                Melhor nota: {progresso.quiz_melhor_nota?.toFixed(1)}% | Tentativas: {progresso.quiz_tentativas}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se está bloqueado (excedeu tentativas)
  if (bloqueado) {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertTitle>Quiz bloqueado</AlertTitle>
        <AlertDescription>
          Você esgotou suas {tentativasMaximas} tentativas. Entre em contato com o RH para mais informações.
          <br />
          Melhor nota obtida: {progresso.quiz_melhor_nota?.toFixed(1) || 0}%
        </AlertDescription>
      </Alert>
    );
  }

  // Se tem resultado (acabou de fazer)
  if (quizResult) {
    return (
      <Card className={quizResult.aprovado ? "border-green-200" : "border-red-200"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {quizResult.aprovado ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            {quizResult.aprovado ? "Aprovado!" : "Reprovado"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{quizResult.nota.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Nota obtida</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{quizResult.acertos}/{quizResult.total}</p>
              <p className="text-sm text-muted-foreground">Acertos</p>
            </div>
          </div>
          
          {!quizResult.aprovado && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nota mínima para aprovação: {notaMinima}%
                {tentativasRestantes > 1 && (
                  <span className="block mt-1">
                    Você ainda tem {tentativasRestantes - 1} tentativa(s).
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        
        {podeRefazer && !quizResult.aprovado && (
          <CardFooter>
            <Button onClick={handleRetry} className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  // Se ainda não começou
  if (!quizStarted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz de Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Perguntas:</span>
              <span className="ml-2 font-medium">{totalPerguntas}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Nota mínima:</span>
              <span className="ml-2 font-medium">{notaMinima}%</span>
            </div>
            <div>
              <span className="text-muted-foreground">Tentativas:</span>
              <span className="ml-2 font-medium">
                {tentativasUsadas} / {tentativasMaximas === 0 ? '∞' : tentativasMaximas}
              </span>
            </div>
            {progresso.quiz_melhor_nota !== null && (
              <div>
                <span className="text-muted-foreground">Melhor nota:</span>
                <span className="ml-2 font-medium">{progresso.quiz_melhor_nota.toFixed(1)}%</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => setQuizStarted(true)} 
            className="w-full"
            disabled={loadingPerguntas || totalPerguntas === 0}
          >
            Iniciar Quiz
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Quiz em andamento
  if (!currentPergunta) {
    return <p className="text-muted-foreground">Carregando perguntas...</p>;
  }

  const respostaSelecionada = respostas[currentPergunta.id];
  const todasRespondidas = perguntas.every(p => respostas[p.id]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline">
            Pergunta {currentIndex + 1} de {totalPerguntas}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Tentativas restantes: {tentativasMaximas === 0 ? '∞' : tentativasRestantes}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        <CardTitle className="mt-4 text-lg">{currentPergunta.pergunta_texto}</CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup 
          value={respostaSelecionada || ""} 
          onValueChange={handleSelectResposta}
          className="space-y-3"
        >
          {currentPergunta.alternativas?.map((alt, index) => (
            <div 
              key={alt.id} 
              className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
              onClick={() => handleSelectResposta(alt.id)}
            >
              <RadioGroupItem value={alt.id} id={alt.id} />
              <Label htmlFor={alt.id} className="flex-1 cursor-pointer">
                <span className="font-medium mr-2">{String.fromCharCode(65 + index)})</span>
                {alt.texto_alternativa}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <Button 
          variant="outline" 
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          Anterior
        </Button>
        
        {currentIndex < totalPerguntas - 1 ? (
          <Button onClick={handleNext}>
            Próxima
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit}
            disabled={!todasRespondidas || registrarTentativa.isPending}
          >
            {registrarTentativa.isPending ? "Enviando..." : "Finalizar Quiz"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
