import { useState, useEffect } from "react";
import { Calculator, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ConfigCalculo, useUpdateQuestionarioCuidarPlus } from "@/hooks/useCuidarMaisQuestionarios";
import { ConfigCalculoEditor } from "../questionario-editor/ConfigCalculoEditor";

interface CalculoTabProps {
  questionarioId: string;
  currentConfig: ConfigCalculo | null;
}

const CONFIG_PADRAO: ConfigCalculo = {
  limite_risco: 2,
  alerta_media_minima: 3.0,
  alerta_risco_percentual: 35,
  alerta_queda_delta: 0.3,
};

export function CalculoTab({ questionarioId, currentConfig }: CalculoTabProps) {
  const [configCalculo, setConfigCalculo] = useState<ConfigCalculo>(currentConfig || CONFIG_PADRAO);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateQuestionario = useUpdateQuestionarioCuidarPlus();

  useEffect(() => {
    if (currentConfig) {
      setConfigCalculo(currentConfig);
    }
  }, [currentConfig]);

  const handleConfigChange = (newConfig: ConfigCalculo) => {
    setConfigCalculo(newConfig);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateQuestionario.mutateAsync({
        id: questionarioId,
        config_calculo: configCalculo,
      });
      toast.success("Regras de cálculo salvas");
      setHasChanges(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Regras de Cálculo
            </CardTitle>
            <CardDescription className="mt-1">
              Configure os limiares de risco e alertas para a análise dos resultados.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                Alterações não salvas
              </Badge>
            )}
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Regras
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ConfigCalculoEditor 
          value={configCalculo} 
          onChange={handleConfigChange} 
        />
      </CardContent>
    </Card>
  );
}
