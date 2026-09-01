import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Settings, Trash2, Calendar, PlayCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useCiclosAvaliacao, useCicloMutations, CicloAvaliacao, CicloAvaliacaoStatus } from "@/hooks/useAvaliacoes";
import { Skeleton } from "@/components/ui/skeleton";

interface CiclosListProps {
  onCreateClick: () => void;
  onConfigureClick: (ciclo: CicloAvaliacao) => void;
}

const statusConfig: Record<CicloAvaliacaoStatus, { label: string; variant: "default" | "secondary" | "outline"; icon: React.ReactNode }> = {
  configuracao: { label: "Em Configuração", variant: "secondary", icon: <Settings className="h-3 w-3" /> },
  ativo: { label: "Ativo", variant: "default", icon: <PlayCircle className="h-3 w-3" /> },
  finalizado: { label: "Finalizado", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
};

export function CiclosList({ onCreateClick, onConfigureClick }: CiclosListProps) {
  const { data: ciclos, isLoading } = useCiclosAvaliacao();
  const { deleteCiclo } = useCicloMutations();

  const handleDelete = (id: string) => {
    deleteCiclo.mutate(id);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ciclos de Avaliação
          </CardTitle>
          <CardDescription>
            Gerencie os ciclos de avaliação de desempenho da empresa
          </CardDescription>
        </div>
        <Button onClick={onCreateClick}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ciclo
        </Button>
      </CardHeader>
      <CardContent>
        {!ciclos || ciclos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum ciclo de avaliação</p>
            <p className="text-sm">Crie o primeiro ciclo para começar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Ciclo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ciclos.map((ciclo) => {
                const status = statusConfig[ciclo.status];
                return (
                  <TableRow key={ciclo.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onConfigureClick(ciclo)}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ciclo.nome_ciclo}</p>
                        {ciclo.descricao && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{ciclo.descricao}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(ciclo.data_inicio), "dd/MM/yyyy", { locale: ptBR })} -{" "}
                        {format(new Date(ciclo.data_fim), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="gap-1">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" onClick={() => onConfigureClick(ciclo)}>
                          <Settings className="h-4 w-4 mr-1" />
                          Configurar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir ciclo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Todas as competências, objetivos e métricas associadas serão removidas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ciclo.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
