import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FormularioIndisponivelScreen } from '@/components/auth/FormularioIndisponivelScreen';
import { verificarModuloTokenAtivo, isErroModuloDesativado } from '@/lib/validarModuloToken';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  scale_min: number;
  scale_max: number;
  respondent_type: string;
  order_index: number;
}

interface FeedbackFormData {
  cycle_id: string;
  colaborador_name: string;
  milestone_type: string;
  respondent_type: string;
  template_id: string;
  already_submitted: boolean;
  questions: Question[] | null;
  questionnaire_configured: boolean;
}

export default function FeedbackForm() {
  const { token, slug } = useParams<{ token: string; slug?: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FeedbackFormData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, { numeric?: number; text?: string }>>({});
  const [moduloDesabilitado, setModuloDesabilitado] = useState(false);

  useEffect(() => {
    if (token) loadFormData();
  }, [token]);

  const loadFormData = async () => {
    try {
      // Validação de governança de módulo contratado
      const moduloAtivo = await verificarModuloTokenAtivo('/feedback-gestao', {
        token,
        slug,
        tabelaOrigem: 'feedback',
      });

      if (!moduloAtivo) {
        setModuloDesabilitado(true);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('get_feedback_cycle_by_token', { p_token: token });
      if (error) throw error;
      if (!data || data.length === 0) {
        setError('Link inválido ou expirado');
        return;
      }

      const row = data[0];
      const cycleData: FeedbackFormData = {
        cycle_id: row.cycle_id,
        colaborador_name: row.colaborador_name,
        milestone_type: row.milestone_type,
        respondent_type: row.respondent_type,
        template_id: row.template_id,
        already_submitted: row.already_submitted,
        questions: (row.questions as unknown) as Question[] | null,
        questionnaire_configured:
          (row as { questionnaire_configured?: boolean }).questionnaire_configured ?? true,
      };

      if (cycleData.already_submitted) {
        setSubmitted(true);
        setFormData(cycleData);
        return;
      }

      setFormData(cycleData);
      setQuestions(cycleData.questions || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar formulário');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    const responses = questions.map(q => ({
      question_id: q.id,
      answer_value_numeric: answers[q.id]?.numeric || null,
      answer_value_text: answers[q.id]?.text || null,
    }));

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('submit_feedback_responses', {
        p_token: token,
        p_responses: responses,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Feedback enviado com sucesso!');
    } catch (err: any) {
      if (isErroModuloDesativado(err)) {
        setModuloDesabilitado(true);
        return;
      }
      toast.error(err.message || 'Erro ao enviar feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const getMilestoneLabel = (type: string) => {
    switch (type) {
      case '30_DIAS': return '30 Dias';
      case '80_DIAS': return '80 Dias';
      case '120_DIAS': return '120 Dias';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-8" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (moduloDesabilitado) {
    return <FormularioIndisponivelScreen moduloNome="Feedback Contínuo & 1:1" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-bold mb-2">Erro</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 mx-auto text-success mb-4" />
            <h1 className="text-xl font-bold mb-2">Feedback Enviado!</h1>
            <p className="text-muted-foreground mb-6">Obrigado por responder o questionário.</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (formData && (!formData.questionnaire_configured || questions.length === 0)) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <CardContent className="p-8">
            <AlertCircle className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-bold mb-2">Questionário ainda não configurado</h1>
            <p className="text-muted-foreground">
              Este marco do Diário de Bordo ainda não possui perguntas cadastradas. Entre em
              contato com o RH.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Diário de Bordo - {getMilestoneLabel(formData?.milestone_type || '')}</CardTitle>
            <p className="text-muted-foreground">
              Colaborador: <strong>{formData?.colaborador_name}</strong>
            </p>
          </CardHeader>
        </Card>

        {questions.map((question) => (
          <Card key={question.id}>
            <CardContent className="p-6">
              <Label className="text-base font-medium mb-4 block">{question.question_text}</Label>

              {question.question_type === 'ESCALA_NUMERICA' && (
                <div className="space-y-4">
                  <Slider
                    value={[answers[question.id]?.numeric || question.scale_min]}
                    onValueChange={([value]) => setAnswers({ ...answers, [question.id]: { numeric: value } })}
                    min={question.scale_min}
                    max={question.scale_max}
                    step={1}
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{question.scale_min}</span>
                    <span className="font-bold text-lg text-foreground">{answers[question.id]?.numeric || question.scale_min}</span>
                    <span>{question.scale_max}</span>
                  </div>
                </div>
              )}

              {question.question_type === 'SIM_NAO' && (
                <RadioGroup
                  value={answers[question.id]?.text || ''}
                  onValueChange={(value) => setAnswers({ ...answers, [question.id]: { text: value } })}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Sim" id={`${question.id}-sim`} />
                    <Label htmlFor={`${question.id}-sim`}>Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Não" id={`${question.id}-nao`} />
                    <Label htmlFor={`${question.id}-nao`}>Não</Label>
                  </div>
                </RadioGroup>
              )}

              {question.question_type === 'TEXTO_LIVRE' && (
                <Textarea
                  value={answers[question.id]?.text || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: { text: e.target.value } })}
                  placeholder="Digite sua resposta..."
                  className="min-h-[100px]"
                />
              )}
            </CardContent>
          </Card>
        ))}

        <Button onClick={handleSubmit} disabled={submitting} className="w-full" size="lg">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enviar Feedback
        </Button>
      </div>
    </div>
  );
}
