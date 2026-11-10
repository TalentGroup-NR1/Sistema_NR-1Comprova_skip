import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useComunicadosStats } from "@/hooks/useComunicados";
import { useAuth } from "@/hooks/useAuth";
import { ComunicadosList } from "@/components/comunicados/ComunicadosList";
import { EnvioComunicados } from "@/components/comunicados/EnvioComunicados";
import { PortalColaborador } from "@/components/comunicados/PortalColaborador";
import { CampanhasBuilder } from "@/components/comunicados/CampanhasBuilder";
import { RelatorioLeituras } from "@/components/comunicados/RelatorioLeituras";
import { RelatorioLeiturasCampanhas } from "@/components/comunicados/RelatorioLeiturasCampanhas";
import { 
  Megaphone,
  Pin,
  Eye,
  FileText,
  Send,
  LayoutDashboard,
  Sparkles,
  ClipboardCheck
} from "lucide-react";

export default function Comunicados() {
  const { role } = useAuth();
  const { data: stats } = useComunicadosStats();
  
  const isAdmin = role === 'admin_master' || role === 'admin_empresa' || role === 'analista_rh';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header - oculto para admin */}
        {!isAdmin && (
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="h-7 w-7 text-primary" />
              Comunicados
            </h1>
            <p className="text-muted-foreground">Avisos e informações importantes</p>
          </div>
        )}

        {/* Stats - Only for admins */}
        {isAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Pin className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats?.fixados || 0}</p>
                  <p className="text-xs text-muted-foreground">Fixados</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Eye className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats?.visualizacoes || 0}</p>
                  <p className="text-xs text-muted-foreground">Visualizações</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <FileText className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats?.total || 0}</p>
                  <p className="text-xs text-muted-foreground">Publicados</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Content */}
        {isAdmin ? (
          <Tabs defaultValue="gerenciar" className="space-y-6">
            <div className="w-full overflow-x-auto pb-1">
              <TabsList className="w-auto min-w-full sm:min-w-0">
                <TabsTrigger value="gerenciar" className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Gerenciar
                </TabsTrigger>
                <TabsTrigger value="enviar" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Enviar
                </TabsTrigger>
                <TabsTrigger value="campanhas" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Campanhas
                </TabsTrigger>
                <TabsTrigger value="portal" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visualização
                </TabsTrigger>
                <TabsTrigger value="leituras" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Leituras Comunicados
                </TabsTrigger>
                <TabsTrigger value="leituras-campanhas" className="flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Leituras Campanhas
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="gerenciar">
              <ComunicadosList />
            </TabsContent>

            <TabsContent value="enviar">
              <EnvioComunicados />
            </TabsContent>

            <TabsContent value="campanhas">
              <CampanhasBuilder />
            </TabsContent>

            <TabsContent value="portal">
              <PortalColaborador />
            </TabsContent>

            <TabsContent value="leituras">
              <RelatorioLeituras />
            </TabsContent>

            <TabsContent value="leituras-campanhas">
              <RelatorioLeiturasCampanhas />
            </TabsContent>
          </Tabs>
        ) : (
          <PortalColaborador />
        )}
      </div>
    </MainLayout>
  );
}
