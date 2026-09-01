import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LayoutDashboard, Flame, FileText, KanbanSquare, Brain, Library, Grid3X3, Upload } from "lucide-react";
import { InstrumentosTab } from "@/components/mapa-riscos/psico/InstrumentosTab";
import { CampanhasTab } from "@/components/mapa-riscos/psico/CampanhasTab";
import { DashboardPsico } from "@/components/mapa-riscos/psico/DashboardPsico";
import { HeatmapPsico } from "@/components/mapa-riscos/psico/HeatmapPsico";
import { RelatoriosPsicoTab } from "@/components/mapa-riscos/psico/RelatoriosPsicoTab";
import { PlanosAcaoPsicoTab } from "@/components/mapa-riscos/psico/planos/PlanosAcaoPsicoTab";
import { MatrizRiscoTab } from "@/components/mapa-riscos/matriz/MatrizRiscoTab";
import { PsicoMinhasAvaliacoes } from "@/components/mapa-riscos/psico/PsicoMinhasAvaliacoes";
import { ImportarPgrTab } from "@/components/mapa-riscos/pgr/ImportarPgrTab";
import { useAuth } from "@/hooks/useAuth";

export default function MapaRiscosNR1() {
  const { role } = useAuth();

  const isAdmin = role === "admin_master" || role === "admin_empresa" || role === "analista_rh";
  const isColaborador = role === "colaborador" || role === "gestor_departamento";

  const defaultTab = isAdmin ? "dashboard" : "psico";

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-7 w-7 text-orange-500" />
            Mapa de Riscos NR-1
          </h1>
          <p className="text-muted-foreground">
            Avaliação de riscos psicossociais com instrumentos científicos (COPSOQ, HSE-IT, PROART)
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className={`grid w-full max-w-6xl ${isAdmin ? "grid-cols-8" : "grid-cols-1"}`}>
            {isAdmin && (
              <>
                <TabsTrigger value="dashboard" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="instrumentos" className="flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  <span className="hidden sm:inline">Instrumentos</span>
                </TabsTrigger>
                <TabsTrigger value="campanhas" className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  <span className="hidden sm:inline">Campanhas</span>
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  <span className="hidden sm:inline">Heatmap</span>
                </TabsTrigger>
                <TabsTrigger value="matriz" className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Matriz de Risco</span>
                </TabsTrigger>
                <TabsTrigger value="planos" className="flex items-center gap-2">
                  <KanbanSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Planos de Ação</span>
                </TabsTrigger>
                <TabsTrigger value="relatorios" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Relatórios</span>
                </TabsTrigger>
                <TabsTrigger value="importar-pgr" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Importar PGR</span>
                </TabsTrigger>
              </>
            )}

            {isColaborador && (
              <TabsTrigger value="psico" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Avaliações psicossociais</span>
              </TabsTrigger>
            )}
          </TabsList>

          {isAdmin && (
            <>
              <TabsContent value="dashboard"><DashboardPsico /></TabsContent>
              <TabsContent value="instrumentos"><InstrumentosTab /></TabsContent>
              <TabsContent value="campanhas"><CampanhasTab /></TabsContent>
              <TabsContent value="heatmap"><HeatmapPsico /></TabsContent>
              <TabsContent value="matriz"><MatrizRiscoTab /></TabsContent>
              <TabsContent value="planos"><PlanosAcaoPsicoTab /></TabsContent>
              <TabsContent value="relatorios"><RelatoriosPsicoTab /></TabsContent>
              <TabsContent value="importar-pgr"><ImportarPgrTab /></TabsContent>
            </>
          )}

          {isColaborador && (
            <TabsContent value="psico"><PsicoMinhasAvaliacoes /></TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
