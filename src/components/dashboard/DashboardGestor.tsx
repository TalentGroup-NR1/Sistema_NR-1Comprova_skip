import { useMemo } from "react";
import { useColaboradores } from "@/hooks/useColaboradores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Plane, UserMinus } from "lucide-react";

export function DashboardGestor() {
  const { data: colaboradores = [], isLoading } = useColaboradores();

  // KPIs
  const totalEquipe = colaboradores.length;
  const ativos = colaboradores.filter((c) => c.status === "ATIVO").length;
  const ferias = colaboradores.filter((c) => c.status === "FERIAS").length;
  const afastados = colaboradores.filter((c) => c.status === "LICENCA" || c.status === "AFASTADO").length;

  // Feedback pendente: "não incluído por escopo"
  // (A fonte atual busca todos os ciclos da empresa no frontend, o que não é seguro fail-closed no banco para esta etapa).

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando painel da equipe...</div>;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h1 className="font-display text-[26px] md:text-[28px] font-bold leading-tight text-[#0F172A]">
          Minha Equipe
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral dos seus colaboradores diretos.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total da Equipe</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEquipe}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativos}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Férias</CardTitle>
            <Plane className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ferias}</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Afastados/Licença</CardTitle>
            <UserMinus className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{afastados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista da Equipe */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Colaboradores</CardTitle>
        </CardHeader>
        <CardContent>
          {colaboradores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Você não possui subordinados diretos no momento.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium rounded-tl-md">Nome</th>
                    <th className="px-4 py-3 font-medium">Cargo</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {colaboradores.map((colab) => (
                    <tr key={colab.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">{colab.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{colab.job_title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          colab.status === 'ATIVO' ? 'bg-emerald-100 text-emerald-800' :
                          colab.status === 'FERIAS' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {colab.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Feedback pendente: não incluído por escopo (a fonte atual não possui isolamento nativo para a subárvore).
      </p>
    </div>
  );
}
