import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { assertOwnership } from "@/lib/tarefasAuthz";

export type TaskPriority = "baixa" | "media" | "alta";
export type TaskStatus = "pendente" | "concluida";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  category: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  remind_at: string;
  notified_at: string | null;
  created_at: string;
}

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Título obrigatório").max(200),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  due_date: z.string().optional().nullable(),
  priority: z.enum(["baixa", "media", "alta"]).default("media"),
  category: z.string().trim().max(80).optional().or(z.literal("")),
});
export type TaskFormValues = z.infer<typeof taskSchema>;

const KEY = ["tarefas"] as const;

export function useTarefas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks" as any)
        .select("*")
        .order("status", { ascending: true })
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Task[];
    },
  });
}

export function useReminders(taskId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["task-reminders", taskId, user?.id],
    enabled: !!taskId && !!user?.id,
    queryFn: async (): Promise<TaskReminder[]> => {
      const { data, error } = await supabase
        .from("tasks_reminders" as any)
        .select("*")
        .eq("task_id", taskId!)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TaskReminder[];
    },
  });
}

export function useCreateTarefa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (values: TaskFormValues) => {
      if (!user?.id) throw new Error("Não autenticado");
      const parsed = taskSchema.parse(values);
      const payload = {
        user_id: user.id,
        title: parsed.title,
        description: parsed.description || null,
        due_date: parsed.due_date || null,
        priority: parsed.priority,
        category: parsed.category || null,
        status: "pendente" as TaskStatus,
        position: Date.now() % 1_000_000_000,
      };
      const { data, error } = await supabase.from("tasks" as any).insert(payload).select().single();
      if (error) throw error;
      return data as unknown as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateTarefa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, values, original }: { id: string; values: Partial<TaskFormValues>; original: Task }) => {
      assertOwnership(original, user?.id);
      const patch: Record<string, unknown> = {};
      if (values.title !== undefined) patch.title = values.title.trim();
      if (values.description !== undefined) patch.description = values.description?.trim() || null;
      if (values.due_date !== undefined) patch.due_date = values.due_date || null;
      if (values.priority !== undefined) patch.priority = values.priority;
      if (values.category !== undefined) patch.category = values.category?.trim() || null;
      const { data, error } = await supabase.from("tasks" as any).update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as Task;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteTarefa() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (task: Task) => {
      assertOwnership(task, user?.id);
      const { error } = await supabase.from("tasks" as any).delete().eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useToggleConcluida() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (task: Task) => {
      assertOwnership(task, user?.id);
      const newStatus: TaskStatus = task.status === "concluida" ? "pendente" : "concluida";
      const { error } = await supabase
        .from("tasks" as any)
        .update({ status: newStatus, completed_at: newStatus === "concluida" ? new Date().toISOString() : null })
        .eq("id", task.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useReorderTarefas() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!user?.id) throw new Error("Não autenticado");
      // Update positions sequentially; RLS guarantees only own tasks succeed.
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from("tasks" as any).update({ position: idx }).eq("id", id),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ taskId, remindAt }: { taskId: string; remindAt: Date }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("tasks_reminders" as any).insert({
        task_id: taskId,
        user_id: user.id,
        remind_at: remindAt.toISOString(),
        notified_at: remindAt.getTime() <= Date.now() ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["task-reminders", vars.taskId] });
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reminder: TaskReminder) => {
      const { error } = await supabase.from("tasks_reminders" as any).delete().eq("id", reminder.id);
      if (error) throw error;
      return reminder;
    },
    onSuccess: (reminder) => {
      qc.invalidateQueries({ queryKey: ["task-reminders", reminder.task_id] });
    },
  });
}
