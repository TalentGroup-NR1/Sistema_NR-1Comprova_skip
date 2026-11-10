import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, CreditCard, Globe, Loader2 } from "lucide-react";
import { useBeneficios, useUpdateBeneficio, useDeleteBeneficio, Beneficio } from "@/hooks/useBeneficios";
import { BeneficioFormDialog } from "./BeneficioFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useEffectiveCompanyId } from "@/hooks/useEffectiveCompanyId";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const CATEGORIA_LABELS: Record<string, string> = {
  alimentacao: "Alimentação",
  saude: "Saúde",
  odontologico: "Odontológico",
  seguros: "Seguros",
  transporte: "Transporte",
  lazer: "Lazer",
  educacao: "Educação",
  clube_descontos: "Clube de Descontos",
  outros: "Outros",
};

export function BeneficiosBuilder() {
  const { data: beneficios, isLoading } = useBeneficios();
  const updateBeneficio = useUpdateBeneficio();
  const deleteBeneficio = useDeleteBeneficio();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBeneficio, setEditingBeneficio] = useState<Beneficio | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [replicateOpen, setReplicateOpen] = useState(false);
  const [replicating, setReplicating] = useState(false);

  const { isAdminMaster } = useAuth();
  const effectiveCompanyId = useEffectiveCompanyId();
  const queryClient = useQueryClient();

  const handleReplicate = async () => {
    if (!effectiveCompanyId) return;
    setReplicating(true);
    try {
      const { data, error } = await supabase.rpc(
        "replicate_beneficios_to_all_companies" as any,
        { p_source_company_id: effectiveCompanyId }
      );
      if (error) throw error;
      const result = (data as any) || {};
      toast({
        title: "Replicação concluída",
        description: `${result.total_created ?? 0} benefício(s) replicado(s) para ${result.total_target_companies ?? 0} empresa(s). ${result.total_skipped ?? 0} ignorado(s) (já existiam).`,
      });
      queryClient.invalidateQueries({ queryKey: ["beneficios"] });
      setReplicateOpen(false);
    } catch (err: any) {
      toast({
        title: "Erro ao replicar",
        description: err?.message ?? "Falha desconhecida.",
        variant: "destructive",
      });
    } finally {
      setReplicating(false);
    }
  };

  const handleEdit = (beneficio: Beneficio) => {
    setEditingBeneficio(beneficio);
    setDialogOpen(true);
  };
  
  const handleCreate = () => {
    setEditingBeneficio(null);
    setDialogOpen(true);
  };
  
  const handleToggleAtivo = async (beneficio: Beneficio) => {
    await updateBeneficio.mutateAsync({
      id: beneficio.id,
      data: { ativo: !beneficio.ativo },
    });
  };
  
  const handleDelete = async () => {
    if (deleteId) {
      await deleteBeneficio.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };
  
  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Tipos de Benefícios
          </CardTitle>
          <div className="flex items-center gap-2">
            {isAdminMaster && effectiveCompanyId && (
              <Button
                variant="outline"
                onClick={() => setReplicateOpen(true)}
                className="flex items-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Replicar para todas as empresas
              </Button>
            )}
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Novo Benefício
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : beneficios && beneficios.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Operadora/Fornecedor</TableHead>
                  <TableHead>Valor Mensal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {beneficios.map((beneficio) => (
                  <TableRow key={beneficio.id}>
                    <TableCell className="font-medium">{beneficio.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORIA_LABELS[beneficio.categoria || 'outros'] || beneficio.categoria || 'Outros'}
                      </Badge>
                    </TableCell>
                    <TableCell>{beneficio.operadora_fornecedor || "-"}</TableCell>
                    <TableCell>{formatCurrency(beneficio.valor_mensal)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={beneficio.ativo}
                          onCheckedChange={() => handleToggleAtivo(beneficio)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {beneficio.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(beneficio)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(beneficio.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum benefício cadastrado</p>
              <p className="text-sm">Clique em "Novo Benefício" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

      <BeneficioFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        beneficio={editingBeneficio}
      />

      <AlertDialog open={replicateOpen} onOpenChange={(o) => !replicating && setReplicateOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Replicar benefícios para todas as empresas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Todos os benefícios desta empresa (incluindo materiais e tipos de contrato) serão
              copiados para todas as outras empresas ativas. Benefícios com o mesmo nome já
              existentes na empresa de destino serão ignorados — nada será sobrescrito.
              <br /><br />
              <strong>Atribuições por departamento não são replicadas</strong>, pois os
              departamentos variam por empresa. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={replicating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleReplicate();
              }}
              disabled={replicating}
            >
              {replicating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Replicando...</>
              ) : (
                "Replicar agora"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este benefício? Esta ação não pode ser desfeita
              e removerá também todas as atribuições aos colaboradores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
