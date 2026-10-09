import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, LayoutDashboard, Flame, FileText, KanbanSquare, Brain, Library, Grid3X3, Upload, PenTool, CheckSquare } from "lucide-react";
import { InstrumentosTab } from "@/components/mapa-riscos/psico/InstrumentosTab";
import { CampanhasTab } from "@/components/mapa-riscos/psico/CampanhasTab";
import { DashboardPsico } from "@/components/mapa-riscos/psico/DashboardPsico";
import { HeatmapPsico } from "@/components/mapa-riscos/psico/HeatmapPsico";
import { RelatoriosPsicoTab } from "@/components/mapa-riscos/psico/RelatoriosPsicoTab";
import { PlanosAcaoPsicoTab } from "@/components/mapa-riscos/psico/planos/PlanosAcaoPsicoTab";
import { MatrizRiscoTab } from "@/components/mapa-riscos/matriz/MatrizRiscoTab";
import { PsicoMinhasAvaliacoes } from "@/components/mapa-riscos/psico/PsicoMinhasAvaliacoes";
import { ImportarPgrTab } from "@/components/mapa-riscos/pgr/ImportarPgrTab";
import { PgrInteligenciaDashboard } from "@/components/mapa-riscos/pgr/PgrInteligenciaDashboard";
import { ChecklistAepTab } from "@/components/mapa-riscos/aep/ChecklistAepTab";
import { useAuth } from "@/hooks/useAuth";

export default function MapaRiscosNR1() {
  const { role } = useAuth();

  const isAdminMaster = role === "admin_master";
  const isAdmin = role === "admin_master" || role === "admin_empresa" || role === "analista_rh";
  const isColaborador = role === "colaborador" || role === "gestor_departamento";

  const defaultTab = isAdmin ? "dashboard" : "psico";
  const [modoPgr, setModoPgr] = useState<"zero" | "existente">(isAdminMaster ? "zero" : "existente");

  return (
    <MainLayout>
      <ErrorBoundary fallbackMessage="Ocorreu um erro ao carregar o Mapa de Riscos. Se o problema persistir, atualize a página.">
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

        {isAdmin && (
          <div className="flex border-b border-border pb-1">
            <div className="flex gap-6">
              {isAdminMaster && (
                <button
                  onClick={() => setModoPgr("zero")}
                  className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                    ${modoPgr === "zero" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <PenTool className="h-4 w-4" /> Construção do Zero
                </button>
              )}
              <button
                onClick={() => setModoPgr("existente")}
                className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                  ${modoPgr === "existente" ? "border-orange-500 text-orange-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                <Upload className="h-4 w-4" /> PGR Existente
              </button>
            </div>
          </div>
        )}

        {isColaborador && (
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-1">
              <TabsTrigger value="psico" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                <span className="hidden sm:inline">Avaliações psicossociais</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="psico"><PsicoMinhasAvaliacoes /></TabsContent>
          </Tabs>
        )}

        {isAdminMaster && modoPgr === "zero" && (
          <Tabs defaultValue={defaultTab} className="space-y-6">
            <div className="w-full overflow-x-auto pb-1">
              <TabsList className="w-auto min-w-full sm:min-w-0">
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
                <TabsTrigger value="aep" className="flex items-center gap-2 text-blue-600 data-[state=active]:text-blue-700">
                  <CheckSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">Checklist AEP</span>
                </TabsTrigger>
                <TabsTrigger value="relatorios" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Relatórios</span>
                </TabsTrigger>
                <TabsTrigger value="inteligencia" className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="hidden sm:inline">Inteligência RH</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="dashboard"><DashboardPsico /></TabsContent>
            <TabsContent value="instrumentos"><InstrumentosTab /></TabsContent>
            <TabsContent value="campanhas"><CampanhasTab /></TabsContent>
            <TabsContent value="heatmap"><HeatmapPsico /></TabsContent>
            <TabsContent value="matriz"><MatrizRiscoTab /></TabsContent>
            <TabsContent value="planos"><PlanosAcaoPsicoTab /></TabsContent>
            <TabsContent value="aep"><ChecklistAepTab /></TabsContent>
            <TabsContent value="relatorios"><RelatoriosPsicoTab /></TabsContent>
            <TabsContent value="inteligencia"><PgrInteligenciaDashboard /></TabsContent>
          </Tabs>
        )}

        {isAdmin && modoPgr === "existente" && (
          <div className="pt-2">
            <ImportarPgrTab />
          </div>
        )}
      </div>
      </ErrorBoundary>
    </MainLayout>
  );
}
