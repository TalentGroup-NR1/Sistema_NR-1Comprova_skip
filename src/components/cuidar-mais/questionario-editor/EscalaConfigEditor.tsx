import { useState, useEffect } from "react";
import { Settings, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface EscalaConfigItem {
  valor: number;
  rotulo: string;
}

interface EscalaConfigEditorProps {
  value: EscalaConfigItem[];
  onChange: (escala: EscalaConfigItem[]) => void;
  disabled?: boolean;
}

const ESCALA_PADRAO: EscalaConfigItem[] = [
  { valor: 1, rotulo: "Discordo Totalmente" },
  { valor: 2, rotulo: "Discordo" },
  { valor: 3, rotulo: "Neutro" },
  { valor: 4, rotulo: "Concordo" },
  { valor: 5, rotulo: "Concordo Totalmente" },
];

export function EscalaConfigEditor({ value, onChange, disabled }: EscalaConfigEditorProps) {
  const [escala, setEscala] = useState<EscalaConfigItem[]>(value || ESCALA_PADRAO);

  useEffect(() => {
    if (value && value.length > 0) {
      setEscala(value);
    }
  }, [value]);

  const handleChange = (index: number, field: keyof EscalaConfigItem, newValue: string | number) => {
    const updated = [...escala];
    if (field === 'valor') {
      updated[index].valor = typeof newValue === 'number' ? newValue : parseInt(newValue) || 1;
    } else {
      updated[index].rotulo = String(newValue);
    }
    setEscala(updated);
    onChange(updated);
  };

  const handleAddPoint = () => {
    const maxValor = Math.max(...escala.map(e => e.valor), 0);
    const newEscala = [...escala, { valor: maxValor + 1, rotulo: "" }];
    setEscala(newEscala);
    onChange(newEscala);
  };

  const handleRemovePoint = (index: number) => {
    if (escala.length <= 2) return;
    const newEscala = escala.filter((_, i) => i !== index);
    setEscala(newEscala);
    onChange(newEscala);
  };

  const handleReset = () => {
    setEscala(ESCALA_PADRAO);
    onChange(ESCALA_PADRAO);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Escala Likert
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={disabled}
          >
            Restaurar padrão
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Configure os valores e rótulos da escala que será usada nas perguntas Likert.
        </p>

        <div className="space-y-2">
          {escala
            .sort((a, b) => a.valor - b.valor)
            .map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="number"
                  value={item.valor}
                  onChange={(e) => handleChange(index, 'valor', e.target.value)}
                  className="w-16 text-center"
                  min={1}
                  max={10}
                  disabled={disabled}
                />
                <Input
                  value={item.rotulo}
                  onChange={(e) => handleChange(index, 'rotulo', e.target.value)}
                  placeholder={`Rótulo para ${item.valor}`}
                  className="flex-1"
                  disabled={disabled}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePoint(index)}
                  disabled={disabled || escala.length <= 2}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleAddPoint}
          disabled={disabled || escala.length >= 10}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar ponto na escala
        </Button>

        <div className="bg-muted/50 rounded-lg p-3 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Preview da escala:</p>
          <div className="flex flex-wrap gap-2">
            {escala
              .sort((a, b) => a.valor - b.valor)
              .map((item) => (
                <Badge key={item.valor} variant="secondary" className="text-xs">
                  {item.valor} - {item.rotulo || '(sem rótulo)'}
                </Badge>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
