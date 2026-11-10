import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { DimensoesManager } from "../questionario-editor/DimensoesManager";

interface DimensoesTabProps {
  questionarioId: string;
  perguntasPorDimensao: Map<string, number>;
}

export function DimensoesTab({ questionarioId, perguntasPorDimensao }: DimensoesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Dimensões do Questionário
        </CardTitle>
        <CardDescription>
          Crie e gerencie as dimensões para organizar as perguntas do questionário.
          Cada dimensão agrupa perguntas relacionadas a um tema específico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DimensoesManager 
          questionarioId={questionarioId}
          perguntasPorDimensao={perguntasPorDimensao}
        />
      </CardContent>
    </Card>
  );
}
