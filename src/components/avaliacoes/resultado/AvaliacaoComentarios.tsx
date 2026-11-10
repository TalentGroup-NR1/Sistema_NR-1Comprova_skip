import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertTriangle, ClipboardList, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CompetenciaResultado, ObjetivoResultado } from "@/hooks/useAvaliacaoResultados";

interface AvaliacaoComentariosProps {
  competencias: CompetenciaResultado[];
  objetivos: ObjetivoResultado[];
  existingPDI?: { id: string } | null;
  canCreatePDI: boolean;
  onCreatePDI: () => void;
  isCreatingPDI: boolean;
}

export function AvaliacaoComentarios({
  competencias,
  objetivos,
  existingPDI,
  canCreatePDI,
  onCreatePDI,
  isCreatingPDI,
}: AvaliacaoComentariosProps) {
  const navigate = useNavigate();

  // Extract strong points (high scores from gestor)
  const pontosFortes = [
    ...competencias
      .filter(c => (c.resposta_gestor?.peso ?? 0) >= 4)
      .map(c => c.nome_competencia),
    ...objetivos
      .filter(o => (o.resposta_gestor?.peso ?? 0) >= 4)
      .map(o => o.nome_objetivo),
  ];

  // Extract attention points (low scores or high negative gap)
  const pontosAtencao = [
    ...competencias
      .filter(c => (c.resposta_gestor?.peso ?? 0) < 3 || (c.discrepancia !== null && c.discrepancia < -1))
      .map(c => c.nome_competencia),
    ...objetivos
      .filter(o => (o.resposta_gestor?.peso ?? 0) < 3 || (o.discrepancia !== null && o.discrepancia < -1))
      .map(o => o.nome_objetivo),
  ];

  // Extract relevant comments
  const comentariosRelevantes = [
    ...competencias
      .filter(c => c.resposta_gestor?.comentario)
      .map(c => ({ tipo: "Competência", nome: c.nome_competencia, comentario: c.resposta_gestor!.comentario! })),
    ...objetivos
      .filter(o => o.resposta_gestor?.comentario)
      .map(o => ({ tipo: "Objetivo", nome: o.nome_objetivo, comentario: o.resposta_gestor!.comentario! })),
  ];

  return (
    <div className="space-y-4">
      {/* PDI Section */}
      <Card className="border-border print:border-gray-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Plano de Desenvolvimento Individual (PDI)
            </CardTitle>
            <div className="print:hidden">
              {existingPDI ? (
                <Button onClick={() => navigate(`/pdi/${existingPDI.id}`)} size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver PDI
                </Button>
              ) : (
                <Button 
                  onClick={onCreatePDI} 
                  disabled={!canCreatePDI || isCreatingPDI}
                  size="sm"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  {isCreatingPDI ? "Criando..." : "Criar PDI"}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {existingPDI ? (
            <p className="text-sm text-muted-foreground">
              PDI já criado para esta avaliação. Clique em "Ver PDI" para acompanhar o progresso.
            </p>
          ) : canCreatePDI ? (
            <p className="text-sm text-muted-foreground">
              Com base nos resultados desta avaliação, é recomendado criar um PDI para desenvolver as competências identificadas.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              O PDI estará disponível após a conclusão de ambas as avaliações (autoavaliação e gestor).
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 print:grid-cols-2">
        {/* Pontos Fortes */}
        <Card className="border-border print:border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              Pontos Fortes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pontosFortes.length > 0 ? (
              <ul className="space-y-2">
                {pontosFortes.slice(0, 5).map((ponto, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{ponto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Pontos fortes serão identificados após conclusão das avaliações.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pontos de Atenção */}
        <Card className="border-border print:border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4" />
              Pontos de Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pontosAtencao.length > 0 ? (
              <ul className="space-y-2">
                {pontosAtencao.slice(0, 5).map((ponto, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-yellow-500 mt-1">!</span>
                    <span>{ponto}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Pontos de atenção serão identificados após conclusão das avaliações.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comentários do Gestor */}
      {comentariosRelevantes.length > 0 && (
        <Card className="border-border print:border-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Feedback do Gestor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comentariosRelevantes.slice(0, 5).map((item, idx) => (
                <div key={idx} className="text-sm">
                  <p className="font-medium text-muted-foreground">
                    {item.tipo}: {item.nome}
                  </p>
                  <p className="italic mt-1">"{item.comentario}"</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print signature section */}
      <div className="hidden print:block mt-8 pt-8 border-t border-gray-300">
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mx-8">
              <p className="text-sm font-medium">Colaborador</p>
              <p className="text-xs text-gray-500">Data: ___/___/______</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2 mx-8">
              <p className="text-sm font-medium">Gestor</p>
              <p className="text-xs text-gray-500">Data: ___/___/______</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
