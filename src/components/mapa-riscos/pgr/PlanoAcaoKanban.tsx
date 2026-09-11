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
import { useAcoesPgr, useUpdateAcao, useSincronizarAcoes, PgrPlanoAcao } from "@/hooks/usePgrAcoes";
import { mapColumnToStatus, resolveTargetStatus } from "@/lib/statusMapper";
import { usePgrImportacoes } from "@/hooks/usePgrImportacao";
import { AcaoDialog } from "./AcaoDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PaperclipIcon } from "lucide-react";
import { toast } from "sonner";

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

function SortableItem({ acao, onClick }: { acao: PgrPlanoAcao; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: acao.id });
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    touchAction: 'none'
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className="mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        <p className="text-sm font-medium leading-tight">{acao.acao}</p>
        
        <div className="flex flex-wrap gap-2 items-center justify-between text-xs text-muted-foreground mt-2">
          {acao.prioridade === 'alta' && <Badge variant="destructive" className="text-[10px]">Alta</Badge>}
          {acao.prioridade === 'media' && <Badge variant="secondary" className="text-[10px]">Média</Badge>}
          {acao.prioridade === 'baixa' && <Badge variant="outline" className="text-[10px]">Baixa</Badge>}
          
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
  setSelectedAcao 
}: { 
  coluna: typeof COLUNAS[0], 
  acoesDaColuna: PgrPlanoAcao[], 
  setSelectedAcao: (acao: PgrPlanoAcao) => void 
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
            <SortableItem key={acao.id} acao={acao} onClick={() => setSelectedAcao(acao)} />
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
  const syncMutation = useSincronizarAcoes();
  
  const [selectedAcao, setSelectedAcao] = useState<PgrPlanoAcao | null>(null);
  const [hasAttemptedSync, setHasAttemptedSync] = useState(false);

  const pgr = importacoes?.find(i => i.id === pgrImportacaoId);
  const jsonAcoes = pgr?.plano_acao || pgr?.extracao_raw?.plano_acao;
  const jsonHasAcoes = Array.isArray(jsonAcoes) && jsonAcoes.length > 0;

  // Gatilho automático retroativo
  React.useEffect(() => {
    if (
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
  }, [acoes, isLoading, pgr?.status, jsonHasAcoes, hasAttemptedSync, pgrImportacaoId, syncMutation]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
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

  const isVazio = !acoes || acoes.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Gestão do Plano de Ação (Kanban)</h2>
        <div className="flex gap-2 items-center">
          {jsonHasAcoes && isVazio && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => syncMutation.mutate(pgrImportacaoId)}
              disabled={syncMutation.isPending}
            >
              Sincronizar Ações
            </Button>
          )}
          <Badge variant="secondary">Total: {acoes?.length || 0} ações</Badge>
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
                setSelectedAcao={setSelectedAcao} 
              />
            );
          })}
        </div>
      </DndContext>

      )}
      <AcaoDialog acao={selectedAcao} open={!!selectedAcao} onOpenChange={(open) => !open && setSelectedAcao(null)} />
    </div>
  );
}
