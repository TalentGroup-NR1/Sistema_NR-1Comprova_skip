import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface Props {
  id: string;
  title: string;
  count: number;
  accentClass?: string;
  children: ReactNode;
}

export function KanbanColumn({ id, title, count, accentClass = "border-slate-300", children }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] rounded-xl border-2 ${accentClass} bg-muted/30 p-3 flex flex-col transition-colors ${
        isOver ? "bg-muted/60 ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center justify-between pb-3 mb-2 border-b">
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="text-xs bg-background border rounded-full px-2 py-0.5 font-medium">{count}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[200px]">{children}</div>
    </div>
  );
}
