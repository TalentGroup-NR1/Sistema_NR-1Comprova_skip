import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ShieldAlert } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface FiscalizacaoResult {
  gestor_id: string;
  gestor_nome: string;
  qtd_novo: number;
  qtd_em_andamento: number;
  qtd_atrasado: number;
  ultimos_acompanhamentos: any[];
}

export function FiscalizacaoList() {
  const companyId = useEffectiveCompanyId();

  const { data: gestores, isLoading, isError, error } = useQuery({
    queryKey: ["pulse-fiscalizacao", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_pulse_fiscalizacao", {
        p_company_id: companyId
      });
      if (error) throw error;
      return data as FiscalizacaoResult[];
    },
    enabled: !!companyId,
  });

  const { data: drilldown } = useQuery({
    queryKey: ["pulse-drilldown", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase.rpc("get_cuidar_drilldown", {
        p_company_id: companyId
      });
      if (error) throw error;
      return data;
    },
    enabled: !!companyId,
  });

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando painel de fiscalização...</div>;
  }

  if (isError) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
                Erro ao carregar fiscalização
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-red-600">
            <p>Ocorreu um erro ao buscar os dados do painel de fiscalização.</p>
            <p className="font-medium text-sm mt-2">{error instanceof Error ? error.message : "Erro desconhecido"}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gestores || gestores.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Nenhum acompanhamento pendente no momento para acompanhamento de gestores.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Painel de Acompanhamento de Gestores</h2>
      <p className="text-muted-foreground">
        Acompanhe quais gestores estão agindo diante das respostas críticas da equipe.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {gestores.map((g) => (
          <Card key={g.gestor_id} className="relative overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{g.gestor_nome}</CardTitle>
              <CardDescription>Gestor de Departamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div className="flex flex-col bg-slate-50 rounded-md p-2">
                  <span className="text-2xl font-bold text-slate-700">{g.qtd_novo}</span>
                  <span className="text-xs text-slate-500 font-medium">Novos</span>
                </div>
                <div className="flex flex-col bg-blue-50 rounded-md p-2">
                  <span className="text-2xl font-bold text-blue-700">{g.qtd_em_andamento}</span>
                  <span className="text-xs text-blue-500 font-medium">Andamento</span>
                </div>
                <div className="flex flex-col bg-red-50 rounded-md p-2">
                  <span className="text-2xl font-bold text-red-700">{g.qtd_atrasado}</span>
                  <span className="text-xs text-red-500 font-medium">Atrasados</span>
                </div>
              </div>

              {g.ultimos_acompanhamentos && g.ultimos_acompanhamentos.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Últimos Casos Abertos:</h4>
                  <ul className="space-y-2 text-sm">
                    {g.ultimos_acompanhamentos.slice(0, 3).map((a, idx) => (
                      <li key={idx} className="flex justify-between items-center border-b pb-1 last:border-0">
                        <span className="text-muted-foreground">
                          {format(new Date(a.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        <div className="flex gap-2">
                          {a.is_atrasado && <Badge variant="destructive" className="text-[10px]">Atrasado</Badge>}
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {a.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* DRILL-DOWN ACCORDION */}
              {(() => {
                const gestorDrilldown = drilldown?.find((d: any) => d.gestor_id === g.gestor_id);
                if (!gestorDrilldown || !gestorDrilldown.casos || gestorDrilldown.casos.length === 0) return null;

                const aguardando = gestorDrilldown.casos.filter((c: any) => c.status === 'novo' || c.is_atrasado);
                const emAndamento = gestorDrilldown.casos.filter((c: any) => c.status === 'em_andamento' && !c.is_atrasado);
                
                const hasAguardando = aguardando.length > 0;

                return (
                  <div className="mt-4 pt-4 border-t">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="drilldown" className="border-b-0">
                        <AccordionTrigger className="py-2 hover:no-underline rounded-md hover:bg-slate-50 px-2 transition-all">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">Detalhamento de Casos</span>
                            {hasAguardando && (
                              <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                              </span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-2 px-2 max-h-60 overflow-y-auto">
                          {hasAguardando && (
                            <div className="mb-4">
                              <h5 className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3" />
                                Aguardando ação
                              </h5>
                              <ul className="space-y-3">
                                {aguardando.map((c: any, idx: number) => (
                                  <li key={idx} className="text-xs border-l-2 border-red-300 pl-2">
                                    <div className="font-semibold text-slate-800">{c.colaborador_nome}</div>
                                    <div className="text-slate-600 flex justify-between mt-1">
                                      <span>Resposta: <strong className="text-slate-800">{c.resposta_texto}</strong> ({c.origem})</span>
                                      {c.data_resposta && <span className="text-slate-500">{format(new Date(c.data_resposta), "dd/MM/yyyy", { locale: ptBR })}</span>}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                      <Badge variant="outline" className="text-[9px] bg-red-50 text-red-600 border-red-200">
                                        {c.is_atrasado ? 'Atrasado' : 'Novo'}
                                      </Badge>
                                      <span className="text-slate-500 font-medium">{c.dias_decorridos} dia(s) em aberto</span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {emAndamento.length > 0 && (
                            <div>
                              <h5 className="text-xs font-bold text-blue-600 mb-2">Em andamento</h5>
                              <ul className="space-y-3">
                                {emAndamento.map((c: any, idx: number) => (
                                  <li key={idx} className="text-xs border-l-2 border-blue-300 pl-2">
                                    <div className="font-semibold text-slate-800">{c.colaborador_nome}</div>
                                    <div className="text-slate-600 flex justify-between mt-1">
                                      <span>Resposta: <strong className="text-slate-800">{c.resposta_texto}</strong> ({c.origem})</span>
                                      {c.data_resposta && <span className="text-slate-500">{format(new Date(c.data_resposta), "dd/MM/yyyy", { locale: ptBR })}</span>}
                                    </div>
                                    <div className="mt-1 flex items-center justify-between">
                                      <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">
                                        Em andamento
                                      </Badge>
                                      <span className="text-slate-500 font-medium">{c.dias_decorridos} dia(s)</span>
                                    </div>
                                    {c.iniciado_em && (
                                      <div className="mt-2 p-2 bg-slate-50 border rounded text-slate-700">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="font-medium">Atitude do Gestor</span>
                                          <span className="text-[10px] text-slate-500">
                                            Iniciado em {format(new Date(c.iniciado_em), "dd/MM/yyyy", { locale: ptBR })}
                                          </span>
                                        </div>
                                        {c.objetivo && c.objetivo !== '***' && (
                                          <p className="text-[10px] mb-1"><span className="font-semibold">Objetivo:</span> {c.objetivo}</p>
                                        )}
                                        {c.acoes && Array.isArray(c.acoes) && c.acoes.length > 0 && c.acoes[0] !== '***' && (
                                          <div className="text-[10px]"><span className="font-semibold">Ações planejadas:</span> {c.acoes.length}</div>
                                        )}
                                        {c.objetivo === '***' && (
                                          <p className="text-[10px] italic text-slate-500">Conteúdo detalhado protegido por regra de papel.</p>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
