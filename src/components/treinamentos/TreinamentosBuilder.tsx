import { useState } from "react";
import { Plus, Search, Settings, Trash2, Eye, EyeOff, FolderOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useTreinamentos, useDeleteTreinamento, Treinamento } from "@/hooks/useTreinamentos";
import { TreinamentoFormDialog } from "./TreinamentoFormDialog";
import { TreinamentoConfig } from "./TreinamentoConfig";
import { CategoriasManager } from "./CategoriasManager";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  rascunho: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  publicado: { label: "Publicado", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  arquivado: { label: "Arquivado", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
};

const tipoConfig: Record<string, { label: string }> = {
  arquivo: { label: "Arquivo" },
  link: { label: "Link" },
  video: { label: "Vídeo" },
  pdf: { label: "PDF" },
  ppt: { label: "PowerPoint" },
};

export function TreinamentosBuilder() {
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [categoriasDialogOpen, setCategoriasDialogOpen] = useState(false);
  const [selectedTreinamento, setSelectedTreinamento] = useState<Treinamento | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: treinamentos, isLoading } = useTreinamentos();
  const deleteTreinamento = useDeleteTreinamento();

  const filteredTreinamentos = treinamentos?.filter(t =>
    t.titulo.toLowerCase().includes(search.toLowerCase()) ||
    t.categoria?.nome?.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedTreinamento) {
    return (
      <TreinamentoConfig
        treinamento={selectedTreinamento}
        onBack={() => setSelectedTreinamento(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gerenciar Treinamentos</CardTitle>
              <CardDescription>
                Crie e configure treinamentos para sua equipe
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCategoriasDialogOpen(true)}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Categorias
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Treinamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar treinamentos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !filteredTreinamentos?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum treinamento encontrado.</p>
              <Button variant="outline" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro treinamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTreinamentos.map((treinamento) => (
                  <TableRow
                    key={treinamento.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedTreinamento(treinamento)}
                  >
                    <TableCell className="font-medium">{treinamento.titulo}</TableCell>
                    <TableCell>
                      {treinamento.categoria ? (
                        <Badge variant="outline" style={{ borderColor: treinamento.categoria.cor }}>
                          {treinamento.categoria.nome}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{tipoConfig[treinamento.tipo].label}</TableCell>
                    <TableCell>
                      <Badge className={statusConfig[treinamento.status].className} variant="outline">
                        {statusConfig[treinamento.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(treinamento.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedTreinamento(treinamento)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirmId(treinamento.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TreinamentoFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <CategoriasManager
        open={categoriasDialogOpen}
        onOpenChange={setCategoriasDialogOpen}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir treinamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O treinamento e todos os dados relacionados serão
              permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  deleteTreinamento.mutate(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
