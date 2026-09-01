import { useMemo, useState } from "react";
import { Plus, ListChecks } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskList } from "@/components/tarefas/TaskList";
import { TaskFormDialog } from "@/components/tarefas/TaskFormDialog";
import {
  useTarefas,
  useToggleConcluida,
  useDeleteTarefa,
  useReorderTarefas,
  type Task,
} from "@/hooks/useTarefas";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type TabKey = "hoje" | "semana" | "todas" | "concluidas";

function isToday(d: Date) {
  const n = new Date();
  return d.toDateString() === n.toDateString();
}
function isThisWeek(d: Date) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return d >= start && d < end;
}

export default function MinhasTarefas() {
  const { data: tasks = [], isLoading } = useTarefas();
  const { user } = useAuth();
  const toggle = useToggleConcluida();
  const del = useDeleteTarefa();
  const reorder = useReorderTarefas();
  const [tab, setTab] = useState<TabKey>("hoje");
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  // Reminder presence map
  const { data: reminderTaskIds = new Set<string>() } = useQuery({
    queryKey: ["task-reminders-index", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks_reminders" as any).select("task_id");
      if (error) throw error;
      return new Set((data ?? []).map((r: any) => r.task_id as string));
    },
  });

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tab === "concluidas") return t.status === "concluida";
      if (t.status === "concluida") return false;
      if (tab === "todas") return true;
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      if (tab === "hoje") return isToday(d);
      if (tab === "semana") return isThisWeek(d);
      return false;
    });
  }, [tasks, tab]);

  const handleNew = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (t: Task) => {
    setEditing(t);
    setOpen(true);
  };

  const handleDelete = (t: Task) => {
    if (!confirm(`Excluir "${t.title}"?`)) return;
    del.mutate(t, {
      onSuccess: () => toast.success("Tarefa excluída"),
      onError: (e: any) => toast.error(e?.message || "Erro ao excluir"),
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ListChecks className="h-6 w-6" /> Minhas Tarefas
            </h1>
            <p className="text-sm text-muted-foreground">Organize seu dia. Apenas você vê suas tarefas.</p>
          </div>
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        </header>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="hoje">Hoje</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="concluidas">Concluídas</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <TaskList
                tasks={filtered}
                reminderTaskIds={reminderTaskIds as Set<string>}
                onToggle={(t) => toggle.mutate(t)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onReorder={(ids) => reorder.mutate(ids)}
              />
            )}
          </TabsContent>
        </Tabs>

        <TaskFormDialog open={open} onOpenChange={setOpen} task={editing} />
      </div>
    </MainLayout>
  );
}
