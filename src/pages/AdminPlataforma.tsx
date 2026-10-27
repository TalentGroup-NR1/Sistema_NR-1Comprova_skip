import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PlataformaMetricsCards } from '@/components/plataforma/PlataformaMetricsCards';
import { PlataformaEmpresasTable } from '@/components/plataforma/PlataformaEmpresasTable';
import { PlataformaAuditLog } from '@/components/plataforma/PlataformaAuditLog';
import { BlogPostsTab } from '@/components/plataforma/BlogPostsTab';
import { ContactRequestsTab } from '@/components/plataforma/ContactRequestsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useContactRequests } from '@/hooks/useContactRequests';
import { Server, Plus } from 'lucide-react';

const AdminPlataforma = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') ?? 'empresas';
  const { data: requests } = useContactRequests();
  const novas = (requests ?? []).filter((r) => r.status === 'nova').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Painel da Plataforma</h1>
              <p className="text-sm text-muted-foreground">
                Visão agregada das empresas. Sem acesso aos dados operacionais de nenhuma empresa.
              </p>
            </div>
          </div>
          <Button onClick={() => navigate('/cadastro-empresa')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Empresa
          </Button>
        </header>

        <Tabs
          value={tab}
          onValueChange={(v) => setSearchParams(v === 'empresas' ? {} : { tab: v })}
          className="space-y-6"
        >
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="w-auto min-w-full sm:min-w-0">
              <TabsTrigger value="empresas">Empresas</TabsTrigger>
              <TabsTrigger value="solicitacoes" className="gap-2">
                Solicitações
                {novas > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                    {novas}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="empresas" className="space-y-6">
            <PlataformaMetricsCards />
            <PlataformaEmpresasTable />
            <PlataformaAuditLog />
          </TabsContent>

          <TabsContent value="solicitacoes">
            <ContactRequestsTab />
          </TabsContent>

          <TabsContent value="insights">
            <BlogPostsTab />
          </TabsContent>
        </Tabs>

      </div>
    </MainLayout>
  );
};

export default AdminPlataforma;
