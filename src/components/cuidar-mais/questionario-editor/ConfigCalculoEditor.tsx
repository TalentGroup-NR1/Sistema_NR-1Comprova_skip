import { Calculator, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ConfigCalculo {
  limite_risco: number;
  alerta_media_minima: number;
  alerta_risco_percentual: number;
  alerta_queda_delta: number;
}

interface ConfigCalculoEditorProps {
  value: ConfigCalculo;
  onChange: (config: ConfigCalculo) => void;
  disabled?: boolean;
}

const CONFIG_PADRAO: ConfigCalculo = {
  limite_risco: 2,
  alerta_media_minima: 3.0,
  alerta_risco_percentual: 35,
  alerta_queda_delta: 0.3,
};

export function ConfigCalculoEditor({ value, onChange, disabled }: ConfigCalculoEditorProps) {
  const config = value || CONFIG_PADRAO;

  const handleChange = (field: keyof ConfigCalculo, newValue: string) => {
    const parsed = parseFloat(newValue);
    if (isNaN(parsed)) return;

    onChange({
      ...config,
      [field]: parsed,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Regras de Cálculo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Configure os parâmetros para análise e alertas automáticos.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="limite_risco" className="text-sm flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-warning" />
              Limite de risco (score ≤)
            </Label>
            <Input
              id="limite_risco"
              type="number"
              value={config.limite_risco}
              onChange={(e) => handleChange('limite_risco', e.target.value)}
              min={1}
              max={5}
              step={1}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Respostas com score ≤ a esse valor são consideradas em risco
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alerta_media_minima" className="text-sm">
              Alerta: média mínima
            </Label>
            <Input
              id="alerta_media_minima"
              type="number"
              value={config.alerta_media_minima}
              onChange={(e) => handleChange('alerta_media_minima', e.target.value)}
              min={1}
              max={5}
              step={0.1}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Gera alerta se a média da dimensão for inferior
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alerta_risco_percentual" className="text-sm">
              Alerta: % em risco
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="alerta_risco_percentual"
                type="number"
                value={config.alerta_risco_percentual}
                onChange={(e) => handleChange('alerta_risco_percentual', e.target.value)}
                min={1}
                max={100}
                step={1}
                disabled={disabled}
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Gera alerta se o % de respostas em risco for superior
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alerta_queda_delta" className="text-sm">
              Alerta: queda vs período anterior
            </Label>
            <Input
              id="alerta_queda_delta"
              type="number"
              value={config.alerta_queda_delta}
              onChange={(e) => handleChange('alerta_queda_delta', e.target.value)}
              min={0.1}
              max={2}
              step={0.1}
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">
              Gera alerta se a média cair mais que esse valor
            </p>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mt-2">
          <p className="text-sm font-medium mb-2">Resumo das regras:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Respostas com score ≤ <strong>{config.limite_risco}</strong> são consideradas em risco</li>
            <li>• Para itens <strong>invertidos</strong>, aplica-se: score_ajustado = {config.limite_risco + 4} - score</li>
            <li>• Alerta se: média &lt; <strong>{config.alerta_media_minima}</strong> OU risco &gt; <strong>{config.alerta_risco_percentual}%</strong> OU queda &gt; <strong>{config.alerta_queda_delta}</strong></li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
