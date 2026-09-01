import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { format } from "date-fns";

export function PontoDashboard() {
  const companyId = useEffectiveCompanyId();
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch all active colaboradores
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["dashboard-ponto-colaboradores", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, full_name, department, job_title")
        .eq("company_id", companyId)
        .eq("status", "ATIVO")
        .in("contract_type", ["CLT", "Estágio", "Aprendiz", "Temporário"])
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch today's registros for all colaboradores
  const { data: todayRegistros = [] } = useQuery({
    queryKey: ["dashboard-ponto-registros", companyId, today],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("colaborador_id, tipo, data_hora")
        .eq("company_id", companyId)
        .gte("data_hora", `${today}T00:00:00`)
        .lte("data_hora", `${today}T23:59:59`)
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Fetch pending approvals count
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ["dashboard-ponto-pendentes", companyId],
    queryFn: async () => {
      if (!companyId) return 0;
      const { count, error } = await supabase
        .from("ponto_registros")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status_aprovacao", "pendente");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!companyId,
    refetchInterval: 60000,
  });

  // Group registros by colaborador
  const registrosByColab = todayRegistros.reduce<Record<string, typeof todayRegistros>>((acc, r) => {
    if (!acc[r.colaborador_id]) acc[r.colaborador_id] = [];
    acc[r.colaborador_id].push(r);
    return acc;
  }, {});

  const colabsComPonto = new Set(Object.keys(registrosByColab));
  const comPonto = colaboradores.filter((c) => colabsComPonto.has(c.id));
  const semPonto = colaboradores.filter((c) => !colabsComPonto.has(c.id));

  // Detect inconsistencies (entrada sem saída, etc.)
  const inconsistentes = comPonto.filter((c) => {
    const regs = registrosByColab[c.id] || [];
    const last = regs[regs.length - 1];
    return last && last.tipo === "ENTRADA";
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{colaboradores.length}</p>
              <p className="text-xs text-muted-foreground">Total Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{comPonto.length}</p>
              <p className="text-xs text-muted-foreground">Ponto Batido Hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{semPonto.length}</p>
              <p className="text-xs text-muted-foreground">Sem Ponto Hoje</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{inconsistentes.length}</p>
              <p className="text-xs text-muted-foreground">Inconsistências</p>
            </div>
          </CardContent>
        </Card>
        {pendingCount > 0 && (
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Clock className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes Aprovação</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pending approvals alert */}
      {pendingCount > 0 && (
        <Card className="border-amber-200">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium">
                {pendingCount} marcação(ões) manual(is) aguardando aprovação
              </span>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              Pendente
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Inconsistencies */}
      {inconsistentes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-600">⚠ Registros Inconsistentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inconsistentes.map((c) => {
                const regs = registrosByColab[c.id] || [];
                const last = regs[regs.length - 1];
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.department}</p>
                    </div>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      Sem saída
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Without registro today */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Colaboradores Sem Ponto Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {semPonto.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Todos os colaboradores bateram ponto hoje!</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Cargo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {semPonto.slice(0, 20).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell>{c.department}</TableCell>
                      <TableCell>{c.job_title}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
