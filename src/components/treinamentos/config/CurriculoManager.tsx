import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Treinamento } from "@/hooks/useTreinamentos";
import {
  useCurriculo,
  useDeleteModulo,
  useDeleteAula,
  useReordenarAulas,
  useReordenarModulos,
  AulaTreinamento,
  ModuloTreinamento,
} from "@/hooks/useTreinamentoCurriculo";
import { useTreinamentoStats } from "@/hooks/useQuizAdmin";
import { ModuloFormDialog } from "./ModuloFormDialog";
import { AulaFormDialog } from "./AulaFormDialog";
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
import {
  Plus,
  Trash2,
  Pencil,
  ChevronUp,
  ChevronDown,
  FileText,
  Video,
  Link2,
  FileType2,
  LayoutList,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";

const tipoIcon: Record<string, any> = {
  video: Video,
  pdf: FileText,
  ppt: FileType2,
  arquivo: FileType2,
  link: Link2,
  texto: FileText,
};

interface Props {
  treinamento: Treinamento;
}

export function CurriculoManager({ treinamento }: Props) {
  const { data: modulos = [], isLoading } = useCurriculo(treinamento.id);
  const { data: stats } = useTreinamentoStats(treinamento.id);

  const deleteModulo = useDeleteModulo();
  const deleteAula = useDeleteAula();
  const reordenarAulas = useReordenarAulas();
  const reordenarModulos = useReordenarModulos();

  // Modais de Formulário
  const [moduloDialog, setModuloDialog] = useState<{
    open: boolean;
    modulo?: ModuloTreinamento | null;
  }>({ open: false, modulo: null });

  const [aulaDialog, setAulaDialog] = useState<{
    moduloId: string;
    ordem: number;
    aula?: AulaTreinamento | null;
  } | null>(null);

  // Modal de Confirmação de Exclusão
  const [confirmDelete, setConfirmDelete] = useState<
    | { tipo: "modulo"; id: string; nome: string; totalAulas: number }
    | { tipo: "aula"; id: string; nome: string }
    | null
  >(null);

  const certificadosEmitidos = stats?.certificadosCount ?? 0;

  const moverModulo = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= modulos.length) return;

    const novaLista = [...modulos];
    const [movido] = novaLista.splice(index, 1);
    novaLista.splice(target, 0, movido);

    const itens = novaLista.map((m, idx) => ({
      id: m.id,
      ordem: idx,
    }));

    await reordenarModulos.mutateAsync({
      treinamento_id: treinamento.id,
      itens,
    });
  };

  const moverAula = async (aulas: AulaTreinamento[], index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= aulas.length) return;

    const novaLista = [...aulas];
    const [movido] = novaLista.splice(index, 1);
    novaLista.splice(target, 0, movido);

    const itens = novaLista.map((a, idx) => ({
      id: a.id,
      ordem: idx,
    }));

    await reordenarAulas.mutateAsync({
      treinamento_id: treinamento.id,
      itens,
    });
  };

  const totalAulasGeral = modulos.reduce((acc, m) => acc + (m.aulas?.length || 0), 0);
  const duracaoTotalMinutos = modulos.reduce(
    (accM, m) =>
      accM +
      (m.aulas || []).reduce((accA, a) => accA + (a.duracao_minutos || 0), 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Banner de Impacto se houver certificados já emitidos (Passo 6) */}
      {certificadosEmitidos > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <AlertDescription className="text-sm">
            Este treinamento já possui <strong>{certificadosEmitidos}</strong> certificado(s) emitido(s).
            Alterações estruturais (adicionar, renomear ou remover aulas) afetarão o progresso de novos
            alunos, mas <strong>não invalidam</strong> os certificados que já foram emitidos anteriormente.
          </AlertDescription>
        </Alert>
      )}

      {/* Header do Gerenciador de Conteúdo */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LayoutList className="h-5 w-5 text-primary" />
              Currículo e Conteúdo do Curso
            </CardTitle>
            <CardDescription className="mt-1">
              Estruture o treinamento em módulos e aulas para cálculo de progresso derivado.
            </CardDescription>
          </div>
          <Button
            onClick={() => setModuloDialog({ open: true, modulo: null })}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Módulo
          </Button>
        </CardHeader>
        <CardContent>
          {!isLoading && (
            <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground pt-1 border-t">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-primary" />
                {modulos.length} módulo(s) cadastrado(s)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                {totalAulasGeral} aula(s) no total
              </span>
              {duracaoTotalMinutos > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary" />
                    {duracaoTotalMinutos} min de carga horária estimada
                  </span>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty State */}
      {modulos.length === 0 && !isLoading && (
        <div className="border border-dashed rounded-xl p-12 text-center bg-card">
          <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">Nenhum módulo criado</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-4">
            Crie o primeiro módulo para começar a organizar as aulas, vídeos, PDFs e materiais deste treinamento.
          </p>
          <Button onClick={() => setModuloDialog({ open: true, modulo: null })}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Módulo
          </Button>
        </div>
      )}

      {/* Lista de Módulos */}
      <div className="space-y-4">
        {modulos.map((modulo, mIdx) => {
          const moduloAulas = modulo.aulas || [];
          const duracaoModuloMin = moduloAulas.reduce(
            (acc, a) => acc + (a.duracao_minutos || 0),
            0
          );

          return (
            <Card key={modulo.id} className="overflow-hidden border-border/80">
              <CardHeader className="bg-muted/30 pb-3 border-b">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-bold">
                        Módulo {mIdx + 1}
                      </Badge>
                      <CardTitle className="text-base font-semibold truncate">
                        {modulo.titulo}
                      </CardTitle>
                    </div>
                    {modulo.descricao && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {modulo.descricao}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{moduloAulas.length} aula(s)</span>
                      {duracaoModuloMin > 0 && (
                        <span>• {duracaoModuloMin} min</span>
                      )}
                    </div>
                  </div>

                  {/* Ações do Módulo */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moverModulo(mIdx, -1)}
                      disabled={mIdx === 0 || reordenarModulos.isPending}
                      title="Mover módulo para cima"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moverModulo(mIdx, 1)}
                      disabled={mIdx === modulos.length - 1 || reordenarModulos.isPending}
                      title="Mover módulo para baixo"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setModuloDialog({ open: true, modulo })}
                      title="Editar módulo"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setConfirmDelete({
                          tipo: "modulo",
                          id: modulo.id,
                          nome: modulo.titulo,
                          totalAulas: moduloAulas.length,
                        })
                      }
                      title="Excluir módulo"
                      className="hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {moduloAulas.length === 0 ? (
                  <div className="p-4 text-center border border-dashed rounded-lg bg-background/50">
                    <p className="text-xs text-muted-foreground">
                      Nenhuma aula neste módulo ainda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {moduloAulas.map((aula, aIdx) => {
                      const Icon = tipoIcon[aula.tipo] || FileText;
                      return (
                        <div
                          key={aula.id}
                          className="flex items-center gap-3 rounded-lg border p-2.5 bg-background hover:border-primary/40 transition-colors"
                        >
                          <div className="p-2 rounded bg-muted/60 text-muted-foreground shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{aula.titulo}</p>
                              {aula.obrigatoria ? (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  Obrigatória
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">
                                  Opcional
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Tipo: <span className="uppercase">{aula.tipo}</span>
                              {aula.duracao_minutos ? ` • ${aula.duracao_minutos} min` : ""}
                              {aula.tipo === "texto" && aula.tempo_minimo_segundos > 0
                                ? ` • mín. ${aula.tempo_minimo_segundos}s`
                                : ""}
                            </p>
                          </div>

                          {/* Ações da Aula */}
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moverAula(moduloAulas, aIdx, -1)}
                              disabled={aIdx === 0 || reordenarAulas.isPending}
                              title="Subir aula"
                              className="h-8 w-8"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => moverAula(moduloAulas, aIdx, 1)}
                              disabled={aIdx === moduloAulas.length - 1 || reordenarAulas.isPending}
                              title="Descer aula"
                              className="h-8 w-8"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setAulaDialog({
                                  moduloId: modulo.id,
                                  ordem: aula.ordem,
                                  aula,
                                })
                              }
                              title="Editar aula"
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setConfirmDelete({
                                  tipo: "aula",
                                  id: aula.id,
                                  nome: aula.titulo,
                                })
                              }
                              title="Excluir aula"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setAulaDialog({
                      moduloId: modulo.id,
                      ordem: moduloAulas.length,
                      aula: null,
                    })
                  }
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Aula
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Modal de Módulo (Criação / Edição) */}
      {moduloDialog.open && (
        <ModuloFormDialog
          open={moduloDialog.open}
          onOpenChange={(v) => !v && setModuloDialog({ open: false, modulo: null })}
          treinamentoId={treinamento.id}
          moduloToEdit={moduloDialog.modulo}
          proximaOrdem={modulos.length}
        />
      )}

      {/* Modal de Aula (Criação / Edição) */}
      {aulaDialog && (
        <AulaFormDialog
          open={!!aulaDialog}
          onOpenChange={(v) => !v && setAulaDialog(null)}
          treinamentoId={treinamento.id}
          moduloId={aulaDialog.moduloId}
          proximaOrdem={aulaDialog.ordem}
          aulaToEdit={aulaDialog.aula}
        />
      )}

      {/* Modal de Confirmação de Exclusão com aviso de cascata (Passo 2.1) */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {confirmDelete?.tipo === "modulo" ? "módulo" : "aula"}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>
                  Tem certeza que deseja excluir <strong>"{confirmDelete?.nome}"</strong>?
                </div>
                {confirmDelete?.tipo === "modulo" && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs text-destructive font-medium">
                    {confirmDelete.totalAulas > 0 ? (
                      <span>
                        ⚠️ Atenção: Este módulo possui <strong>{confirmDelete.totalAulas}</strong> aula(s)
                        cadastrada(s) que também serão excluídas em cascata.
                      </span>
                    ) : (
                      <span>Este módulo não possui aulas cadastradas.</span>
                    )}
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.tipo === "modulo") {
                  await deleteModulo.mutateAsync({
                    id: confirmDelete.id,
                    treinamento_id: treinamento.id,
                  });
                } else {
                  await deleteAula.mutateAsync({
                    id: confirmDelete.id,
                    treinamento_id: treinamento.id,
                  });
                }
                setConfirmDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}