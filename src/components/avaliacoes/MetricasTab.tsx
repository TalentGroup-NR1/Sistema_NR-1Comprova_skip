import { useState } from "react";
import { Plus, Edit2, Trash2, Hash, AlignLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMetricasCiclo, useMetricaMutations, MetricaAvaliacao } from "@/hooks/useAvaliacoes";
import { MetricaFormDialog } from "./MetricaFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricasTabProps {
  cicloId: string;
}

export function MetricasTab({ cicloId }: MetricasTabProps) {
  const { data: metricas, isLoading } = useMetricasCiclo(cicloId);
  const { deleteMetrica } = useMetricaMutations(cicloId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMetrica, setEditingMetrica] = useState<MetricaAvaliacao | null>(null);

  const handleEdit = (metrica: MetricaAvaliacao) => {
    setEditingMetrica(metrica);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingMetrica(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMetrica.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Métricas de Avaliação</h3>
          <p className="text-sm text-muted-foreground">
            Defina as escalas de avaliação que serão usadas para competências e objetivos
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Métrica
        </Button>
      </div>

      {!metricas || metricas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma métrica definida</p>
            <p className="text-sm">Crie métricas para usar nas competências e objetivos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {metricas.map((metrica) => (
            <Card key={metrica.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {metrica.tipo_metrica === 'numerica' ? (
                      <Hash className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <AlignLeft className="h-4 w-4 text-muted-foreground" />
                    )}
                    <CardTitle className="text-base">{metrica.nome_metrica}</CardTitle>
                  </div>
                  <Badge variant="outline">
                    {metrica.tipo_metrica === 'numerica' ? 'Numérica' : 'Descritiva'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {(metrica.valores_escala as any[]).map((valor, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {metrica.tipo_metrica === 'numerica' ? `${valor.valor}: ` : ''}{valor.label}
                      </Badge>
                    ))}
                  </div>
                </CardDescription>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(metrica)}>
                    <Edit2 className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir métrica?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Competências e objetivos que usam esta métrica perderão a associação.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(metrica.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MetricaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cicloId={cicloId}
        metrica={editingMetrica}
      />
    </div>
  );
}
