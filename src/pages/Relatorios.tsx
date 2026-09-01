import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Cake, Clock, TrendingUp } from "lucide-react";
import { RelatorioColaboradoresAtivos } from "@/components/relatorios/RelatorioColaboradoresAtivos";
import { RelatorioAdmissoesDemissoes } from "@/components/relatorios/RelatorioAdmissoesDemissoes";
import { RelatorioAniversarios } from "@/components/relatorios/RelatorioAniversarios";
import { RelatorioTempoCasa } from "@/components/relatorios/RelatorioTempoCasa";
import { RelatorioPromocoes } from "@/components/relatorios/RelatorioPromocoes";

const Relatorios = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromUrl || "colaboradores");

  // Update tab when URL changes
  useEffect(() => {
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <Card className="shadow-card">
          <CardHeader className="border-b border-border pb-4">
            <CardTitle className="text-xl font-semibold">Relatórios de RH</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
                <TabsTrigger value="colaboradores" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Colaboradores Ativos</span>
                  <span className="sm:hidden">Ativos</span>
                </TabsTrigger>
                <TabsTrigger value="admissoes" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Admissões/Demissões</span>
                  <span className="sm:hidden">Admissões</span>
                </TabsTrigger>
                <TabsTrigger value="aniversarios" className="flex items-center gap-2">
                  <Cake className="h-4 w-4" />
                  <span className="hidden sm:inline">Aniversários</span>
                  <span className="sm:hidden">Aniver.</span>
                </TabsTrigger>
                <TabsTrigger value="tempocasa" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Tempo de Casa</span>
                  <span className="sm:hidden">Tempo</span>
                </TabsTrigger>
                <TabsTrigger value="promocoes" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Promoções</span>
                  <span className="sm:hidden">Promo.</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="colaboradores">
                <RelatorioColaboradoresAtivos />
              </TabsContent>

              <TabsContent value="admissoes">
                <RelatorioAdmissoesDemissoes />
              </TabsContent>

              <TabsContent value="aniversarios">
                <RelatorioAniversarios />
              </TabsContent>

              <TabsContent value="tempocasa">
                <RelatorioTempoCasa />
              </TabsContent>

              <TabsContent value="promocoes">
                <RelatorioPromocoes />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Relatorios;
