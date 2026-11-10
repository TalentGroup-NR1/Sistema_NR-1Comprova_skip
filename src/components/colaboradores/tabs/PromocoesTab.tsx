import { useState } from "react";
import { Plus, TrendingUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePromocoes, useDeletePromocao } from "@/hooks/usePromocoes";
import { useAuth } from "@/hooks/useAuth";
import { PromocaoCard } from "../PromocaoCard";
import { NovaPromocaoDialog } from "../NovaPromocaoDialog";

interface PromocoesTabProps {
  colaborador: {
    id: string;
    company_id: string;
    full_name: string;
    job_title: string;
    base_salary: number;
    job_level: string | null;
    department: string;
  };
}

export function PromocoesTab({ colaborador }: PromocoesTabProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isAdminMaster, isAdminEmpresa, role } = useAuth();
  const { data: promocoes, isLoading } = usePromocoes(colaborador.id);
  const deletePromocao = useDeletePromocao();

  // Apenas admin_master, admin_empresa e analista_rh podem registrar promoções
  const canCreate = isAdminMaster || isAdminEmpresa || role === "analista_rh";
  
  // Apenas admin_master e admin_empresa podem excluir
  const canDelete = isAdminMaster || isAdminEmpresa;

  const handleDelete = (promocaoId: string) => {
    deletePromocao.mutate(promocaoId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com botão de nova promoção */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Histórico de Promoções</h3>
        </div>
        {canCreate && (
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Promoção
          </Button>
        )}
      </div>

      {/* Lista de promoções */}
      {promocoes && promocoes.length > 0 ? (
        <div className="space-y-4">
          {promocoes.map((promocao) => (
            <PromocaoCard
              key={promocao.id}
              promocao={promocao}
              onDelete={canDelete ? handleDelete : undefined}
              canDelete={canDelete}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <CardTitle className="text-lg mb-1">Nenhuma promoção registrada</CardTitle>
            <CardDescription className="text-center max-w-sm">
              O histórico de promoções deste colaborador aparecerá aqui quando registrado.
            </CardDescription>
            {canCreate && (
              <Button type="button" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primeira Promoção
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de nova promoção */}
      <NovaPromocaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        colaborador={colaborador}
      />
    </div>
  );
}
