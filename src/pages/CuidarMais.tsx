import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smile, Calendar, Users, BookOpen, BarChart3 } from "lucide-react";
import { 
  PulsoCampanhasBuilder, 
  ColaboradorPulsoViewV2,
  PulsoColaboradoresList,
  PulsoColaboradorDetail,
} from "@/components/cuidar-mais/pulso";
import { MateriaisApoioAdmin } from "@/components/cuidar-mais/biblioteca/MateriaisApoioAdmin";
import { ResultadosAgregadosTab } from "@/components/cuidar-mais/agregados/ResultadosAgregadosTab";
import { useAuth } from "@/hooks/useAuth";

export default function CuidarMais() {
  const { role } = useAuth();
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);

  const isAdmin = role === 'admin_master' || role === 'admin_empresa' || role === 'analista_rh';
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
          {isAdmin && (
            <TabsList className="grid w-full max-w-3xl grid-cols-5">
              <TabsTrigger value="pulso" className="flex items-center gap-2">
                <Smile className="h-4 w-4" />
                <span className="hidden sm:inline">Pulso</span>
              </TabsTrigger>
              <TabsTrigger value="campanhas" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Campanhas</span>
              </TabsTrigger>
              <TabsTrigger value="resultados" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Resultados</span>
              </TabsTrigger>
              <TabsTrigger value="agregados" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Agregados</span>
              </TabsTrigger>
              <TabsTrigger value="materiais" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Materiais</span>
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="pulso">
            <ColaboradorPulsoViewV2 />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="campanhas">
              <PulsoCampanhasBuilder />
            </TabsContent>
          )}

          {isAdmin && (
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
