import { useState } from "react";
import { Plus, Edit2, Trash2, Award, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCompetenciasCiclo, useCompetenciaMutations, CompetenciaCiclo } from "@/hooks/useAvaliacoes";
import { CompetenciaFormDialog } from "./CompetenciaFormDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface CompetenciasTabProps {
  cicloId: string;
}

export function CompetenciasTab({ cicloId }: CompetenciasTabProps) {
  const { data: competencias, isLoading } = useCompetenciasCiclo(cicloId);
  const { deleteCompetencia } = useCompetenciaMutations(cicloId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCompetencia, setEditingCompetencia] = useState<CompetenciaCiclo | null>(null);

  const handleEdit = (competencia: CompetenciaCiclo) => {
    setEditingCompetencia(competencia);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCompetencia(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteCompetencia.mutate(id);
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
          <h3 className="text-lg font-medium">Competências</h3>
          <p className="text-sm text-muted-foreground">
            Defina as competências que serão avaliadas neste ciclo
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Competência
        </Button>
      </div>

      {!competencias || competencias.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma competência definida</p>
            <p className="text-sm">Adicione competências para avaliar os colaboradores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {competencias.map((competencia, index) => (
            <Card key={competencia.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <GripVertical className="h-5 w-5" />
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{competencia.nome_competencia}</h4>
                        {competencia.conceito_competencia && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {competencia.conceito_competencia}
                          </p>
                        )}
                      </div>
                      {competencia.metrica && (
                        <Badge variant="outline" className="ml-2">
                          {competencia.metrica.nome_metrica}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(competencia)}>
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
                            <AlertDialogTitle>Excluir competência?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(competencia.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

      <CompetenciaFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cicloId={cicloId}
        competencia={editingCompetencia}
      />
    </div>
  );
}
