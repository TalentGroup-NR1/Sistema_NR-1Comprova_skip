import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDeleteAnalise, isNewFormat, type AnalisePerfil } from "@/hooks/useAnalisesPerfil";

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "outline" },
  processando: { label: "Processando", variant: "secondary" },
  concluido: { label: "Concluído", variant: "default" },
  erro: { label: "Erro", variant: "destructive" },
};

export function AnaliseHistorico({
  analises,
  onSelect,
  selectedId,
}: {
  analises: AnalisePerfil[];
  onSelect: (a: AnalisePerfil) => void;
  selectedId?: string;
}) {
  const [deleteTarget, setDeleteTarget] = useState<AnalisePerfil | null>(null);
  const deleteAnalise = useDeleteAnalise();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteAnalise.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  if (analises.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8 text-sm">
        Nenhuma análise realizada ainda.
      </p>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Vaga</TableHead>
              <TableHead className="text-center">Aderência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {analises.map((a) => {
              const st = statusMap[a.status] || statusMap.pendente;
              const pct = isNewFormat(a.resultado) ? a.resultado?.percentual_aderencia_geral : a.resultado?.percentual_aderencia;

              return (
                <TableRow
                  key={a.id}
                  className={`cursor-pointer hover:bg-muted/50 ${selectedId === a.id ? "bg-muted/60" : ""}`}
                  onClick={() => onSelect(a)}
                >
                  <TableCell className="font-medium">{a.candidato_nome}</TableCell>
                  <TableCell>{a.vaga}</TableCell>
                  <TableCell className="text-center">
                    {pct !== undefined && pct !== null ? `${pct}%` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(a);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir análise?</AlertDialogTitle>
            <AlertDialogDescription>
              A análise de <strong>{deleteTarget?.candidato_nome}</strong> será excluída permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
