import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { ColaboradoresFeriasList } from "@/components/ferias/ColaboradoresFeriasList";
import { FeriasColaboradorDetail } from "@/components/ferias/FeriasColaboradorDetail";
import { FeriasDashboard } from "@/components/ferias/FeriasDashboard";
import { AprovacoesPendentesList } from "@/components/ferias/AprovacoesPendentesList";
import { useAuth } from "@/hooks/useAuth";
import { useFeriasPendentesAprovacao } from "@/hooks/useFerias";

export default function Ferias() {
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);
  const [tab, setTab] = useState("dashboard");
  const { role } = useAuth();
  const isReadOnly = role === 'gestor_departamento' || role === 'colaborador';
  const { data: pendentes } = useFeriasPendentesAprovacao();

  if (selectedColaboradorId) {
    return (
      <MainLayout>
        <FeriasColaboradorDetail
          colaboradorId={selectedColaboradorId}
          onBack={() => setSelectedColaboradorId(null)}
          readOnly={isReadOnly}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard">Visão Geral</TabsTrigger>
          <TabsTrigger value="aprovacoes" className="gap-2">
            Aprovações Pendentes
            {pendentes && pendentes.length > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5">{pendentes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <FeriasDashboard
            onGoAprovacoes={() => setTab("aprovacoes")}
            onGoColaboradores={() => setTab("colaboradores")}
          />
        </TabsContent>

        <TabsContent value="aprovacoes">
          <AprovacoesPendentesList />
        </TabsContent>

        <TabsContent value="colaboradores">
          <ColaboradoresFeriasList onSelectColaborador={setSelectedColaboradorId} />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
