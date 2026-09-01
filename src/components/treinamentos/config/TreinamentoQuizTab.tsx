import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Treinamento, useQuizConfig, useUpsertQuizConfig, useQuizPerguntas, useCreateQuizPergunta, useDeleteQuizPergunta, useCreateQuizAlternativa, useUpdateQuizAlternativa, useDeleteQuizAlternativa } from "@/hooks/useTreinamentos";
import { Plus, Trash2, Save, FileQuestion, HelpCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TreinamentoQuizTabProps {
  treinamento: Treinamento;
}

export function TreinamentoQuizTab({ treinamento }: TreinamentoQuizTabProps) {
  const { data: quizConfig, isLoading: loadingConfig } = useQuizConfig(treinamento.id);
  const { data: perguntas, isLoading: loadingPerguntas } = useQuizPerguntas(treinamento.id);
  const upsertConfig = useUpsertQuizConfig();
  const createPergunta = useCreateQuizPergunta();
  const deletePergunta = useDeleteQuizPergunta();
  const createAlternativa = useCreateQuizAlternativa();
  const updateAlternativa = useUpdateQuizAlternativa();
  const deleteAlternativa = useDeleteQuizAlternativa();

  const [notaMinima, setNotaMinima] = useState(quizConfig?.nota_minima?.toString() || "70");
  const [tentativasMaximas, setTentativasMaximas] = useState(quizConfig?.tentativas_maximas?.toString() || "3");
  const [novaPergunta, setNovaPergunta] = useState("");

  const handleSaveConfig = async () => {
    await upsertConfig.mutateAsync({
      treinamento_id: treinamento.id,
      nota_minima: parseFloat(notaMinima) || 70,
      tentativas_maximas: parseInt(tentativasMaximas) || 3,
    });
  };

  const handleAddPergunta = async () => {
    if (!novaPergunta.trim()) return;
    await createPergunta.mutateAsync({
      treinamento_id: treinamento.id,
      pergunta_texto: novaPergunta.trim(),
      ordem: (perguntas?.length || 0) + 1,
    });
    setNovaPergunta("");
  };

  const handleAddAlternativa = async (perguntaId: string) => {
    await createAlternativa.mutateAsync({
      pergunta_id: perguntaId,
      texto_alternativa: "Nova alternativa",
      is_correta: false,
      ordem: 0,
      treinamentoId: treinamento.id,
    });
  };

  const handleToggleCorreta = async (alternativaId: string, isCorreta: boolean) => {
    await updateAlternativa.mutateAsync({
      id: alternativaId,
      is_correta: isCorreta,
      treinamentoId: treinamento.id,
    });
  };

  const handleUpdateAlternativaTexto = async (alternativaId: string, texto: string) => {
    await updateAlternativa.mutateAsync({
      id: alternativaId,
      texto_alternativa: texto,
      treinamentoId: treinamento.id,
    });
  };

  if (loadingConfig || loadingPerguntas) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Configuração do Quiz
          </CardTitle>
          <CardDescription>Defina os parâmetros de aprovação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nota mínima para aprovação (%)</Label>
              <Input type="number" value={notaMinima} onChange={(e) => setNotaMinima(e.target.value)} min="0" max="100" />
            </div>
            <div className="space-y-2">
              <Label>Tentativas máximas (0 = ilimitado)</Label>
              <Input type="number" value={tentativasMaximas} onChange={(e) => setTentativasMaximas(e.target.value)} min="0" />
            </div>
          </div>
          <Button onClick={handleSaveConfig} disabled={upsertConfig.isPending} size="sm">
            <Save className="h-4 w-4 mr-2" />
            Salvar Configuração
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Perguntas ({perguntas?.length || 0})
          </CardTitle>
          <CardDescription>Adicione perguntas de múltipla escolha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={novaPergunta} onChange={(e) => setNovaPergunta(e.target.value)} placeholder="Digite a pergunta..." className="flex-1" />
            <Button onClick={handleAddPergunta} disabled={createPergunta.isPending || !novaPergunta.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-4">
            {perguntas?.map((pergunta, idx) => (
              <div key={pergunta.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{idx + 1}. {pergunta.pergunta_texto}</p>
                  <Button variant="ghost" size="icon" onClick={() => deletePergunta.mutate({ id: pergunta.id, treinamentoId: treinamento.id })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="space-y-2 pl-4">
                  {pergunta.alternativas?.map(alt => (
                    <div key={alt.id} className="flex items-center gap-2">
                      <Checkbox checked={alt.is_correta} onCheckedChange={(checked) => handleToggleCorreta(alt.id, !!checked)} />
                      <Input value={alt.texto_alternativa} onChange={(e) => handleUpdateAlternativaTexto(alt.id, e.target.value)} className="flex-1" />
                      <Button variant="ghost" size="icon" onClick={() => deleteAlternativa.mutate({ id: alt.id, treinamentoId: treinamento.id })}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => handleAddAlternativa(pergunta.id)}>
                    <Plus className="h-3 w-3 mr-1" />
                    Alternativa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
