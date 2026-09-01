import { Trash2, ChevronUp, ChevronDown, RotateCcw, Weight, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DimensaoQuestionario } from "@/hooks/useDimensoesCuidarPlus";

export interface LocalPerguntaMatriz {
  id?: string;
  pergunta_texto: string;
  tipo_pergunta: 'LIKERT_5' | 'TEXTO_LIVRE';
  order_index: number;
  dimensao_questionario_id: string | null; // UUID for Matriz mode
  dimensao: string | null;                  // Code for Padrão mode
  is_invertida: boolean;
  bloco: string | null;
  peso: number;
  isNew?: boolean;
  isModified?: boolean;
}

interface PerguntaCardMatrizProps {
  pergunta: LocalPerguntaMatriz;
  index: number;
  totalPerguntas: number;
  dimensoes: DimensaoQuestionario[];
  onUpdate: (field: keyof LocalPerguntaMatriz, value: unknown) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function PerguntaCardMatriz({
  pergunta,
  index,
  totalPerguntas,
  dimensoes,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PerguntaCardMatrizProps) {
  const dimensao = dimensoes.find(d => d.id === pergunta.dimensao_questionario_id);

  return (
    <Card className={`relative ${pergunta.isNew ? 'border-primary/50' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          {/* Controles de ordenação */}
          <div className="flex flex-col gap-1 items-center pt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveUp}
              disabled={index === 0}
              type="button"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground font-medium">
              {index + 1}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onMoveDown}
              disabled={index === totalPerguntas - 1}
              type="button"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Conteúdo da pergunta */}
          <div className="flex-1 space-y-3">
            <Textarea
              value={pergunta.pergunta_texto}
              onChange={(e) => onUpdate('pergunta_texto', e.target.value)}
              placeholder="Digite a pergunta..."
              rows={2}
            />

            <div className="flex items-center gap-3 flex-wrap">
              {/* Seletor de Dimensão */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Dimensão:</Label>
                <Select
                  value={pergunta.dimensao_questionario_id || '__none__'}
                  onValueChange={(value) => 
                    onUpdate('dimensao_questionario_id', value === '__none__' ? null : value)
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Sem dimensão</span>
                    </SelectItem>
                    {dimensoes.map((dim) => (
                      <SelectItem key={dim.id} value={dim.id}>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs px-1.5">
                            {dim.codigo}
                          </Badge>
                          <span className="truncate max-w-[120px]">{dim.titulo}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggle Invertida */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`invertida-${index}`}
                        checked={pergunta.is_invertida}
                        onCheckedChange={(checked) => onUpdate('is_invertida', checked)}
                      />
                      <Label htmlFor={`invertida-${index}`} className="text-sm cursor-pointer flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        Invertida
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[200px] text-xs">
                      Item protetivo: o score será invertido na análise (6 - score)
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Badges de status */}
              {pergunta.isNew && (
                <Badge variant="outline" className="text-primary border-primary">
                  Nova
                </Badge>
              )}
              {dimensao && (
                <Badge variant="secondary" className="font-mono">
                  {dimensao.codigo}
                </Badge>
              )}
              {pergunta.is_invertida && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  ↕ Invertida
                </Badge>
              )}
            </div>

            {/* Campos opcionais expandidos */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-3 w-3 text-muted-foreground" />
                <Input
                  value={pergunta.bloco || ""}
                  onChange={(e) => onUpdate('bloco', e.target.value || null)}
                  placeholder="Bloco (opcional)"
                  className="w-[140px] h-8 text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <Weight className="h-3 w-3 text-muted-foreground" />
                <Input
                  type="number"
                  value={pergunta.peso}
                  onChange={(e) => onUpdate('peso', parseFloat(e.target.value) || 1)}
                  min={0.1}
                  max={10}
                  step={0.1}
                  className="w-[70px] h-8 text-sm text-center"
                />
                <span className="text-xs text-muted-foreground">peso</span>
              </div>
            </div>
          </div>

          {/* Botão de remover */}
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
