import { useState, useEffect } from "react";
import { Scale, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { EscalaConfigItem, useUpdateQuestionarioCuidarPlus } from "@/hooks/useCuidarMaisQuestionarios";
import { EscalaConfigEditor } from "../questionario-editor/EscalaConfigEditor";

interface EscalaTabProps {
  questionarioId: string;
  currentConfig: EscalaConfigItem[] | null;
}

const ESCALA_PADRAO: EscalaConfigItem[] = [
  { valor: 1, rotulo: "Discordo Totalmente" },
  { valor: 2, rotulo: "Discordo" },
  { valor: 3, rotulo: "Neutro" },
  { valor: 4, rotulo: "Concordo" },
  { valor: 5, rotulo: "Concordo Totalmente" },
];

export function EscalaTab({ questionarioId, currentConfig }: EscalaTabProps) {
  const [escalaConfig, setEscalaConfig] = useState<EscalaConfigItem[]>(currentConfig || ESCALA_PADRAO);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const updateQuestionario = useUpdateQuestionarioCuidarPlus();

  useEffect(() => {
    if (currentConfig) {
      setEscalaConfig(currentConfig);
    }
  }, [currentConfig]);

  const handleConfigChange = (newConfig: EscalaConfigItem[]) => {
    setEscalaConfig(newConfig);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateQuestionario.mutateAsync({
        id: questionarioId,
        escala_config: escalaConfig,
      });
      toast.success("Configuração de escala salva");
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
              <Scale className="h-5 w-5" />
              Configuração da Escala
            </CardTitle>
            <CardDescription className="mt-1">
              Defina os valores e rótulos da escala Likert usada nas perguntas.
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
                  Salvar Escala
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <EscalaConfigEditor 
          value={escalaConfig} 
          onChange={handleConfigChange} 
        />
      </CardContent>
    </Card>
  );
}
