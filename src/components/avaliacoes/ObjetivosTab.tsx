import { useState } from "react";
import { Plus, Edit2, Trash2, Target, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useObjetivosCiclo, useObjetivoMutations, ObjetivoCiclo } from "@/hooks/useAvaliacoes";
import { ObjetivoFormDialog } from "./ObjetivoFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface ObjetivosTabProps {
  cicloId: string;
}

export function ObjetivosTab({ cicloId }: ObjetivosTabProps) {
  const { data: objetivos, isLoading } = useObjetivosCiclo(cicloId);
  const { deleteObjetivo } = useObjetivoMutations(cicloId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingObjetivo, setEditingObjetivo] = useState<ObjetivoCiclo | null>(null);

  const handleEdit = (objetivo: ObjetivoCiclo) => {
    setEditingObjetivo(objetivo);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingObjetivo(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteObjetivo.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Objetivos</h3>
          <p className="text-sm text-muted-foreground">
            Defina os objetivos que serão avaliados neste ciclo
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Objetivo
        </Button>
      </div>

      {!objetivos || objetivos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum objetivo definido</p>
            <p className="text-sm">Adicione objetivos para avaliar os colaboradores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {objetivos.map((objetivo, index) => (
            <Card key={objetivo.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{objetivo.nome_objetivo}</h4>
                        {objetivo.descricao_objetivo && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {objetivo.descricao_objetivo}
                          </p>
                        )}
                      </div>
                      {objetivo.metrica && (
                        <Badge variant="outline" className="ml-2">
                          {objetivo.metrica.nome_metrica}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(objetivo)}>
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
                            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(objetivo.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ObjetivoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cicloId={cicloId}
        objetivo={editingObjetivo}
      />
    </div>
  );
}
