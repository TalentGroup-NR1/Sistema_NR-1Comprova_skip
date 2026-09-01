import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Polls every 60s for due task reminders belonging to the current user.
 * Marks them as notified to avoid duplicate toasts.
 */
export function useTaskReminderWatcher() {
  const { user } = useAuth();
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const { data, error } = await supabase
          .from("tasks_reminders" as any)
          .select("id, task_id, remind_at, tasks:task_id(title)")
          .lte("remind_at", new Date().toISOString())
          .is("notified_at", null);
        if (error || cancelled || !data) return;
        for (const r of data as any[]) {
          if (seen.current.has(r.id)) continue;
          seen.current.add(r.id);
          const title = r.tasks?.title || "Tarefa";
          toast(`🔔 Lembrete: ${title}`);
          await supabase
            .from("tasks_reminders" as any)
            .update({ notified_at: new Date().toISOString() })
            .eq("id", r.id);
        }
      } catch {
        // silent
      }
    };

    tick();
    const id: ReturnType<typeof setInterval> = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id]);
}
