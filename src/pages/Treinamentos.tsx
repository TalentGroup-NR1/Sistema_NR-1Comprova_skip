import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreinamentosBuilder } from "@/components/treinamentos/TreinamentosBuilder";
import { TreinamentosCatalogo } from "@/components/treinamentos/TreinamentosCatalogo";
import { TreinamentosRelatorios } from "@/components/treinamentos/TreinamentosRelatorios";
import { CertificatesPanel } from "@/components/treinamentos/certificates/CertificatesPanel";
import { Library, Settings, BarChart3, Award } from "lucide-react";

export default function Treinamentos() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("catalogo");

  const isAdmin = role === "admin_master" || role === "admin_empresa" || role === "analista_rh";

  return (
    <MainLayout>
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="catalogo" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              Catálogo
            </TabsTrigger>
            {isAdmin && (
              <>
                <TabsTrigger value="gerenciar" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Gerenciar
                </TabsTrigger>
                <TabsTrigger value="relatorios" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Relatórios
                </TabsTrigger>
                <TabsTrigger value="certificados" className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Certificados
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

          <TabsContent value="catalogo" className="mt-6">
            <TreinamentosCatalogo />
          </TabsContent>

          {isAdmin && (
            <>
              <TabsContent value="gerenciar" className="mt-6">
                <TreinamentosBuilder />
              </TabsContent>
              <TabsContent value="relatorios" className="mt-6">
                <TreinamentosRelatorios />
              </TabsContent>
              <TabsContent value="certificados" className="mt-6">
                <CertificatesPanel />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
