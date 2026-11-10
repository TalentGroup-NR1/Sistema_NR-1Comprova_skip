import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { taskSchema, type Task, type TaskFormValues, useCreateTarefa, useUpdateTarefa } from "@/hooks/useTarefas";
import { toast } from "sonner";
import { RemindersSection } from "./RemindersSection";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  task?: Task | null;
}

const empty: TaskFormValues = { title: "", description: "", due_date: "", priority: "media", category: "" };

export function TaskFormDialog({ open, onOpenChange, task }: Props) {
  const create = useCreateTarefa();
  const update = useUpdateTarefa();

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: empty,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        task
          ? {
              title: task.title,
              description: task.description ?? "",
              due_date: task.due_date ? task.due_date.slice(0, 16) : "",
              priority: task.priority,
              category: task.category ?? "",
            }
          : empty,
      );
    }
  }, [open, task, form]);

  const onSubmit = async (values: TaskFormValues) => {
    try {
      const due = values.due_date ? new Date(values.due_date).toISOString() : null;
      if (task) {
        await update.mutateAsync({ id: task.id, values: { ...values, due_date: due }, original: task });
        toast.success("Tarefa atualizada");
      } else {
        await create.mutateAsync({ ...values, due_date: due });
        toast.success("Tarefa criada");
        onOpenChange(false);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input id="title" {...form.register("title")} placeholder="O que precisa ser feito?" />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" rows={2} {...form.register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due_date">Data limite</Label>
              <Input id="due_date" type="datetime-local" {...form.register("due_date")} />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.watch("priority")} onValueChange={(v) => form.setValue("priority", v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input id="category" {...form.register("category")} placeholder="Ex: Pessoal, Trabalho..." />
          </div>

          {task && (
            <div className="rounded-xl border border-border p-3">
              <RemindersSection taskId={task.id} taskDueDate={task.due_date} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {task ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
