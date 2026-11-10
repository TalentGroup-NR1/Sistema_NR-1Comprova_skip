import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import type { PlanoAcao, PlanoAcaoStatus } from "@/hooks/usePlanosAcao";
import { useUpdatePlanoAcao } from "@/hooks/usePlanosAcao";
import { useResponsaveisRH } from "@/hooks/useResponsaveisRH";
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
import { toast } from "sonner";

interface Props {
  planos: PlanoAcao[];
  onOpenPlano: (plano: PlanoAcao, forceStatus?: PlanoAcaoStatus) => void;
}

type Coluna = "riscos" | "execucao" | "concluidas";

const COLUNAS_STATUS: Record<Coluna, PlanoAcaoStatus[]> = {
  riscos: ["pendente"],
  execucao: ["planejado", "em_andamento", "atrasado"],
  concluidas: ["concluido"],
};

function statusToColuna(s: PlanoAcaoStatus): Coluna {
  if (s === "pendente") return "riscos";
  if (s === "concluido") return "concluidas";
  return "execucao";
}

export function KanbanBoard({ planos, onOpenPlano }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const updateMut = useUpdatePlanoAcao();
  const { data: responsaveis = [] } = useResponsaveisRH();
  const [confirmConclusao, setConfirmConclusao] = useState<string | null>(null);

  const grupos = useMemo(() => {
    const out: Record<Coluna, PlanoAcao[]> = { riscos: [], execucao: [], concluidas: [] };
    for (const p of planos) out[statusToColuna(p.status)].push(p);
    return out;
  }, [planos]);

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const plano = planos.find((p) => p.id === active.id);
    if (!plano) return;
    const colunaDestino = over.id as Coluna;
    const colunaOrigem = statusToColuna(plano.status);
    if (colunaDestino === colunaOrigem) return;

    // riscos -> execucao: abrir modal forçando preenchimento
    if (colunaOrigem === "riscos" && colunaDestino === "execucao") {
      onOpenPlano(plano, "planejado");
      return;
    }

    // execucao -> concluidas: confirmação
    if (colunaOrigem === "execucao" && colunaDestino === "concluidas") {
      setConfirmConclusao(plano.id);
      return;
    }

    // concluidas -> execucao: reabrir como em_andamento
    if (colunaOrigem === "concluidas" && colunaDestino === "execucao") {
      updateMut.mutate(
        { id: plano.id, status: "em_andamento" },
        {
          onSuccess: () => toast.success("Plano reaberto como Em Andamento"),
          onError: (err: any) => toast.error(err?.message ?? "Erro ao reabrir plano"),
        }
      );
      return;
    }

    // riscos -> concluidas: bloqueado (precisa preencher antes)
    if (colunaOrigem === "riscos" && colunaDestino === "concluidas") {
      toast.error("Preencha o plano antes de concluí-lo");
      onOpenPlano(plano, "planejado");
      return;
    }

    // concluidas -> riscos: não suportado
    if (colunaOrigem === "concluidas" && colunaDestino === "riscos") {
      toast.error("Use a coluna Em Execução para reabrir o plano");
      return;
    }
  }

  function handleConfirmConclusao() {
    if (!confirmConclusao) return;
    updateMut.mutate(
      { id: confirmConclusao, status: "concluido" },
      {
        onSuccess: () => toast.success("Plano marcado como concluído"),
        onError: (err: any) => toast.error(err?.message ?? "Erro ao concluir plano"),
      }
    );
    setConfirmConclusao(null);
  }

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-col lg:flex-row gap-4">
          <KanbanColumn
            id="riscos"
            title="🚨 Riscos Identificados"
            count={grupos.riscos.length}
            accentClass="border-red-300"
          >
            {grupos.riscos.length === 0 && (
              <div className="text-xs text-muted-foreground italic text-center py-6">
                Nenhum risco pendente.
              </div>
            )}
            {grupos.riscos.map((p) => (
              <KanbanCard key={p.id} plano={p} onClick={() => onOpenPlano(p)} responsaveis={responsaveis} />
            ))}
          </KanbanColumn>

          <KanbanColumn
            id="execucao"
            title="🚧 Planos em Execução"
            count={grupos.execucao.length}
            accentClass="border-blue-300"
          >
            {grupos.execucao.length === 0 && (
              <div className="text-xs text-muted-foreground italic text-center py-6">
                Nenhum plano em execução.
              </div>
            )}
            {grupos.execucao.map((p) => (
              <KanbanCard key={p.id} plano={p} onClick={() => onOpenPlano(p)} responsaveis={responsaveis} />
            ))}
          </KanbanColumn>

          <KanbanColumn
            id="concluidas"
            title="✅ Ações Concluídas"
            count={grupos.concluidas.length}
            accentClass="border-green-300"
          >
            {grupos.concluidas.length === 0 && (
              <div className="text-xs text-muted-foreground italic text-center py-6">
                Nenhuma ação concluída.
              </div>
            )}
            {grupos.concluidas.map((p) => (
              <KanbanCard key={p.id} plano={p} onClick={() => onOpenPlano(p)} responsaveis={responsaveis} />
            ))}
          </KanbanColumn>
        </div>
      </DndContext>

      <AlertDialog open={!!confirmConclusao} onOpenChange={(v) => !v && setConfirmConclusao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Concluir plano de ação?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano será movido para Ações Concluídas e a data de conclusão será registrada como hoje.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConclusao}>Confirmar conclusão</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
