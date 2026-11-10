import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckSquare, Plus, Copy, Edit, Loader2, PlayCircle, FileText, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { ChecklistTemplate, getTemplates, clonarTemplateOficial, getAplicacoesConcluidasList, isNaoConforme } from "./api";
import { ChecklistEditor } from "./ChecklistEditor";
import { ChecklistExecutor } from "./ChecklistExecutor";
import { LaudoAep } from "./LaudoAep";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

export function ChecklistAepTab() {
  const { companyId } = useAuth();
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [aplicacoes, setAplicacoes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCloning, setIsCloning] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
  const [viewingLaudoId, setViewingLaudoId] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tplData, appData] = await Promise.all([
        getTemplates(companyId || null),
        companyId ? getAplicacoesConcluidasList(companyId) : Promise.resolve([])
      ]);
      setTemplates(tplData);
      setAplicacoes(appData);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
      toast.error("Erro ao carregar os dados de AEP.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const handleClonar = async (templateId: string) => {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }
    setIsCloning(templateId);
    const sucesso = await clonarTemplateOficial(templateId, companyId);
    if (sucesso) {
      toast.success("Template clonado com sucesso!");
      await fetchData();
    } else {
      toast.error("Falha ao clonar o template.");
    }
    setIsCloning(null);
  };

  if (editingTemplateId) {
    return (
      <ChecklistEditor 
        templateId={editingTemplateId} 
        onBack={() => {
          setEditingTemplateId(null);
          fetchData();
        }} 
      />
    );
  }

  if (applyingTemplateId) {
    return (
      <ChecklistExecutor 
        templateId={applyingTemplateId} 
        onBack={() => {
          setApplyingTemplateId(null);
          fetchData();
        }} 
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Carregando dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Avaliação Ergonômica Preliminar (AEP)</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie templates, aplique checklists e consulte laudos concluídos.
          </p>
        </div>
        <Button onClick={() => toast.info("Funcionalidade de novo template em breve.")}>
          <Plus className="mr-2 h-4 w-4" /> Novo template
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="templates">Templates Disponíveis</TabsTrigger>
          <TabsTrigger value="historico">Histórico e Laudos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="flex flex-col relative overflow-hidden">
            {template.is_official && (
              <div className="absolute top-0 right-0 p-4">
                <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">
                  Oficial
                </Badge>
              </div>
            )}
            <CardHeader>
              <CardTitle className="pr-16 text-lg">{template.nome}</CardTitle>
              <CardDescription>
                {template.descricao || "Nenhuma descrição fornecida."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {(template as any).total_secoes || 0}
                  </span>
                  <span>Seções</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="flex flex-col">
                  <span className="font-semibold text-foreground">
                    {(template as any).total_perguntas || 0}
                  </span>
                  <span>Perguntas</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 pt-4 border-t border-border mt-auto">
              <div className="flex w-full gap-2">
                {!template.is_official ? (
                  <>
                    <Button 
                      variant="outline"
                      className="flex-1" 
                      onClick={() => setEditingTemplateId(template.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button 
                      variant="default"
                      className="flex-1" 
                      onClick={() => setApplyingTemplateId(template.id)}
                    >
                      <PlayCircle className="mr-2 h-4 w-4" /> Aplicar
                    </Button>
                  </>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => handleClonar(template.id)}
                    disabled={isCloning !== null}
                  >
                    {isCloning === template.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Copy className="mr-2 h-4 w-4" />
                    )}
                    {isCloning === template.id ? "Clonando..." : "Usar este template"}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center border border-dashed rounded-lg bg-muted/20">
            <CheckSquare className="mx-auto h-10 w-10 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Nenhum template encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Não há templates de checklist disponíveis. Crie um novo ou utilize um template oficial.
            </p>
          </div>
        )}
          </div>
        </TabsContent>

        <TabsContent value="historico">
          {aplicacoes.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50">
              <FileCheck2 className="h-12 w-12 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhuma aplicação concluída</h3>
              <p className="mb-4">Parece que você ainda não finalizou nenhum checklist AEP.</p>
              <Button onClick={() => {
                const tabsTrigger = document.querySelector('[value="templates"]') as HTMLElement;
                if (tabsTrigger) tabsTrigger.click();
              }} variant="outline">
                Aplicar primeiro checklist
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aplicacoes.map((app) => {
                const respostas = app.respostas || [];
                let ncs = 0;
                let conformes = 0;
                
                respostas.forEach((r: any) => {
                  const isNC = isNaoConforme(
                    r.resposta_valor, 
                    r.observacao_especifica, 
                    r.pergunta?.tipo_resposta || 'C_NC_NA',
                    r.pergunta?.obrigatoria || false
                  );
                  if (isNC) ncs++;
                  else conformes++;
                });

                return (
                  <Card key={app.id} className="flex flex-col relative overflow-hidden">
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className={ncs > 0 ? "border-red-200 text-red-700 bg-red-50" : "border-green-200 text-green-700 bg-green-50"}>
                        {ncs > 0 ? "Com Desvios" : "Conforme"}
                      </Badge>
                    </div>
                    <CardHeader>
                      <CardTitle className="pr-24 text-lg">
                        {app.tipo_aplicacao === 'ghe' ? 'GHE' : 'Posto'}: {app.tipo_aplicacao === 'ghe' ? app.ghe_id : app.posto_trabalho}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(app.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                      <div className="flex gap-4 mb-2">
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-green-600">{conformes}</span>
                          <span className="text-xs text-muted-foreground uppercase">Conformes</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-red-600">{ncs}</span>
                          <span className="text-xs text-muted-foreground uppercase">NCs</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="secondary" 
                        className="w-full font-medium" 
                        onClick={() => window.open(`/laudo/${app.id}`, '_blank')}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Ver Laudo
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
