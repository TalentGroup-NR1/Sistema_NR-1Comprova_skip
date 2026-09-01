import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Treinamento } from "@/hooks/useTreinamentos";
import {
  useCurriculo,
  useCreateModulo,
  useUpdateModulo,
  useDeleteModulo,
  useDeleteAula,
  useReordenarAulas,
  useReordenarModulos,
  TreinamentoAula,
} from "@/hooks/useTreinamentoCurriculo";
import { AulaFormDialog } from "./AulaFormDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Trash2, Pencil, ChevronUp, ChevronDown, FileText, Video, Link2, FileType2, LayoutList,
} from "lucide-react";

const tipoIcon: Record<string, any> = {
  video: Video,
  pdf: FileText,
  ppt: FileType2,
  link: Link2,
  texto: FileText,
};

interface Props {
  treinamento: Treinamento;
}

export function CurriculoManager({ treinamento }: Props) {
  const { data: modulos = [], isLoading } = useCurriculo(treinamento.id);
  const createModulo = useCreateModulo();
  const updateModulo = useUpdateModulo();
  const deleteModulo = useDeleteModulo();
  const deleteAula = useDeleteAula();
  const reordenarAulas = useReordenarAulas();
  const reordenarModulos = useReordenarModulos();

  const [novoModulo, setNovoModulo] = useState("");
  const [editandoModuloId, setEditandoModuloId] = useState<string | null>(null);
  const [tituloEdit, setTituloEdit] = useState("");
  const [aulaDialog, setAulaDialog] = useState<{ moduloId: string; ordem: number; aula?: TreinamentoAula | null } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ tipo: "modulo" | "aula"; id: string; nome: string } | null>(null);

  const handleAddModulo = async () => {
    if (!novoModulo.trim()) return;
    await createModulo.mutateAsync({
      treinamento_id: treinamento.id,
      company_id: treinamento.company_id,
      titulo: novoModulo.trim(),
      ordem: modulos.length,
    });
    setNovoModulo("");
  };

  const moverModulo = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= modulos.length) return;
    await reordenarModulos.mutateAsync({
      treinamento_id: treinamento.id,
      itens: [
        { id: modulos[index].id, ordem: target },
        { id: modulos[target].id, ordem: index },
      ],
    });
  };

  const moverAula = async (aulas: TreinamentoAula[], index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= aulas.length) return;
    await reordenarAulas.mutateAsync({
      treinamento_id: treinamento.id,
      itens: [
        { id: aulas[index].id, ordem: target },
        { id: aulas[target].id, ordem: index },
      ],
    });
  };

  const totalAulas = modulos.reduce((acc, m) => acc + m.aulas.length, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            Currículo do curso
          </CardTitle>
          <CardDescription>
            Organize o treinamento em módulos e aulas. Se nenhum módulo for criado, o treinamento continua sendo exibido
            como conteúdo único.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do novo módulo (ex.: Módulo 1 - Fundamentos)"
              value={novoModulo}
              onChange={(e) => setNovoModulo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddModulo()}
            />
            <Button onClick={handleAddModulo} disabled={!novoModulo.trim() || createModulo.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar módulo
            </Button>
          </div>
          {!isLoading && (
            <p className="text-sm text-muted-foreground">
              {modulos.length} módulo(s) • {totalAulas} aula(s)
            </p>
          )}
        </CardContent>
      </Card>

      {modulos.map((modulo, mIdx) => (
        <Card key={modulo.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {editandoModuloId === modulo.id ? (
                  <div className="flex gap-2">
                    <Input value={tituloEdit} onChange={(e) => setTituloEdit(e.target.value)} />
                    <Button
                      size="sm"
                      onClick={async () => {
                        await updateModulo.mutateAsync({ id: modulo.id, treinamento_id: treinamento.id, titulo: tituloEdit });
                        setEditandoModuloId(null);
                      }}
                    >
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditandoModuloId(null)}>Cancelar</Button>
                  </div>
                ) : (
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge variant="outline">{mIdx + 1}</Badge>
                    {modulo.titulo}
                    <span className="text-xs font-normal text-muted-foreground">
                      {modulo.aulas.length} aula(s)
                    </span>
                  </CardTitle>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => moverModulo(mIdx, -1)} disabled={mIdx === 0}>
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => moverModulo(mIdx, 1)} disabled={mIdx === modulos.length - 1}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setEditandoModuloId(modulo.id); setTituloEdit(modulo.titulo); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setConfirmDelete({ tipo: "modulo", id: modulo.id, nome: modulo.titulo })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {modulo.aulas.map((aula, aIdx) => {
              const Icon = tipoIcon[aula.tipo] || FileText;
              return (
                <div key={aula.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{aula.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {aula.tipo}
                      {aula.duracao_estimada_minutos ? ` • ${aula.duracao_estimada_minutos} min` : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => moverAula(modulo.aulas, aIdx, -1)} disabled={aIdx === 0}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => moverAula(modulo.aulas, aIdx, 1)}
                    disabled={aIdx === modulo.aulas.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAulaDialog({ moduloId: modulo.id, ordem: aula.ordem, aula })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setConfirmDelete({ tipo: "aula", id: aula.id, nome: aula.titulo })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAulaDialog({ moduloId: modulo.id, ordem: modulo.aulas.length, aula: null })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar aula
            </Button>
          </CardContent>
        </Card>
      ))}

      {aulaDialog && (
        <AulaFormDialog
          open={!!aulaDialog}
          onOpenChange={(v) => !v && setAulaDialog(null)}
          treinamentoId={treinamento.id}
          companyId={treinamento.company_id}
          moduloId={aulaDialog.moduloId}
          proximaOrdem={aulaDialog.ordem}
          aula={aulaDialog.aula}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {confirmDelete?.tipo === "modulo" ? "módulo" : "aula"}?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.nome}" será removido permanentemente
              {confirmDelete?.tipo === "modulo" ? ", incluindo todas as aulas do módulo." : "."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.tipo === "modulo") {
                  await deleteModulo.mutateAsync({ id: confirmDelete.id, treinamento_id: treinamento.id });
                } else {
                  await deleteAula.mutateAsync({ id: confirmDelete.id, treinamento_id: treinamento.id });
                }
                setConfirmDelete(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
