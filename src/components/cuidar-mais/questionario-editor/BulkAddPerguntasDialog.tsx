import { useState } from "react";
import { Plus, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DimensaoQuestionario } from "@/hooks/useDimensoesCuidarPlus";

export interface BulkPergunta {
  pergunta_texto: string;
  tipo_pergunta: 'LIKERT_5' | 'TEXTO_LIVRE';
  dimensao_questionario_id: string | null; // UUID for Matriz mode
  dimensao: string | null;                  // Code for Padrão mode
  is_invertida: boolean;
  bloco: string | null;
  peso: number;
}

// Support both custom dimensions (Matriz) and fixed dimensions (Padrão)
type DimensaoOption = DimensaoQuestionario | {
  id: string;
  codigo: string;
  titulo: string;
  descricao?: string;
};

interface BulkAddPerguntasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimensoes: DimensaoOption[];
  onAdd: (perguntas: BulkPergunta[]) => void;
  modeloAnalise?: 'PADRAO' | 'MATRIZ_RISCOS';
}

export function BulkAddPerguntasDialog({
  open,
  onOpenChange,
  dimensoes,
  onAdd,
  modeloAnalise = 'MATRIZ_RISCOS',
}: BulkAddPerguntasDialogProps) {
  const [texto, setTexto] = useState("");
  const [dimensaoId, setDimensaoId] = useState<string>("");
  const [todasInvertidas, setTodasInvertidas] = useState(false);
  const [bloco, setBloco] = useState("");

  const linhas = texto
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const handleAdd = () => {
    if (linhas.length === 0) return;
    if (!dimensaoId) return;

    // For PADRAO mode: dimensaoId is a code (string) -> use `dimensao` field
    // For MATRIZ mode: dimensaoId is a UUID -> use `dimensao_questionario_id` field
    const perguntas: BulkPergunta[] = linhas.map(linha => ({
      pergunta_texto: linha,
      tipo_pergunta: 'LIKERT_5',
      dimensao_questionario_id: isPadraoMode ? null : dimensaoId,
      dimensao: isPadraoMode ? dimensaoId : null,
      is_invertida: todasInvertidas,
      bloco: bloco.trim() || null,
      peso: 1,
    }));

    onAdd(perguntas);
    handleReset();
    onOpenChange(false);
  };

  const handleReset = () => {
    setTexto("");
    setDimensaoId("");
    setTodasInvertidas(false);
    setBloco("");
  };

  const selectedDimensao = dimensoes.find(d => d.id === dimensaoId);
  const isPadraoMode = modeloAnalise === 'PADRAO';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Adicionar Perguntas em Massa
          </DialogTitle>
          <DialogDescription>
            Digite uma pergunta por linha. Todas serão criadas como Likert 1-5.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dimensao">Dimensão de destino *</Label>
            <Select value={dimensaoId} onValueChange={setDimensaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma dimensão" />
              </SelectTrigger>
              <SelectContent>
                {dimensoes.map((dim) => (
                  <SelectItem key={dim.id} value={dim.id}>
                    <div className="flex items-center gap-2">
                      {!isPadraoMode && 'codigo' in dim && (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {dim.codigo}
                        </Badge>
                      )}
                      <span>{dim.titulo}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isPadraoMode && (
              <p className="text-xs text-muted-foreground">
                Usando as 8 dimensões pré-definidas de saúde mental.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="texto">
              Perguntas (uma por linha)
              {linhas.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {linhas.length} pergunta{linhas.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </Label>
            <Textarea
              id="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={`Exemplo:\nSinto-me motivado(a) com meu trabalho\nTenho clareza sobre minhas responsabilidades\nRecebo feedback adequado do meu gestor`}
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="invertidas" className="text-sm font-medium">
                  Itens invertidos
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marcar todas como protetivas
                </p>
              </div>
              <Switch
                id="invertidas"
                checked={todasInvertidas}
                onCheckedChange={setTodasInvertidas}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloco" className="text-sm">Bloco (opcional)</Label>
              <input
                id="bloco"
                type="text"
                value={bloco}
                onChange={(e) => setBloco(e.target.value)}
                placeholder="Ex: Art. 2º §1º I"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {linhas.length > 0 && selectedDimensao && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Resumo:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• {linhas.length} pergunta(s) serão adicionadas</li>
                <li>
                  • Dimensão: {!isPadraoMode && 'codigo' in selectedDimensao && (
                    <Badge variant="secondary" className="font-mono text-xs mr-1">
                      {selectedDimensao.codigo}
                    </Badge>
                  )}
                  {selectedDimensao.titulo}
                </li>
                <li>• Tipo: Escala Likert (1-5)</li>
                {todasInvertidas && <li>• Todas marcadas como <strong>invertidas</strong></li>}
                {bloco && <li>• Bloco: {bloco}</li>}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleReset} type="button">
            <RotateCcw className="h-4 w-4 mr-2" />
            Limpar
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancelar
          </Button>
          <Button 
            onClick={handleAdd} 
            disabled={linhas.length === 0 || !dimensaoId}
            type="button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar {linhas.length > 0 ? `${linhas.length} Pergunta${linhas.length !== 1 ? 's' : ''}` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
