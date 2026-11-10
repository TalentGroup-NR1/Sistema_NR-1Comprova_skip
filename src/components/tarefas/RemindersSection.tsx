import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useReminders, useCreateReminder, useDeleteReminder } from "@/hooks/useTarefas";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  taskId: string;
  taskDueDate?: string | null;
}

export function RemindersSection({ taskId, taskDueDate }: Props) {
  const { data: reminders = [] } = useReminders(taskId);
  const create = useCreateReminder();
  const del = useDeleteReminder();
  const [custom, setCustom] = useState("");

  const add = (date: Date) => {
    create.mutate(
      { taskId, remindAt: date },
      {
        onSuccess: () => toast.success("Lembrete adicionado"),
        onError: (e: any) => toast.error(e.message || "Erro ao criar lembrete"),
      },
    );
  };

  const handleHoje9 = () => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
    add(d);
  };

  const handleDiaAntes = () => {
    if (!taskDueDate) {
      toast.error("Defina uma data limite primeiro");
      return;
    }
    const d = new Date(taskDueDate);
    d.setDate(d.getDate() - 1);
    add(d);
  };

  const handleAgora = () => add(new Date());

  const handleCustom = () => {
    if (!custom) return;
    add(new Date(custom));
    setCustom("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bell className="h-4 w-4" /> Lembretes
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={handleHoje9}>Hoje às 09:00</Button>
        <Button type="button" size="sm" variant="outline" onClick={handleDiaAntes}>1 dia antes</Button>
        <Button type="button" size="sm" variant="outline" onClick={handleAgora}>Lembrar agora</Button>
      </div>

      <div className="flex gap-2">
        <Input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <Button type="button" size="sm" onClick={handleCustom} disabled={!custom}>Adicionar</Button>
      </div>

      {reminders.length > 0 && (
        <ul className="space-y-1.5">
          {reminders.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs">
              <span>{new Date(r.remind_at).toLocaleString("pt-BR")}</span>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => del.mutate(r)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
