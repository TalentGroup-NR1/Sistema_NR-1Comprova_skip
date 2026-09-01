import { useMemo, useState } from "react";
import { SignedComunicadoImg, useSignedComunicadoMediaUrl } from "@/lib/comunicadosMedia";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
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
import { Plus, Megaphone, Calendar, Edit, Trash2, ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Campanha,
  computeStatus,
  useCampanhas,
  useDeleteCampanha,
} from "@/hooks/useCampanhasComunicados";
import { CampanhaFormDialog } from "./CampanhaFormDialog";

type Filtro = "todas" | "ativo" | "agendado" | "encerrado";

export function CampanhasBuilder() {
  const { data: campanhas, isLoading } = useCampanhas();
  const deleteMut = useDeleteCampanha();
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Campanha | null>(null);
  const [deleting, setDeleting] = useState<Campanha | null>(null);

  const filtered = useMemo(() => {
    if (!campanhas) return [];
    if (filtro === "todas") return campanhas;
    return campanhas.filter((c) => computeStatus(c.data_inicio, c.data_fim) === filtro);
  }, [campanhas, filtro]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" /> Campanhas
              </CardTitle>
              <CardDescription>
                Crie campanhas com início e fim. As ativas aparecem no dashboard do colaborador.
              </CardDescription>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4 mr-2" /> Nova Campanha
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)} className="space-y-4">
            <TabsList>
              <TabsTrigger value="todas">Todas</TabsTrigger>
              <TabsTrigger value="ativo">Ativas</TabsTrigger>
              <TabsTrigger value="agendado">Agendadas</TabsTrigger>
              <TabsTrigger value="encerrado">Encerradas</TabsTrigger>
            </TabsList>
            <TabsContent value={filtro} className="mt-2">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-56 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>Nenhuma campanha {filtro !== "todas" ? `(${filtro})` : ""} encontrada.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((c) => {
                    const status = computeStatus(c.data_inicio, c.data_fim);
                    return (
                      <Card key={c.id} className="overflow-hidden flex flex-col">
                        {c.imagem_url ? (
                          <SignedComunicadoImg src={c.imagem_url} alt="" className="w-full h-36 object-cover" />
                        ) : (
                          <div className="w-full h-36 bg-muted flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-10 w-10" />
                          </div>
                        )}
                        <CardContent className="p-4 flex-1 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-display font-semibold text-base leading-tight line-clamp-2">
                              {c.titulo}
                            </h3>
                            <Badge
                              variant={
                                status === "ativo"
                                  ? "default"
                                  : status === "agendado"
                                  ? "outline"
                                  : "secondary"
                              }
                            >
                              {status}
                            </Badge>
                          </div>
                          {c.descricao && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{c.descricao}</p>
                          )}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(c.data_inicio), "dd MMM", { locale: ptBR })} —{" "}
                            {format(parseISO(c.data_fim), "dd MMM yyyy", { locale: ptBR })}
                          </p>
                          <div className="flex gap-2 pt-2 border-t border-border">
                            <Button variant="ghost" size="sm" className="flex-1" onClick={() => setEditing(c)}>
                              <Edit className="h-3 w-3 mr-1" /> Editar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-1 text-destructive hover:text-destructive"
                              onClick={() => setDeleting(c)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Excluir
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CampanhaFormDialog
        open={creating || !!editing}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        campanha={editing}
      />

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A campanha "{deleting?.titulo}" será removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleting) await deleteMut.mutateAsync(deleting.id);
                setDeleting(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
