import { useState } from "react";
import { ArrowLeft, Target, Award, Ruler, Edit2, Users, BarChart3, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CicloAvaliacao } from "@/hooks/useAvaliacoes";
import { MetricasTab } from "./MetricasTab";
import { CompetenciasTab } from "./CompetenciasTab";
import { ObjetivosTab } from "./ObjetivosTab";
import { CicloFormDialog } from "./CicloFormDialog";
import { AcompanhamentoCiclo } from "./AcompanhamentoCiclo";
import { ResultadosCicloTab } from "./ResultadosCicloTab";
import { PDIsCicloTab } from "./PDIsCicloTab";

interface CicloConfigProps {
  ciclo: CicloAvaliacao;
  onBack: () => void;
}

const statusLabels: Record<string, string> = {
  configuracao: "Em Configuração",
  ativo: "Ativo",
  finalizado: "Finalizado",
};

export function CicloConfig({ ciclo, onBack }: CicloConfigProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{ciclo.nome_ciclo}</h1>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span>
                {format(new Date(ciclo.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                {format(new Date(ciclo.data_fim), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <Badge variant="secondary">{statusLabels[ciclo.status]}</Badge>
            </div>
            {ciclo.descricao && (
              <p className="text-sm text-muted-foreground mt-2">{ciclo.descricao}</p>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Editar Ciclo
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="metricas" className="w-full">
        <TabsList className="grid w-full grid-cols-6 max-w-3xl">
          <TabsTrigger value="metricas" className="gap-2">
            <Ruler className="h-4 w-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="competencias" className="gap-2">
            <Award className="h-4 w-4" />
            Competências
          </TabsTrigger>
          <TabsTrigger value="objetivos" className="gap-2">
            <Target className="h-4 w-4" />
            Objetivos
          </TabsTrigger>
          <TabsTrigger value="acompanhamento" className="gap-2">
            <Users className="h-4 w-4" />
            Aplicar
          </TabsTrigger>
          <TabsTrigger value="resultados" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Resultados
          </TabsTrigger>
          <TabsTrigger value="pdis" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            PDIs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="mt-6">
          <MetricasTab cicloId={ciclo.id} />
        </TabsContent>

        <TabsContent value="competencias" className="mt-6">
          <CompetenciasTab cicloId={ciclo.id} />
        </TabsContent>

        <TabsContent value="objetivos" className="mt-6">
          <ObjetivosTab cicloId={ciclo.id} />
        </TabsContent>

        <TabsContent value="acompanhamento" className="mt-6">
          <AcompanhamentoCiclo ciclo={ciclo} onBack={onBack} />
        </TabsContent>

        <TabsContent value="resultados" className="mt-6">
          <ResultadosCicloTab cicloId={ciclo.id} cicloStatus={ciclo.status} />
        </TabsContent>

        <TabsContent value="pdis" className="mt-6">
          <PDIsCicloTab cicloId={ciclo.id} />
        </TabsContent>
      </Tabs>

      <CicloFormDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        ciclo={ciclo} 
      />
    </div>
  );
}
