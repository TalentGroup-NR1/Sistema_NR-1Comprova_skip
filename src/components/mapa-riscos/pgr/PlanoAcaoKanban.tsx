import React, { useState } from "react";
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent,
  useDroppable,
  pointerWithin,
  type CollisionDetection
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  useAcoesPgr, 
  useUpdateAcao, 
  useDeleteAcao,
  useSincronizarAcoes, 
  PgrPlanoAcao, 
  calcularProgresso5W2H 
} from "@/hooks/usePgrAcoes";
import { mapColumnToStatus, resolveTargetStatus } from "@/lib/statusMapper";
import { usePgrImportacoes } from "@/hooks/usePgrImportacao";
import { AcaoDialog } from "./AcaoDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
import { CalendarIcon, PaperclipIcon, Trash2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const COLUNAS = [
  { id: "pendente", title: "Pendente", color: "border-l-4 border-l-slate-400" },
  { id: "em_andamento", title: "Em Andamento", color: "border-l-4 border-l-blue-400" },
  { id: "concluida", title: "Concluída", color: "border-l-4 border-l-green-400" },
  { id: "validada", title: "Eficácia verificada", color: "border-l-4 border-l-purple-400" },
];

const collisionDetectionStrategy: CollisionDetection = (args) => {
  // 1) Se o ponteiro estiver dentro de uma COLUNA, resolve para a coluna (determinístico)
  const pointer = pointerWithin(args);
  const coluna = pointer.find(c => COLUNAS.some(col => col.id === c.id));
  if (coluna) return [coluna];
  // 2) Fallback: cantos mais próximos (reordenação dentro da coluna / soltar sobre card)
  return closestCorners(args);
};

function SortableItem({ 
  acao, 
  onClick,
  onDelete
}: { 
  acao: PgrPlanoAcao; 
  onClick: () => void;
  onDelete: (acao: PgrPlanoAcao) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: acao.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    touchAction: 'none'
  };

  const progresso = calcularProgresso5W2H(acao);
  const badgeColor = progresso.completo 
    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" 
    : progresso.preenchidos > 0 
      ? "bg-amber-500 hover:bg-amber-600 text-white border-transparent" 
      : "text-muted-foreground";

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="group relative mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      {/* Botão de exclusão (lixeira) */}
      <button
        type="button"
        className="absolute top-2 right-2 p-1 rounded opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-red-100 z-10"
        onClick={(e) => {
          e.stopPropagation(); // NÃO abrir o dialog de edição
          onDelete(acao);
        }}
        title="Excluir ação"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-600" />
      </button>

      <CardContent className="p-3 space-y-2 pr-7">
        <p className="text-sm font-medium leading-tight">{acao.acao}</p>

        {/* Badge do risco (se acao.risco_id || acao.pgr_riscos) */}
        {acao.pgr_riscos?.nome && (
          <Badge
            variant="outline"
            className="text-xs gap-1 mt-1 text-muted-foreground max-w-full truncate inline-flex items-center"
            title={`Esta ação mitiga: ${acao.pgr_riscos.nome}`}
          >
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {acao.pgr_riscos.nome.slice(0, 40)}
              {acao.pgr_riscos.nome.length > 40 ? "..." : ""}
            </span>
          </Badge>
        )}
        
        <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground mt-2">
          <div className="flex gap-2">
            {acao.prioridade === 'alta' && <Badge variant="destructive" className="text-[10px]">Alta</Badge>}
            {acao.prioridade === 'media' && <Badge variant="secondary" className="text-[10px]">Média</Badge>}
            {acao.prioridade === 'baixa' && <Badge variant="outline" className="text-[10px]">Baixa</Badge>}
            
            <Badge variant="outline" className={`text-[10px] ${badgeColor}`}>
              5W2H: {progresso.preenchidos}/{progresso.total}
            </Badge>
          </div>
          
          <div className="flex gap-2">
            {acao.prazo && <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {new Date(acao.prazo).toLocaleDateString()}</span>}
            {acao.evidencia_url && <PaperclipIcon className="w-3 h-3" />}
          </div>
        </div>
        
        {acao.colaboradores && (
          <p className="text-xs text-muted-foreground truncate">
            Resp: {acao.colaboradores?.full_name ?? "Sem responsável"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function DroppableColumn({ 
  coluna, 
  acoesDaColuna, 
  setSelectedAcao,
  setAcaoParaExcluir
}: { 
  coluna: typeof COLUNAS[0], 
  acoesDaColuna: PgrPlanoAcao[], 
  setSelectedAcao: (acao: PgrPlanoAcao) => void,
  setAcaoParaExcluir: (acao: PgrPlanoAcao) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id });

  return (
    <div 
      ref={setNodeRef} 
      className={`bg-muted/50 rounded-lg p-3 min-w-[280px] border-2 transition-colors ${
        isOver ? 'border-primary/50 bg-primary/5' : 'border-transparent'
      }`}
    >
      <div className={`mb-3 pb-2 border-b-2 font-semibold flex items-center justify-between ${coluna.color}`}>
        <span className="pl-2">{coluna.title}</span>
        <Badge variant="outline" className="bg-background">{acoesDaColuna.length}</Badge>
      </div>
      
      {/* O id do contexto sortable é o id da coluna, para permitir soltar na área vazia */}
      <SortableContext id={coluna.id} items={acoesDaColuna.map(a => a.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[240px]" style={{ touchAction: "none" }}>
          {acoesDaColuna.map(acao => (
            <SortableItem 
              key={acao.id} 
              acao={acao} 
              onClick={() => setSelectedAcao(acao)} 
              onDelete={setAcaoParaExcluir}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function PlanoAcaoKanban({ pgrImportacaoId }: { pgrImportacaoId: string }) {
  const { data: acoes, isLoading } = useAcoesPgr(pgrImportacaoId);
  const { data: importacoes } = usePgrImportacoes();
  const updateMutation = useUpdateAcao();
  const deleteAcao = useDeleteAcao();
  const syncMutation = useSincronizarAcoes();
  const { role, activeRole } = useAuth();
  const currentRole = activeRole ?? role;
  const isGestor = currentRole === 'gestor_departamento';
  
  const [dialogCriacao, setDialogCriacao] = useState(false);
  const [acaoEdicao, setAcaoEdicao] = useState<PgrPlanoAcao | null>(null);
  const [acaoParaExcluir, setAcaoParaExcluir] = useState<PgrPlanoAcao | null>(null);
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);

  const pgr = importacoes?.find(i => i.id === pgrImportacaoId);
  const jsonAcoes = pgr?.plano_acao || pgr?.extracao_raw?.plano_acao;
  const jsonHasAcoes = Array.isArray(jsonAcoes) && jsonAcoes.length > 0;

  // Gatilho automático retroativo (apenas para não-gestores)
  React.useEffect(() => {
    if (
      !isGestor &&
      !isLoading && 
      (!acoes || acoes.length === 0) && 
      pgr?.status === "confirmado" && 
      jsonHasAcoes && 
      !hasAttemptedSync &&
      !syncMutation.isPending
    ) {
      setHasAttemptedSync(true);
      syncMutation.mutate(pgrImportacaoId);
    }
  }, [isGestor, acoes, isLoading, pgr?.status, jsonHasAcoes, hasAttemptedSync, pgrImportacaoId, syncMutation]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (isGestor) {
      toast.error("Gestor de departamento possui acesso somente leitura ao plano de ação.");
      return;
    }

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const acaoId = active.id as string;
    const overId = over.id as string;

    const acao = acoes?.find(a => a.id === acaoId);
    if (!acao) return;

    const newStatus = resolveTargetStatus(overId, acoes);
    // Drag-and-drop validado: over.id normalizado por resolveTargetStatus

    if (!newStatus) {
      toast.error(`Coluna de destino inválida (over.id: ${overId})`);
      return;
    }

    if (acao.status === newStatus) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: acao.id,
        pgrImportacaoId,
        updates: { status: newStatus },
        mensagemLog: `Status alterado de ${acao.status} para ${newStatus}`
      });
      toast.success(`Ação movida para ${newStatus}`);
    } catch (err: any) {
      toast.error(`Erro ao mover: ${err.message}`);
    }
  };

  if (isLoading || syncMutation.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  const total = acoes?.length || 0;
  const isVazio = total === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-bold">Plano de Ação ({total})</h2>
        <div className="flex gap-2 items-center">
          {!isGestor && jsonHasAcoes && isVazio && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => syncMutation.mutate(pgrImportacaoId)}
              disabled={syncMutation.isPending}
            >
              Sincronizar Ações
            </Button>
          )}
          {!isGestor && (
            <Button 
              onClick={() => setDialogCriacao(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              + Nova Ação
            </Button>
          )}
        </div>
      </div>

      {isVazio ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/30">
          <p className="text-muted-foreground text-sm">
            {jsonHasAcoes 
              ? "Nenhuma ação encontrada na base ativa. Clique em Sincronizar Ações."
              : "Nenhuma ação identificada no PGR. Adicione manualmente para iniciar."}
          </p>
          {jsonHasAcoes && (
            <Button 
              className="mt-4"
              onClick={() => syncMutation.mutate(pgrImportacaoId)}
              disabled={syncMutation.isPending}
            >
              Sincronizar Agora
            </Button>
          )}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={collisionDetectionStrategy} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 overflow-x-auto pb-4">
            {COLUNAS.map(coluna => {
              const acoesDaColuna = acoes?.filter(a => a.status === coluna.id) || [];
              
              return (
                <DroppableColumn 
                  key={coluna.id} 
                  coluna={coluna} 
                  acoesDaColuna={acoesDaColuna} 
                  setSelectedAcao={setAcaoEdicao}
                  setAcaoParaExcluir={setAcaoParaExcluir}
                />
              );
            })}
          </div>
        </DndContext>
      )}

      {/* Diálogos de Criação e Edição */}
      <AcaoDialog
        open={dialogCriacao}
        onOpenChange={setDialogCriacao}
        pgrImportacaoId={pgrImportacaoId}
        acao={undefined}
      />
      <AcaoDialog
        open={!!acaoEdicao}
        onOpenChange={(o) => !o && setAcaoEdicao(null)}
        pgrImportacaoId={pgrImportacaoId}
        acao={acaoEdicao}
      />

      {/* Diálogo de Exclusão de Ação */}
      <AlertDialog
        open={!!acaoParaExcluir}
        onOpenChange={(o) => !o && setAcaoParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ação</AlertDialogTitle>
            <AlertDialogDescription>
              Você vai excluir a ação:{" "}
              <strong>{acaoParaExcluir?.acao.slice(0, 120)}</strong>
              {(acaoParaExcluir?.acao.length ?? 0) > 120 ? "..." : ""}
              <br /><br />
              A exclusão é permanente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!acaoParaExcluir) return;
                deleteAcao.mutate(
                  { 
                    id: acaoParaExcluir.id,
                    pgr_importacao_id: pgrImportacaoId 
                  },
                  {
                    onSuccess: () => {
                      toast.success("Ação excluída.");
                      setAcaoParaExcluir(null);
                    },
                    onError: (e) => {
                      toast.error(e.message);
                      setAcaoParaExcluir(null);
                    }
                  }
                );
              }}
              disabled={deleteAcao.isPending}
            >
              {deleteAcao.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
