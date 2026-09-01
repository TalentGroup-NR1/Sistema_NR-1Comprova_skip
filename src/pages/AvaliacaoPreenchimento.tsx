import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle, User, UserCog, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  useAvaliacaoByToken, 
  useSubmitAvaliacaoResponses,
  MetricaFormData,
  CompetenciaFormData,
  ObjetivoFormData
} from "@/hooks/useAvaliacoesAplicadas";

interface RespostaState {
  competencias: Record<string, { nota: string; comentario: string }>;
  objetivos: Record<string, { nota: string; comentario: string }>;
}

export default function AvaliacaoPreenchimento() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: avaliacao, isLoading, error } = useAvaliacaoByToken(token);
  const submitMutation = useSubmitAvaliacaoResponses();

  // Debug log (apenas em dev)
  if (import.meta.env.DEV) {
    console.log('[AvaliacaoPreenchimento] Token recebido:', token);
    console.log('[AvaliacaoPreenchimento] Dados da avaliação:', avaliacao);
    console.log('[AvaliacaoPreenchimento] Erro:', error);
  }

  const [respostas, setRespostas] = useState<RespostaState>({
    competencias: {},
    objetivos: {},
  });

  // Carregar respostas existentes (rascunho)
  useEffect(() => {
    if (avaliacao) {
      const competenciasState: Record<string, { nota: string; comentario: string }> = {};
      const objetivosState: Record<string, { nota: string; comentario: string }> = {};

      avaliacao.respostas_competencias?.forEach(r => {
        competenciasState[r.competencia_id] = { 
          nota: r.nota_valor, 
          comentario: r.comentario || "" 
        };
      });

      avaliacao.respostas_objetivos?.forEach(r => {
        objetivosState[r.objetivo_id] = { 
          nota: r.nota_valor, 
          comentario: r.comentario || "" 
        };
      });

      setRespostas({ competencias: competenciasState, objetivos: objetivosState });
    }
  }, [avaliacao]);

  const handleCompetenciaChange = (id: string, field: 'nota' | 'comentario', value: string) => {
    setRespostas(prev => ({
      ...prev,
      competencias: {
        ...prev.competencias,
        [id]: {
          ...prev.competencias[id],
          [field]: value,
        },
      },
    }));
  };

  const handleObjetivoChange = (id: string, field: 'nota' | 'comentario', value: string) => {
    setRespostas(prev => ({
      ...prev,
      objetivos: {
        ...prev.objetivos,
        [id]: {
          ...prev.objetivos[id],
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = (finalizar: boolean) => {
    if (!token) return;

    const respostasCompetencias = Object.entries(respostas.competencias)
      .filter(([_, v]) => v.nota)
      .map(([competencia_id, v]) => ({
        competencia_id,
        nota_valor: v.nota,
        comentario: v.comentario || null,
      }));

    const respostasObjetivos = Object.entries(respostas.objetivos)
      .filter(([_, v]) => v.nota)
      .map(([objetivo_id, v]) => ({
        objetivo_id,
        nota_valor: v.nota,
        comentario: v.comentario || null,
      }));

    submitMutation.mutate({
      token,
      respostasCompetencias,
      respostasObjetivos,
      finalizar,
    });
  };

  const getMetricaById = (id: string | null): MetricaFormData | undefined => {
    if (!id || !avaliacao?.metricas) return undefined;
    return avaliacao.metricas.find(m => m.id === id);
  };

  // Estados de carregamento e erro
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Carregando avaliação...</p>
        </div>
      </div>
    );
  }

  if (error || !avaliacao) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="mt-4 text-xl font-semibold">Link inválido</h2>
              <p className="mt-2 text-muted-foreground">
                Este link de avaliação não existe ou não está mais disponível.
              </p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-6"
                variant="outline"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (avaliacao.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-yellow-500" />
              <h2 className="mt-4 text-xl font-semibold">Link expirado</h2>
              <p className="mt-2 text-muted-foreground">
                O prazo para preenchimento desta avaliação expirou.
              </p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-6"
                variant="outline"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (avaliacao.already_completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
              <h2 className="mt-4 text-xl font-semibold">Avaliação já concluída</h2>
              <p className="mt-2 text-muted-foreground">
                Esta avaliação já foi finalizada. Obrigado pela participação!
              </p>
              <Button 
                onClick={() => navigate('/')} 
                className="mt-6"
              >
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isAutoavaliacao = avaliacao.link_tipo === 'autoavaliacao';
  const titulo = isAutoavaliacao 
    ? "Autoavaliação — responda sobre você" 
    : "Avaliação do Gestor — responda sobre o colaborador";
  const icone = isAutoavaliacao ? <User className="h-6 w-6" /> : <UserCog className="h-6 w-6" />;

  // Verificar se todas as respostas obrigatórias estão preenchidas
  const competenciasRespondidas = (avaliacao.competencias || []).every(
    c => respostas.competencias[c.id]?.nota
  );
  const objetivosRespondidos = (avaliacao.objetivos || []).every(
    o => respostas.objetivos[o.id]?.nota
  );
  const podeEnviar = competenciasRespondidas && objetivosRespondidos;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {icone}
              <div>
                <CardTitle className="text-xl">{titulo}</CardTitle>
                <CardDescription className="mt-1">
                  Ciclo: {avaliacao.ciclo_nome}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1 text-sm">
              <p><span className="font-medium">Colaborador:</span> {avaliacao.colaborador_nome}</p>
              <p><span className="font-medium">Gestor:</span> {avaliacao.gestor_nome}</p>
            </div>
            {avaliacao.status === 'em_andamento' && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Rascunho salvo</AlertTitle>
                <AlertDescription>
                  Você tem respostas salvas. Continue de onde parou.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Competências */}
        {avaliacao.competencias && avaliacao.competencias.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Competências</CardTitle>
              <CardDescription>
                Avalie cada competência de acordo com a escala definida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {avaliacao.competencias.map((comp, index) => (
                <div key={comp.id} className="space-y-4">
                  {index > 0 && <Separator />}
                  <CompetenciaItem
                    competencia={comp}
                    metrica={getMetricaById(comp.metrica_id)}
                    resposta={respostas.competencias[comp.id] || { nota: "", comentario: "" }}
                    onChange={(field, value) => handleCompetenciaChange(comp.id, field, value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Objetivos */}
        {avaliacao.objetivos && avaliacao.objetivos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Objetivos</CardTitle>
              <CardDescription>
                Avalie cada objetivo de acordo com a escala definida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {avaliacao.objetivos.map((obj, index) => (
                <div key={obj.id} className="space-y-4">
                  {index > 0 && <Separator />}
                  <ObjetivoItem
                    objetivo={obj}
                    metrica={getMetricaById(obj.metrica_id)}
                    resposta={respostas.objetivos[obj.id] || { nota: "", comentario: "" }}
                    onChange={(field, value) => handleObjetivoChange(obj.id, field, value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button 
                variant="outline" 
                onClick={() => handleSubmit(false)}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Salvar Rascunho
              </Button>
              <Button 
                onClick={() => handleSubmit(true)}
                disabled={!podeEnviar || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Finalizar e Enviar
              </Button>
            </div>
            {!podeEnviar && (
              <p className="text-sm text-muted-foreground text-right mt-2">
                Responda todas as perguntas para finalizar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Componente de item de competência
interface CompetenciaItemProps {
  competencia: CompetenciaFormData;
  metrica?: MetricaFormData;
  resposta: { nota: string; comentario: string };
  onChange: (field: 'nota' | 'comentario', value: string) => void;
}

function CompetenciaItem({ competencia, metrica, resposta, onChange }: CompetenciaItemProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">{competencia.nome_competencia}</h4>
        {competencia.conceito_competencia && (
          <p className="text-sm text-muted-foreground mt-1">{competencia.conceito_competencia}</p>
        )}
        <p className="text-sm mt-2">{competencia.texto_pergunta}</p>
      </div>

      {metrica && (
        <div className="space-y-2">
          <Label>Avaliação ({metrica.nome_metrica})</Label>
          <RadioGroup
            value={resposta.nota}
            onValueChange={(value) => onChange('nota', value)}
            className="flex flex-wrap gap-2"
          >
            {metrica.valores_escala.map((v) => (
              <div key={String(v.valor)} className="flex items-center">
                <RadioGroupItem
                  value={String(v.valor)}
                  id={`comp-${competencia.id}-${v.valor}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`comp-${competencia.id}-${v.valor}`}
                  className="flex items-center justify-center px-3 py-2 text-sm border rounded-md cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary hover:bg-muted"
                >
                  {v.label || v.valor}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`comentario-comp-${competencia.id}`}>Comentário (opcional)</Label>
        <Textarea
          id={`comentario-comp-${competencia.id}`}
          value={resposta.comentario}
          onChange={(e) => onChange('comentario', e.target.value)}
          placeholder="Adicione um comentário..."
          rows={2}
        />
      </div>
    </div>
  );
}

// Componente de item de objetivo
interface ObjetivoItemProps {
  objetivo: ObjetivoFormData;
  metrica?: MetricaFormData;
  resposta: { nota: string; comentario: string };
  onChange: (field: 'nota' | 'comentario', value: string) => void;
}

function ObjetivoItem({ objetivo, metrica, resposta, onChange }: ObjetivoItemProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium">{objetivo.nome_objetivo}</h4>
        {objetivo.descricao_objetivo && (
          <p className="text-sm text-muted-foreground mt-1">{objetivo.descricao_objetivo}</p>
        )}
        <p className="text-sm mt-2">{objetivo.texto_pergunta}</p>
      </div>

      {metrica && (
        <div className="space-y-2">
          <Label>Avaliação ({metrica.nome_metrica})</Label>
          <RadioGroup
            value={resposta.nota}
            onValueChange={(value) => onChange('nota', value)}
            className="flex flex-wrap gap-2"
          >
            {metrica.valores_escala.map((v) => (
              <div key={String(v.valor)} className="flex items-center">
                <RadioGroupItem
                  value={String(v.valor)}
                  id={`obj-${objetivo.id}-${v.valor}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`obj-${objetivo.id}-${v.valor}`}
                  className="flex items-center justify-center px-3 py-2 text-sm border rounded-md cursor-pointer peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground peer-data-[state=checked]:border-primary hover:bg-muted"
                >
                  {v.label || v.valor}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={`comentario-obj-${objetivo.id}`}>Comentário (opcional)</Label>
        <Textarea
          id={`comentario-obj-${objetivo.id}`}
          value={resposta.comentario}
          onChange={(e) => onChange('comentario', e.target.value)}
          placeholder="Adicione um comentário..."
          rows={2}
        />
      </div>
    </div>
  );
}
