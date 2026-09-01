import { useState, useMemo } from "react";
import { ArrowLeft, FileText, Layers, Calculator, Scale, Settings, Link, Edit2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  QuestionarioCuidarPlus, 
  useQuestionarioCuidarPlus 
} from "@/hooks/useCuidarMaisQuestionarios";
import { useDimensoesQuestionario } from "@/hooks/useDimensoesCuidarPlus";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PerguntasTab } from "./questionario-config/PerguntasTab";
import { DimensoesTab } from "./questionario-config/DimensoesTab";
import { EscalaTab } from "./questionario-config/EscalaTab";
import { CalculoTab } from "./questionario-config/CalculoTab";
import { EnviosTab } from "./questionario-config/EnviosTab";
import { QuestionarioFormDialog } from "./QuestionarioFormDialog";

interface QuestionarioConfigProps {
  questionario: QuestionarioCuidarPlus;
  onBack: () => void;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
};

export function QuestionarioConfig({ questionario: initialQuestionario, onBack }: QuestionarioConfigProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Refetch para manter dados atualizados
  const { data: questionarioFull, isLoading, refetch } = useQuestionarioCuidarPlus(initialQuestionario.id);
  const { data: dimensoes = [] } = useDimensoesQuestionario(initialQuestionario.id);
  
  // Use refetched data or fallback to initial
  const questionario = questionarioFull || initialQuestionario;
  
  const isMatrizMode = questionario.modelo_analise === 'MATRIZ_RISCOS';
  
  // Debug logging
  console.log('[QuestionarioConfig] ID:', questionario.id);
  console.log('[QuestionarioConfig] Modelo:', questionario.modelo_analise);
  console.log('[QuestionarioConfig] Dimensões carregadas:', dimensoes.length);
  console.log('[QuestionarioConfig] Perguntas:', questionarioFull?.perguntas_cuidar_plus?.length || 0);

  // Count perguntas por dimensão for display
  const perguntasPorDimensao = useMemo(() => {
    const map = new Map<string, number>();
    if (questionarioFull?.perguntas_cuidar_plus) {
      questionarioFull.perguntas_cuidar_plus.forEach(p => {
        if (p.dimensao_questionario_id) {
          map.set(p.dimensao_questionario_id, (map.get(p.dimensao_questionario_id) || 0) + 1);
        }
      });
    }
    return map;
  }, [questionarioFull?.perguntas_cuidar_plus]);

  const perguntasCount = questionarioFull?.perguntas_cuidar_plus?.length || 0;
  const status = questionario.is_active ? 'active' : 'inactive';
  const statusInfo = statusLabels[status];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-8 w-full max-w-sm" />
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{questionario.titulo}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>
                Criado em {format(new Date(questionario.created_at), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <Badge variant="outline" className="gap-1">
                {isMatrizMode ? (
                  <>
                    <Layers className="h-3 w-3" />
                    Matriz de Riscos
                  </>
                ) : (
                  <>
                    <Settings className="h-3 w-3" />
                    Padrão
                  </>
                )}
              </Badge>
            </div>
            {questionario.descricao && (
              <p className="text-sm text-muted-foreground mt-2">{questionario.descricao}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Editar Questionário
        </Button>
      </div>

      {/* Info Alert for empty questionnaire */}
      {perguntasCount === 0 && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            <strong>Próximo passo:</strong> Adicione perguntas ao questionário na aba "Perguntas" abaixo.
            {isMatrizMode && " Você também pode criar dimensões personalizadas."}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="perguntas" className="w-full">
        <TabsList className={`grid w-full max-w-3xl ${isMatrizMode ? 'grid-cols-5' : 'grid-cols-3'}`}>
          <TabsTrigger value="perguntas" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Perguntas</span>
            <Badge variant="secondary" className="ml-1">{perguntasCount}</Badge>
          </TabsTrigger>
          {isMatrizMode && (
            <>
              <TabsTrigger value="dimensoes" className="gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Dimensões</span>
                <Badge variant="secondary" className="ml-1">{dimensoes.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="escala" className="gap-2">
                <Scale className="h-4 w-4" />
                <span className="hidden sm:inline">Escala</span>
              </TabsTrigger>
              <TabsTrigger value="calculo" className="gap-2">
                <Calculator className="h-4 w-4" />
                <span className="hidden sm:inline">Cálculo</span>
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="envios" className="gap-2">
            <Link className="h-4 w-4" />
            <span className="hidden sm:inline">Enviar</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perguntas" className="mt-6">
          <PerguntasTab 
            questionarioId={questionario.id} 
            modeloAnalise={questionario.modelo_analise}
            onRefetch={refetch}
          />
        </TabsContent>

        {isMatrizMode && (
          <>
            <TabsContent value="dimensoes" className="mt-6">
              <DimensoesTab 
                questionarioId={questionario.id}
                perguntasPorDimensao={perguntasPorDimensao}
              />
            </TabsContent>

            <TabsContent value="escala" className="mt-6">
              <EscalaTab 
                questionarioId={questionario.id}
                currentConfig={questionario.escala_config}
              />
            </TabsContent>

            <TabsContent value="calculo" className="mt-6">
              <CalculoTab 
                questionarioId={questionario.id}
                currentConfig={questionario.config_calculo}
              />
            </TabsContent>
          </>
        )}

        <TabsContent value="envios" className="mt-6">
          <EnviosTab questionarioId={questionario.id} />
        </TabsContent>
      </Tabs>

      <QuestionarioFormDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        questionario={questionario}
        onSaved={() => {
          refetch();
          setEditDialogOpen(false);
        }}
      />
    </div>
  );
}
