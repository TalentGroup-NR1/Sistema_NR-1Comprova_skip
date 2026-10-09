import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile, Calendar, Users, BookOpen, BarChart3, ClipboardList, FileText, UserCheck } from "lucide-react";
import { 
  PulsoCampanhasBuilder, 
  ColaboradorPulsoViewV2,
  PulsoColaboradoresList,
  PulsoColaboradorDetail,
} from "@/components/cuidar-mais/pulso";
import { MateriaisApoioAdmin } from "@/components/cuidar-mais/biblioteca/MateriaisApoioAdmin";
import { ResultadosAgregadosTab } from "@/components/cuidar-mais/agregados/ResultadosAgregadosTab";
import { AcompanhamentosList } from "@/components/cuidar-mais/acompanhamentos/AcompanhamentosList";
import { FiscalizacaoList } from "@/components/cuidar-mais/fiscalizacao/FiscalizacaoList";
import { RelatorioTab } from "@/components/cuidar-mais/relatorio";
import { useAuth } from "@/hooks/useAuth";

export default function CuidarMais() {
  const { role } = useAuth();
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);

  const isAdmin = role === 'admin_master' || role === 'admin_empresa' || role === 'analista_rh';
  const isGestor = role === 'gestor_departamento';
  const canViewResultados = isAdmin || isGestor;
  const canViewAcompanhamentos = isAdmin || isGestor;
  const isColaborador = role === 'colaborador' || role === 'gestor_departamento';

  // `pulso` é o primeiro item da TabsList do admin e a única aba do colaborador,
  // então usá-lo como default funciona para qualquer role e evita ficar travado
  // num valor que ainda não tem TabsContent renderizado (causa de tela branca
  // enquanto o role estava carregando).
  const defaultTab = 'pulso';

  return (
    <MainLayout>
      <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="space-y-6">
          {(isAdmin || isGestor) && (
            <div className="w-full overflow-x-auto pb-1">
              <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 items-center justify-start gap-1.5 p-1.5 bg-muted/60 backdrop-blur-sm border border-border/60 rounded-xl shadow-xs">
                <TabsTrigger
                  value="pulso"
                  className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                >
                  <Smile className="h-4 w-4" />
                  <span>Pulso</span>
                </TabsTrigger>
                
                {isAdmin && (
                  <TabsTrigger
                    value="campanhas"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Campanhas</span>
                  </TabsTrigger>
                )}
                
                {canViewResultados && (
                  <TabsTrigger
                    value="resultados"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                  >
                    <Users className="h-4 w-4" />
                    <span>Resultados</span>
                  </TabsTrigger>
                )}
                
                {canViewAcompanhamentos && (
                  <TabsTrigger
                    value="acompanhamentos"
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>Acompanhamentos</span>
                  </TabsTrigger>
                )}
                
                {isAdmin && (
                  <>
                    <TabsTrigger
                      value="fiscalizacao"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Acompanhamento Gestores</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="relatorio"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Relatório</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="agregados"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                    >
                      <BarChart3 className="h-4 w-4" />
                      <span>Agregados</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="materiais"
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs hover:text-foreground"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Materiais</span>
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            </div>
          )}

          <TabsContent value="pulso">
            <ColaboradorPulsoViewV2 />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="campanhas">
              <PulsoCampanhasBuilder />
            </TabsContent>
          )}

          {canViewResultados && (
            <TabsContent value="resultados">
              {selectedColaboradorId ? (
                <PulsoColaboradorDetail
                  colaboradorId={selectedColaboradorId}
                  onBack={() => setSelectedColaboradorId(null)}
                />
              ) : (
                <PulsoColaboradoresList
                  onSelectColaborador={(id) => setSelectedColaboradorId(id)}
                />
              )}
            </TabsContent>
          )}

          {canViewAcompanhamentos && (
            <TabsContent value="acompanhamentos">
              <AcompanhamentosList />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="fiscalizacao">
              <FiscalizacaoList />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="relatorio">
              <RelatorioTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="agregados">
              <ResultadosAgregadosTab />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="materiais">
              <MateriaisApoioAdmin />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
