import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Clock, Trash2 } from "lucide-react";
import { AbonosList } from "./AbonosList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const tipoLabel: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
};

export function PontoAprovacoes() {
  const companyId = useEffectiveCompanyId();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: pendentes = [], isLoading } = useQuery({
    queryKey: ["ponto-aprovacoes-pendentes", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*, colaboradores!ponto_registros_colaborador_id_fkey(full_name, department)")
        .eq("company_id", companyId)
        .eq("status_aprovacao", "pendente")
        .eq("exclusao_pendente", false)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: exclusoesPendentes = [], isLoading: isLoadingExclusoes } = useQuery({
    queryKey: ["ponto-exclusoes-pendentes", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ponto_registros")
        .select("*, colaboradores!ponto_registros_colaborador_id_fkey(full_name, department)")
        .eq("company_id", companyId)
        .eq("exclusao_pendente", true)
        .order("exclusao_solicitada_em", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["ponto-aprovacoes-pendentes"] });
    queryClient.invalidateQueries({ queryKey: ["ponto-exclusoes-pendentes"] });
    queryClient.invalidateQueries({ queryKey: ["ponto-registros"] });
    queryClient.invalidateQueries({ queryKey: ["ponto-registros-hoje"] });
    queryClient.invalidateQueries({ queryKey: ["ponto-registros-historico"] });
  };

  const aprovarMutation = useMutation({
    mutationFn: async (registroId: string) => {
      const { error } = await supabase
        .from("ponto_registros")
        .update({
          status_aprovacao: "aprovado",
          aprovado_por: user?.id,
          aprovado_em: new Date().toISOString(),
        })
        .eq("id", registroId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Marcação aprovada com sucesso");
    },
    onError: (err: any) => toast.error("Erro ao aprovar: " + err.message),
  });

  const rejeitarMutation = useMutation({
    mutationFn: async (registroId: string) => {
      const { error } = await supabase
        .from("ponto_registros")
        .delete()
        .eq("id", registroId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Marcação rejeitada e removida");
    },
    onError: (err: any) => toast.error("Erro ao rejeitar: " + err.message),
  });

  const aprovarExclusaoMutation = useMutation({
    mutationFn: async (registroId: string) => {
      const { error } = await supabase
        .from("ponto_registros")
        .delete()
        .eq("id", registroId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Marcação excluída com sucesso");
    },
    onError: (err: any) => toast.error("Erro ao excluir: " + err.message),
  });

  const rejeitarExclusaoMutation = useMutation({
    mutationFn: async (registroId: string) => {
      const { error } = await supabase
        .from("ponto_registros")
        .update({
          exclusao_pendente: false,
          exclusao_motivo: null,
          exclusao_solicitada_em: null,
        })
        .eq("id", registroId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast.success("Solicitação de exclusão rejeitada");
    },
    onError: (err: any) => toast.error("Erro ao rejeitar exclusão: " + err.message),
  });

  return (
    <div className="space-y-6">
      <AbonosList />

      {/* Marcações Manuais Pendentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Marcações Pendentes de Aprovação
            {pendentes.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {pendentes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma marcação pendente de aprovação.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Justificativa</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendentes.map((reg: any) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">
                        {reg.colaboradores?.full_name || "—"}
                      </TableCell>
                      <TableCell>{reg.colaboradores?.department || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoLabel[reg.tipo] || reg.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(reg.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground truncate block">
                          {reg.justificativa || reg.observacao || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:bg-emerald-50"
                            onClick={() => aprovarMutation.mutate(reg.id)}
                            disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => rejeitarMutation.mutate(reg.id)}
                            disabled={aprovarMutation.isPending || rejeitarMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exclusões Pendentes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Exclusões Pendentes de Aprovação
            {exclusoesPendentes.length > 0 && (
              <Badge variant="secondary" className="bg-red-100 text-red-700">
                {exclusoesPendentes.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingExclusoes ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : exclusoesPendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma exclusão pendente de aprovação.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Motivo da Exclusão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exclusoesPendentes.map((reg: any) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">
                        {reg.colaboradores?.full_name || "—"}
                      </TableCell>
                      <TableCell>{reg.colaboradores?.department || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoLabel[reg.tipo] || reg.tipo}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(reg.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground truncate block">
                          {reg.exclusao_motivo || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-emerald-600 hover:bg-emerald-50"
                            onClick={() => aprovarExclusaoMutation.mutate(reg.id)}
                            disabled={aprovarExclusaoMutation.isPending || rejeitarExclusaoMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => rejeitarExclusaoMutation.mutate(reg.id)}
                            disabled={aprovarExclusaoMutation.isPending || rejeitarExclusaoMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </TableCell>
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
