import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Pencil, Trash2, Bell, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Task } from "@/hooks/useTarefas";

interface Props {
  task: Task;
  hasReminder?: boolean;
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
}

const priorityStyles: Record<Task["priority"], string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  alta: "bg-destructive/10 text-destructive",
};

const priorityLabels: Record<Task["priority"], string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

function formatDue(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function TaskItem({ task, hasReminder, onToggle, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const done = task.status === "concluida";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-all",
        isDragging && "opacity-60 shadow-lg",
        done && "opacity-70",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground"
        aria-label="Arrastar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => onToggle(task)}
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
          done
            ? "scale-110 border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary",
        )}
        aria-label={done ? "Marcar como pendente" : "Marcar como concluída"}
      >
        <Check className={cn("h-4 w-4 transition-all duration-200", done ? "scale-100 opacity-100" : "scale-0 opacity-0")} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("truncate text-sm font-medium", done && "line-through text-muted-foreground")}>{task.title}</p>
          {hasReminder && <Bell className="h-3.5 w-3.5 text-primary shrink-0" />}
        </div>
        {task.description && (
          <p className="truncate text-xs text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={cn("text-[10px]", priorityStyles[task.priority])}>
            {priorityLabels[task.priority]}
          </Badge>
          {task.category && <Badge variant="outline" className="text-[10px]">{task.category}</Badge>}
          {task.due_date && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {formatDue(task.due_date)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(task)} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(task)} aria-label="Excluir">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
