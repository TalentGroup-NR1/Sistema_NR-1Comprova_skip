import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Heart, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Pergunta {
  id: string;
  pergunta_texto: string;
  tipo_pergunta: 'LIKERT_5' | 'TEXTO_LIVRE';
  order_index: number;
  dimensao_codigo?: string;
  dimensao_titulo?: string;
}

interface EscalaItem {
  valor: number;
  rotulo: string;
}

interface QuestionarioData {
  questionario_id: string;
  titulo: string;
  descricao: string | null;
  colaborador_name: string;
  already_submitted: boolean;
  perguntas: Pergunta[];
  modelo_analise?: 'PADRAO' | 'MATRIZ_RISCOS';
  escala_config?: EscalaItem[];
  dimensoes?: { codigo: string; titulo: string; descricao?: string }[];
}

const DEFAULT_LIKERT_OPTIONS: EscalaItem[] = [
  { valor: 1, rotulo: "Discordo Totalmente" },
  { valor: 2, rotulo: "Discordo" },
  { valor: 3, rotulo: "Neutro" },
  { valor: 4, rotulo: "Concordo" },
  { valor: 5, rotulo: "Concordo Totalmente" },
];

export default function CuidarMaisForm() {
  const { token } = useParams<{ token: string }>();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionario, setQuestionario] = useState<QuestionarioData | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [desejaContato, setDesejaContato] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchQuestionario = async () => {
      if (!token) {
        setError("Link inválido");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_cuidar_plus_by_token', { p_token: token });

        if (error) throw error;

        if (!data || data.length === 0) {
          setError("Questionário não encontrado ou link expirado");
          return;
        }

        const rawData = data[0];
        
        if (rawData.already_submitted) {
          setError("Este questionário já foi respondido");
          return;
        }

        // Parse perguntas from JSON to typed array
        const perguntas = (rawData.perguntas as unknown as Pergunta[]) || [];
        
        const questionarioData: QuestionarioData = {
          questionario_id: rawData.questionario_id,
          titulo: rawData.titulo,
          descricao: rawData.descricao,
          colaborador_name: rawData.colaborador_name,
          already_submitted: rawData.already_submitted,
          perguntas,
        };

        setQuestionario(questionarioData);
      } catch (err) {
        console.error("Erro ao carregar questionário:", err);
        setError("Erro ao carregar o questionário");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionario();
  }, [token]);

  const handleRespostaChange = (perguntaId: string, valor: string) => {
    setRespostas(prev => ({ ...prev, [perguntaId]: valor }));
  };

  const handleSubmit = async () => {
    if (!token || !questionario) return;

    // Validar respostas obrigatórias
    const perguntasSemResposta = questionario.perguntas.filter(
      p => !respostas[p.id] || respostas[p.id].trim() === ""
    );

    if (perguntasSemResposta.length > 0) {
      toast.error("Por favor, responda todas as perguntas");
      return;
    }

    setIsSubmitting(true);

    try {
      const respostasArray = Object.entries(respostas).map(([pergunta_id, resposta_valor]) => ({
        pergunta_id,
        resposta_valor,
      }));

      const { error } = await supabase.rpc('submit_cuidar_plus_responses', {
        p_token: token,
        p_respostas: respostasArray,
        p_deseja_contato: desejaContato,
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Respostas enviadas com sucesso!");
    } catch (err: unknown) {
      console.error("Erro ao enviar respostas:", err);
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao enviar respostas: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando questionário...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Não foi possível acessar</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Obrigado!</h2>
            <p className="text-muted-foreground mb-4">
              Suas respostas foram enviadas com sucesso.
              {desejaContato && " Nossa equipe de RH entrará em contato em breve."}
            </p>
            <p className="text-sm text-muted-foreground">
              Você pode fechar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-pink-500" />
            <span className="text-2xl font-bold">Cuidar+</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Olá, {questionario?.colaborador_name}
          </p>
        </div>

        {/* Questionário */}
        <Card>
          <CardHeader>
            <CardTitle>{questionario?.titulo}</CardTitle>
            {questionario?.descricao && (
              <CardDescription>{questionario.descricao}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {questionario?.perguntas.map((pergunta, index) => (
              <div key={pergunta.id} className="space-y-3">
                <Label className="text-base font-medium">
                  {index + 1}. {pergunta.pergunta_texto}
                </Label>

                {pergunta.tipo_pergunta === 'LIKERT_5' ? (
                  <RadioGroup
                    value={respostas[pergunta.id] || ""}
                    onValueChange={(value) => handleRespostaChange(pergunta.id, value)}
                    className="space-y-2"
                  >
                    {(questionario?.escala_config || DEFAULT_LIKERT_OPTIONS).map((option) => (
                      <div key={option.valor} className="flex items-center space-x-3">
                        <RadioGroupItem value={String(option.valor)} id={`${pergunta.id}-${option.valor}`} />
                        <Label 
                          htmlFor={`${pergunta.id}-${option.valor}`}
                          className="font-normal cursor-pointer"
                        >
                          {option.rotulo}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Textarea
                    value={respostas[pergunta.id] || ""}
                    onChange={(e) => handleRespostaChange(pergunta.id, e.target.value)}
                    placeholder="Digite sua resposta..."
                    rows={3}
                  />
                )}
              </div>
            ))}

            {/* Checkbox de contato */}
            <Alert className="mt-8">
              <AlertDescription>
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="deseja-contato"
                    checked={desejaContato}
                    onCheckedChange={(checked) => setDesejaContato(!!checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="deseja-contato" className="font-normal cursor-pointer leading-relaxed">
                    <strong>Desejo ser contatado(a)</strong> pela equipe de RH para discutir minhas respostas.
                    <br />
                    <span className="text-sm text-muted-foreground">
                      (Se você marcar esta opção, suas respostas serão vinculadas ao seu nome para que possamos entrar em contato. Caso contrário, suas respostas permanecerão anônimas.)
                    </span>
                  </Label>
                </div>
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Respostas"
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Suas respostas são confidenciais e serão utilizadas apenas para 
          melhorar o ambiente de trabalho.
        </p>
      </div>
    </div>
  );
}
