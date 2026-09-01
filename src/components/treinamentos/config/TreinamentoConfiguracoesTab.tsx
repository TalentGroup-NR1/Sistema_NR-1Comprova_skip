import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Treinamento, useUpdateTreinamento } from "@/hooks/useTreinamentos";
import { Settings, Clock, FileQuestion, FileCheck, Save } from "lucide-react";
import { TreinamentoCapaCard } from "./TreinamentoCapaCard";

interface TreinamentoConfiguracoesTabProps {
  treinamento: Treinamento;
}

export function TreinamentoConfiguracoesTab({ treinamento }: TreinamentoConfiguracoesTabProps) {
  const updateTreinamento = useUpdateTreinamento();

  const [tempoMinimo, setTempoMinimo] = useState(treinamento.tempo_minimo_minutos.toString());
  const [quizObrigatorio, setQuizObrigatorio] = useState(treinamento.quiz_obrigatorio);
  const [termoCienciaObrigatorio, setTermoCienciaObrigatorio] = useState(treinamento.termo_ciencia_obrigatorio);
  const [textoTermoCiencia, setTextoTermoCiencia] = useState(treinamento.texto_termo_ciencia || "Li e compreendi todo o conteúdo deste treinamento.");

  const handleSave = async () => {
    await updateTreinamento.mutateAsync({
      id: treinamento.id,
      tempo_minimo_minutos: parseInt(tempoMinimo) || 0,
      quiz_obrigatorio: quizObrigatorio,
      termo_ciencia_obrigatorio: termoCienciaObrigatorio,
      texto_termo_ciencia: textoTermoCiencia,
    });
  };

  return (
    <div className="space-y-6">
      <TreinamentoCapaCard treinamento={treinamento} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo Mínimo
          </CardTitle>
          <CardDescription>Define o tempo mínimo que o colaborador deve permanecer no treinamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input type="number" value={tempoMinimo} onChange={(e) => setTempoMinimo(e.target.value)} className="w-24" min="0" />
            <span className="text-muted-foreground">minutos</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Deixe 0 para não exigir tempo mínimo. O tempo é contabilizado apenas quando a aba está ativa.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileQuestion className="h-5 w-5" />
            Quiz
          </CardTitle>
          <CardDescription>Configure se o quiz é obrigatório para conclusão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Quiz obrigatório</Label>
              <p className="text-sm text-muted-foreground">O colaborador precisa ser aprovado no quiz para concluir</p>
            </div>
            <Switch checked={quizObrigatorio} onCheckedChange={setQuizObrigatorio} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Termo de Ciência
          </CardTitle>
          <CardDescription>Configure se é necessário aceitar um termo antes de concluir</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Termo de ciência obrigatório</Label>
              <p className="text-sm text-muted-foreground">O colaborador precisa aceitar o termo para concluir</p>
            </div>
            <Switch checked={termoCienciaObrigatorio} onCheckedChange={setTermoCienciaObrigatorio} />
          </div>
          {termoCienciaObrigatorio && (
            <div className="space-y-2">
              <Label>Texto do termo</Label>
              <Textarea value={textoTermoCiencia} onChange={(e) => setTextoTermoCiencia(e.target.value)} rows={2} />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={updateTreinamento.isPending}>
        <Save className="h-4 w-4 mr-2" />
        Salvar Configurações
      </Button>
    </div>
  );
}
