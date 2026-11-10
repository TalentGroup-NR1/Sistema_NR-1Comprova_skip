import { Trash2, ChevronUp, ChevronDown, ListChecks, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIMENSOES_OPTIONS } from "@/lib/cuidarMaisDimensoes";
import { LocalPerguntaMatriz } from "../questionario-editor/PerguntaCardMatriz";

interface PerguntaCardPadraoProps {
  pergunta: LocalPerguntaMatriz;
  index: number;
  totalPerguntas: number;
  onUpdate: (field: keyof LocalPerguntaMatriz, value: unknown) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function PerguntaCardPadrao({
  pergunta,
  index,
  totalPerguntas,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PerguntaCardPadraoProps) {
  // For PADRAO mode, use the 'dimensao' TEXT field (not dimensao_questionario_id which is UUID)
  const dimensaoCode = (pergunta as any).dimensao || null;
  const selectedDimensao = DIMENSOES_OPTIONS.find(d => d.value === dimensaoCode);

  return (
    <Card className={`relative ${pergunta.isNew ? 'border-primary/50' : ''}`}>
      <CardContent className="pt-4">
        <div className="flex gap-3">
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

          <div className="flex-1 space-y-3">
            <Textarea
              value={pergunta.pergunta_texto}
              onChange={(e) => onUpdate('pergunta_texto', e.target.value)}
              placeholder="Digite a pergunta..."
              rows={2}
            />

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Tipo:</Label>
                <Select
                  value={pergunta.tipo_pergunta}
                  onValueChange={(value) => onUpdate('tipo_pergunta', value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LIKERT_5">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4" />
                        Escala Likert (1-5)
                      </div>
                    </SelectItem>
                    <SelectItem value="TEXTO_LIVRE">
                      <div className="flex items-center gap-2">
                        <Type className="h-4 w-4" />
                        Texto Livre
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dimension selector for PADRAO mode - uses 'dimensao' TEXT field */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Dimensão:</Label>
                <Select
                  value={dimensaoCode || '__none__'}
                  onValueChange={(value) => onUpdate('dimensao', value === '__none__' ? null : value)}
                >
                  <SelectTrigger className="w-[250px]">
                    <SelectValue placeholder="Selecionar dimensão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <span className="text-muted-foreground">Sem dimensão</span>
                    </SelectItem>
                    {DIMENSOES_OPTIONS.map((dim) => (
                      <SelectItem key={dim.value} value={dim.value}>
                        <div className="flex items-center gap-2">
                          <span>{dim.icone}</span>
                          <span className="truncate">{dim.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {pergunta.isNew && (
                <Badge variant="outline" className="text-primary border-primary">
                  Nova
                </Badge>
              )}
              {selectedDimensao && (
                <Badge variant="secondary">
                  {selectedDimensao.icone} {selectedDimensao.label}
                </Badge>
              )}
            </div>

            {pergunta.tipo_pergunta === 'LIKERT_5' && (
              <div className="bg-muted/50 rounded-md p-3">
                <p className="text-xs text-muted-foreground mb-2">Preview da escala:</p>
                <div className="flex flex-wrap gap-2">
                  {['Discordo Totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo Totalmente'].map((label, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {i + 1} - {label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

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
