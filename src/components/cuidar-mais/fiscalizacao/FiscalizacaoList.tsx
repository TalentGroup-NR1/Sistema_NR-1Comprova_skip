import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { ShieldAlert } from "lucide-react";

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
          Nenhum acompanhamento pendente no momento para fiscalizar.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Painel de Fiscalização de Acompanhamentos</h2>
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
