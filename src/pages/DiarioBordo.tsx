import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { MilestonesDashboard } from '@/components/diario-bordo/MilestonesDashboard';
import { QuestionnaireBuilder } from '@/components/diario-bordo/QuestionnaireBuilder';
import { MyFeedbacks } from '@/components/diario-bordo/MyFeedbacks';
import { GestorFeedbacks } from '@/components/diario-bordo/GestorFeedbacks';
import { AnalysisPage } from '@/components/diario-bordo/AnalysisPage';
import { 
  LayoutDashboard, 
  FileText,
  ClipboardList,
  BarChart3,
  Users,
  UserCheck,
  History
} from 'lucide-react';

export default function DiarioBordo() {
  const { role, isAdminMaster, isAdminEmpresa, loading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<'ATIVO' | 'DESLIGADO'>('ATIVO');

  // Wait for role to be determined before rendering tabs
  if (loading || role === null) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isColaborador = role === 'colaborador';
  const isGestor = role === 'gestor_departamento';
  const isAdmin = isAdminMaster || isAdminEmpresa || role === 'analista_rh';
  const canManageTemplates = isAdminMaster || isAdminEmpresa;

  // Determine default tab based on role
  const defaultTab = isColaborador
    ? 'meus-feedbacks'
    : isGestor
      ? 'minha-equipe'
      : 'dashboard';

  return (
    <MainLayout>
      <div className="space-y-6">
        <Tabs defaultValue={defaultTab} className="w-full">
          {!isColaborador && (
            <div className="flex flex-wrap items-center gap-3 justify-between pb-1">
              <div className="overflow-x-auto">
                <TabsList className="w-auto">
                {isAdmin && (
                  <TabsTrigger value="dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                  </TabsTrigger>
                )}
                {canManageTemplates && (
                  <TabsTrigger value="templates" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Templates</span>
                  </TabsTrigger>
                )}
                {isGestor && (
                  <TabsTrigger value="minha-equipe" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Minha Equipe</span>
                  </TabsTrigger>
                )}
                {(isAdmin || isGestor) && (
                  <TabsTrigger value="analise" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Análise</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

              {(isAdmin || isGestor) && (
                <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'ATIVO' | 'DESLIGADO')}>
                  <TabsList className="grid grid-cols-2">
                    <TabsTrigger value="ATIVO" className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      Ativos
                    </TabsTrigger>
                    <TabsTrigger value="DESLIGADO" className="flex items-center gap-2">
                      <History className="h-4 w-4" />
                      Histórico
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          )}


          {isAdmin && (
            <TabsContent value="dashboard" className="mt-6">
              <MilestonesDashboard statusFilter={statusFilter} />
            </TabsContent>
          )}

          {canManageTemplates && (
            <TabsContent value="templates" className="mt-6">
              <QuestionnaireBuilder />
            </TabsContent>
          )}

          {isGestor && (
            <TabsContent value="minha-equipe" className="mt-6">
              <GestorFeedbacks />
            </TabsContent>
          )}

          {(isAdmin || isGestor) && (
            <TabsContent value="analise" className="mt-6">
              <AnalysisPage statusFilter={statusFilter} />
            </TabsContent>
          )}

          {isColaborador && (
            <TabsContent value="meus-feedbacks" className="mt-6">
              <MyFeedbacks />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
