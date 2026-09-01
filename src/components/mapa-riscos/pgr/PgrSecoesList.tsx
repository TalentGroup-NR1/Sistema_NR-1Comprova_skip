import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PgrSecao } from "@/hooks/usePgrSecoes";

interface Props {
  secoes: PgrSecao[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string, ativo: boolean) => void;
  onReorder: (secoes: PgrSecao[]) => void;
  onNova: () => void;
}

function Item({
  secao,
  selected,
  onSelect,
  onToggle,
}: {
  secao: PgrSecao;
  selected: boolean;
  onSelect: () => void;
  onToggle: (ativo: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: secao.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2 bg-card",
        selected && "border-primary ring-1 ring-primary",
        !secao.ativo && "opacity-60"
      )}
    >
      <button
        type="button"
        className="cursor-grab text-muted-foreground touch-none"
        {...attributes}
        {...listeners}
        aria-label="Arrastar seção"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button type="button" onClick={onSelect} className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">{secao.numero ?? "—"}</span>
          <span className="text-sm font-medium truncate">{secao.titulo}</span>
        </div>
        <Badge variant={secao.tipo === "automatico" ? "secondary" : "outline"} className="mt-1 text-[10px]">
          {secao.tipo === "automatico" ? "Preenchida pelo sistema" : "Texto editável"}
        </Badge>
      </button>
      <Switch checked={secao.ativo} onCheckedChange={onToggle} aria-label="Incluir no PDF" />
    </div>
  );
}

export function PgrSecoesList({ secoes, selectedId, onSelect, onToggle, onReorder, onNova }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = secoes.findIndex((s) => s.id === active.id);
    const newIndex = secoes.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(secoes, oldIndex, newIndex).map((s, i) => ({ ...s, ordem: i + 1 }));
    onReorder(next);
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={secoes.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {secoes.map((s) => (
              <Item
                key={s.id}
                secao={s}
                selected={s.id === selectedId}
                onSelect={() => onSelect(s.id)}
                onToggle={(a) => onToggle(s.id, a)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <Button variant="outline" size="sm" className="w-full" onClick={onNova}>
        <Plus className="h-4 w-4 mr-1" /> Nova seção
      </Button>
    </div>
  );
}
