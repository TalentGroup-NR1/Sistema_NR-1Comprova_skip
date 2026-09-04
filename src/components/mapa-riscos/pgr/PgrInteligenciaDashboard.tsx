import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Plus, BarChart2 } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { usePgrAnaliseTurnover } from "@/hooks/usePgrInteligencia";
import { usePgrGheSetorMapping } from "@/hooks/usePgrGheSetor";
import { useMatrizEmpresa } from "@/hooks/useRiscosGhe";
import { useCreatePlanoManual } from "@/hooks/usePlanosAcao";
import { toast } from "sonner";

export function PgrInteligenciaDashboard() {
  const { data: turnoverAlerts = [], isLoading: loadingTurnover } = usePgrAnaliseTurnover();
  const { data: mappings = [], isLoading: loadingMappings } = usePgrGheSetorMapping();
  const { data: matriz = [], isLoading: loadingMatriz } = useMatrizEmpresa();
  const criarPlano = useCreatePlanoManual();

  const isLoading = loadingTurnover || loadingMappings || loadingMatriz;

  const setoresCriticos = useMemo(() => {
    return turnoverAlerts.filter(a => a.alerta_nota >= 60);
  }, [turnoverAlerts]);

  const chartData = useMemo(() => {
    return turnoverAlerts.map(a => ({
      name: a.departamento || "Desconhecido",
      nota: a.alerta_nota,
      ghe_id: a.ghe_id,
    })).sort((a, b) => b.nota - a.nota);
  }, [turnoverAlerts]);

  function getGheName(gheId: string) {
    const ghe = matriz.find(m => m.ghe_id === gheId);
    return ghe?.ghe_nome || "GHE Desconhecido";
  }

  function handleCriarPlano(alert: any) {
    criarPlano.mutate(
      {
        avaliacao_id: "inteligencia-rh",
        dimensao_id: null,
        dimensao_nome: "Clima e Turnover",
        grupo_tipo: "departamento",
        grupo_id: alert.ghe_id,
        grupo_nome: alert.departamento,
        indice: alert.alerta_nota,
        nivel_risco: "Vermelho",
        titulo: "Programa de Liderança Saudável",
        descricao: `Ação sugerida devido ao alto índice de turnover (${alert.qtde_desligamentos} desligamentos recentes) no setor ${alert.departamento}.`,
        nivel_intervencao: "secundaria",
        participacao_trabalhadores: true,
        responsavel_id: null,
        prazo: null,
        status: "planejado",
      },
      {
        onSuccess: () => {
          toast.success("Plano de ação adicionado com sucesso!");
        },
        onError: (err: any) => {
          toast.error("Erro ao adicionar plano de ação: " + err.message);
        },
      }
    );
  }

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Carregando dados de inteligência...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Activity className="h-6 w-6" />
              Inteligência RH: Risco de Turnover vs PGR
            </CardTitle>
            <CardDescription className="text-blue-800/80 dark:text-blue-200/80 text-sm">
              Visão consolidada conectando dados reais de RH (desligamentos, clima) aos Grupos Homogêneos de Exposição (GHE).
            </CardDescription>
          </CardHeader>
        </Card>

        {setoresCriticos.map(critico => (
          <Alert key={critico.ghe_id} variant="destructive" className="md:col-span-2 border-red-500/50 bg-red-50 dark:bg-red-950/20">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="text-base font-semibold flex items-center gap-2">
              Atenção: Risco Crítico de Turnover no setor {critico.departamento}
              <Badge variant="destructive" className="ml-2 bg-red-600">Nota: {critico.alerta_nota}/100</Badge>
            </AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                O setor <strong>{critico.departamento}</strong> (GHE: {getGheName(critico.ghe_id)}) apresenta risco psicossocial/clima <strong>CRÍTICO</strong> com base nos dados reais de RH ({critico.qtde_desligamentos} desligamentos nos últimos 6 meses).
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/50 p-3 rounded-md border border-red-200 dark:border-red-900/50">
                <div className="text-sm">
                  <span className="font-semibold text-foreground">Ação Recomendada:</span> Programa de Liderança Saudável
                </div>
                <Button 
                  size="sm" 
                  variant="default"
                  className="shrink-0 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleCriarPlano(critico)}
                  disabled={criarPlano.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar ao Plano de Ação
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ))}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-muted-foreground" />
              Nota de Alerta por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">Nenhum dado de turnover disponível.</div>
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value} pontos`, "Alerta de Turnover"]}
                      labelStyle={{ color: 'black', fontWeight: 'bold' }}
                    />
                    <Bar 
                      dataKey="nota" 
                      fill="#f97316" 
                      radius={[4, 4, 0, 0]} 
                      name="Nota de Alerta" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
