import { useState } from 'react';
import { Network, Building2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useEffectiveCompanyId } from '@/hooks/useEffectiveCompanyId';
import { ConfiguracaoTab } from '@/components/estrutura-organizacional/ConfiguracaoTab';
import { DescricoesCargoTab } from '@/components/estrutura-organizacional/DescricoesCargoTab';
import { ModelosDescricaoTab } from '@/components/estrutura-organizacional/ModelosDescricaoTab';

import { ImportarCboDialog } from '@/components/estrutura-organizacional/ImportarCboDialog';
import { QuestionariosTab } from '@/components/estrutura-organizacional/QuestionariosTab';
import { MinhasAtividadesAdminTab } from '@/components/estrutura-organizacional/MinhasAtividadesAdminTab';


export default function EstruturaOrganizacional() {
  const { role } = useAuth();
  const companyId = useEffectiveCompanyId();
  const [tab, setTab] = useState('configuracao');

  const podeEditar = role === 'admin_master' || role === 'admin_empresa' || role === 'analista_rh';
  const podeExcluir = role === 'admin_master' || role === 'admin_empresa';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <Network className="h-7 w-7 text-primary" />
              Estrutura Organizacional
            </h1>
            <p className="text-muted-foreground">
              Departamentos, cargos, grupos (GHE) e descrições de cargo da empresa
            </p>
          </div>
          {podeEditar && <ImportarCboDialog />}
        </div>

        {!companyId ? (
          <Card className="rounded-xl">
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Selecione uma empresa</p>
              <p className="text-sm text-muted-foreground">
                A estrutura organizacional é específica de cada empresa. Escolha uma no seletor do topo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <div className="w-full overflow-x-auto pb-1">
              <TabsList className="w-auto min-w-full sm:min-w-0">
                <TabsTrigger value="configuracao">Configuração</TabsTrigger>
                <TabsTrigger value="descricoes">Descrições de Cargo</TabsTrigger>
                <TabsTrigger value="modelos">Modelos de Descrição</TabsTrigger>

                <TabsTrigger value="questionarios">Questionários</TabsTrigger>
                <TabsTrigger value="atividades">Minhas Atividades</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="configuracao" className="animate-fade-in">
              <ConfiguracaoTab
                companyId={companyId}
                podeEditar={podeEditar}
                podeExcluir={podeExcluir}
              />
            </TabsContent>

            <TabsContent value="descricoes" className="animate-fade-in">
              <DescricoesCargoTab
                companyId={companyId}
                podeEditar={podeEditar}
                podeExcluir={podeExcluir}
              />
            </TabsContent>

            <TabsContent value="modelos" className="animate-fade-in">
              <ModelosDescricaoTab
                companyId={companyId}
                podeEditar={podeEditar}
                podeExcluir={podeExcluir}
              />
            </TabsContent>


            <TabsContent value="questionarios" className="animate-fade-in">
              <QuestionariosTab
                companyId={companyId}
                podeEditar={podeEditar}
                podeExcluir={podeExcluir}
              />
            </TabsContent>

            <TabsContent value="atividades" className="animate-fade-in">
              <MinhasAtividadesAdminTab
                companyId={companyId}
                onAbrirDescricao={() => setTab('descricoes')}
              />
            </TabsContent>
          </Tabs>

        )}
      </div>
    </MainLayout>
  );
}
