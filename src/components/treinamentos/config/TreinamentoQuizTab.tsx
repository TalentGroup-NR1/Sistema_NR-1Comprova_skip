import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  AdminQuizPergunta,
  useAdminQuizPerguntas,
  useDeleteQuizPergunta,
  useReordenarQuizPerguntas,
  useTreinamentoStats,
  useUpdateQuizConfig,
} from "@/hooks/useQuizAdmin";
import { Treinamento } from "@/hooks/useTreinamentos";
import { QuizPerguntaDialog } from "./QuizPerguntaDialog";
import {
  HelpCircle,
  FileQuestion,
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface TreinamentoQuizTabProps {
  treinamento: Treinamento;
}

export function TreinamentoQuizTab({ treinamento }: TreinamentoQuizTabProps) {
  const { data: perguntas = [], isLoading: loadingPerguntas } = useAdminQuizPerguntas(treinamento.id);
  const { data: stats } = useTreinamentoStats(treinamento.id);

  const updateConfig = useUpdateQuizConfig();
  const deletePergunta = useDeleteQuizPergunta();
  const reordenarPerguntas = useReordenarQuizPerguntas();

  // Estados locais para configuração
  const [quizObrigatorio, setQuizObrigatorio] = useState<boolean>(treinamento.quiz_obrigatorio ?? false);
  const [notaMinima, setNotaMinima] = useState<string>(
    treinamento.nota_minima !== undefined && treinamento.nota_minima !== null
      ? String(treinamento.nota_minima)
      : "70"
  );
  const [tentativasMaximas, setTentativasMaximas] = useState<string>(
    treinamento.tentativas_maximas !== undefined && treinamento.tentativas_maximas !== null
      ? String(treinamento.tentativas_maximas)
      : "3"
  );

  // Modais
  const [perguntaDialog, setPerguntaDialog] = useState<{
    open: boolean;
    pergunta?: AdminQuizPergunta | null;
  }>({ open: false, pergunta: null });

  const [perguntaToDelete, setPerguntaToDelete] = useState<AdminQuizPergunta | null>(null);

  const tentativasExistentes = stats?.tentativasCount ?? 0;

  const handleSaveConfig = async () => {
    const parsedNota = Math.max(0, Math.min(100, parseFloat(notaMinima) || 70));
    const parsedTentativas = Math.max(0, parseInt(tentativasMaximas, 10) || 0);

    await updateConfig.mutateAsync({
      treinamentoId: treinamento.id,
      quiz_obrigatorio: quizObrigatorio,
      nota_minima: parsedNota,
      tentativas_maximas: parsedTentativas,
    });
  };

  const moverPergunta = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= perguntas.length) return;

    // Criar nova ordem consecutiva
    const novaLista = [...perguntas];
    const [movido] = novaLista.splice(index, 1);
    novaLista.splice(target, 0, movido);

    const itens = novaLista.map((p, idx) => ({
      id: p.id,
      ordem: idx,
    }));

    await reordenarPerguntas.mutateAsync({
      treinamento_id: treinamento.id,
      itens,
    });
  };

  const confirmarExclusao = async () => {
    if (!perguntaToDelete) return;
    await deletePergunta.mutateAsync({
      id: perguntaToDelete.id,
      treinamentoId: treinamento.id,
    });
    setPerguntaToDelete(null);
  };

  if (loadingPerguntas) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Configuração do Quiz */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Configuração da Avaliação (Quiz)
          </CardTitle>
          <CardDescription>
            Defina as regras de aprovação e número de tentativas permitidas aos colaboradores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tentativasExistentes > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <AlertDescription className="text-xs">
                Já existem <strong>{tentativasExistentes}</strong> tentativa(s) de quiz registrada(s) por colaboradores neste treinamento. A alteração da nota mínima ou tentativas pode impactar o histórico.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold">Quiz Obrigatório para Conclusão</Label>
              <p className="text-xs text-muted-foreground">
                Exige nota mínima de aprovação para que o colaborador conclua o treinamento e emita certificado.
              </p>
            </div>
            <Switch
              checked={quizObrigatorio}
              onCheckedChange={setQuizObrigatorio}
              aria-label="Quiz Obrigatório"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nota-minima">Nota Mínima para Aprovação (%)</Label>
              <Input
                id="nota-minima"
                type="number"
                min="0"
                max="100"
                value={notaMinima}
                onChange={(e) => setNotaMinima(e.target.value)}
                placeholder="70"
              />
              <p className="text-xs text-muted-foreground">Padrão: 70% de acerto nas questões.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tentativas-maximas">Tentativas Máximas</Label>
              <Input
                id="tentativas-maximas"
                type="number"
                min="0"
                max="50"
                value={tentativasMaximas}
                onChange={(e) => setTentativasMaximas(e.target.value)}
                placeholder="3"
              />
              <p className="text-xs text-muted-foreground">
                0 = ilimitadas. Padrão sugerido: 3 tentativas.
              </p>
            </div>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={updateConfig.isPending}
            size="sm"
            className="mt-2"
          >
            {updateConfig.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações da Avaliação
          </Button>
        </CardContent>
      </Card>

      {/* Card 2: Banco de Perguntas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Banco de Questões ({perguntas.length})
            </CardTitle>
            <CardDescription>
              Questões de múltipla escolha com gabarito oficial cadastrado.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setPerguntaDialog({ open: true, pergunta: null })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Questão
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {perguntas.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-lg">
              <FileQuestion className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhuma questão cadastrada para este quiz</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no botão "Nova Questão" acima para criar perguntas de múltipla escolha.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {perguntas.map((pergunta, pIdx) => {
                const alternativasList = Array.isArray(pergunta.alternativas)
                  ? pergunta.alternativas
                  : [];

                return (
                  <div
                    key={pergunta.id}
                    className="border rounded-xl p-4 space-y-3 bg-card hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <Badge variant="outline" className="shrink-0 mt-0.5">
                          #{pIdx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground whitespace-pre-wrap">
                            {pergunta.enunciado}
                          </p>
                          {pergunta.explicacao && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              💡 Explicação: {pergunta.explicacao}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Ações da Pergunta */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moverPergunta(pIdx, -1)}
                          disabled={pIdx === 0 || reordenarPerguntas.isPending}
                          title="Mover para cima"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moverPergunta(pIdx, 1)}
                          disabled={pIdx === perguntas.length - 1 || reordenarPerguntas.isPending}
                          title="Mover para baixo"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setPerguntaDialog({ open: true, pergunta })
                          }
                          title="Editar questão"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPerguntaToDelete(pergunta)}
                          title="Excluir questão"
                          className="hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Alternativas com indicação da CORRETA para o Admin */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                      {alternativasList.map((alt: any, altIdx: number) => {
                        const altId = typeof alt === "string" ? String.fromCharCode(65 + altIdx) : alt.id || String.fromCharCode(65 + altIdx);
                        const altTexto = typeof alt === "string" ? alt : alt.texto || "";
                        const isCorreta = altId === pergunta.resposta_correta || altTexto === pergunta.resposta_correta;

                        return (
                          <div
                            key={altId}
                            className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${
                              isCorreta
                                ? "border-emerald-500 bg-emerald-50 text-emerald-900 font-medium dark:bg-emerald-950/30 dark:text-emerald-300"
                                : "border-border/60 bg-muted/20 text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isCorreta
                                  ? "bg-emerald-600 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {altId}
                            </span>
                            <span className="flex-1 truncate">{altTexto}</span>
                            {isCorreta && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-100/80 text-emerald-800 border-emerald-300 text-[10px] h-5 py-0 px-1 gap-1 shrink-0"
                              >
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Correta
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição de Pergunta */}
      {perguntaDialog.open && (
        <QuizPerguntaDialog
          open={perguntaDialog.open}
          onOpenChange={(v) => !v && setPerguntaDialog({ open: false, pergunta: null })}
          treinamentoId={treinamento.id}
          perguntaToEdit={perguntaDialog.pergunta}
          proximaOrdem={perguntas.length}
        />
      )}

      {/* Modal de Confirmação de Exclusão com aviso de tentativas */}
      <AlertDialog
        open={!!perguntaToDelete}
        onOpenChange={(v) => !v && setPerguntaToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta questão da avaliação?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>Esta questão será removida definitivamente do quiz.</div>
                {tentativasExistentes > 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 font-medium">
                    ⚠️ Atenção: Já existem {tentativasExistentes} tentativa(s) registradas neste treinamento. Excluir uma questão pode alterar o gabarito ou afetar a integridade do histórico de tentativas.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Questão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}