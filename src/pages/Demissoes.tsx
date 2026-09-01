import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserMinus, Users, History, CalendarClock } from 'lucide-react';
import { ColaboradoresAtivosTab } from '@/components/demissoes/ColaboradoresAtivosTab';
import { ColaboradoresDesligadosTab } from '@/components/demissoes/ColaboradoresDesligadosTab';
import { AuditoriaDesligamentos } from '@/components/demissoes/AuditoriaDesligamentos';
import { ControleExperienciaTab } from '@/components/demissoes/ControleExperienciaTab';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';

export default function Demissoes() {
  const effectiveCompanyId = useEffectiveCompanyId();

  return (
    <MainLayout>
      <div className="space-y-6">

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Gestão de Desligamentos</CardTitle>
            <CardDescription>
              Desligamento e reativação de colaboradores com registro em auditoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="ativos" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="ativos" className="gap-2">
                  <Users className="h-4 w-4" />
                  Colaboradores Ativos
                </TabsTrigger>
                <TabsTrigger value="experiencia" className="gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Controle de Experiência
                </TabsTrigger>
                <TabsTrigger value="desligados" className="gap-2">
                  <UserMinus className="h-4 w-4" />
                  Desligados
                </TabsTrigger>
                <TabsTrigger value="auditoria" className="gap-2">
                  <History className="h-4 w-4" />
                  Auditoria
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ativos">
                <ColaboradoresAtivosTab companyId={effectiveCompanyId} />
              </TabsContent>

              <TabsContent value="experiencia">
                <ControleExperienciaTab companyId={effectiveCompanyId} />
              </TabsContent>

              <TabsContent value="desligados">
                <ColaboradoresDesligadosTab companyId={effectiveCompanyId} />
              </TabsContent>

              <TabsContent value="auditoria">
                <AuditoriaDesligamentos companyId={effectiveCompanyId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
