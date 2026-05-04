"use client";
import Link from "next/link";
import { useState } from "react";
import { Lock } from "lucide-react";
import type { Profile, Task, TaskStatus } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { STATUS_LABELS, STATUS_ORDER, formatCurrency, cn } from "@/lib/utils";

export function TaskKanban({
  tasks,
  profileMap,
  onStatusChange,
}: {
  tasks: Task[];
  profileMap: Map<string, Profile>;
  onStatusChange: (id: string, next: TaskStatus, prev: TaskStatus) => void;
}) {
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);

  function groupBy(s: TaskStatus) {
    return tasks.filter((t) => t.status === s);
  }

  function onDrop(e: React.DragEvent, target: TaskStatus) {
    e.preventDefault();
    setDragOver(null);
    const id = e.dataTransfer.getData("text/task-id");
    const from = e.dataTransfer.getData("text/task-status") as TaskStatus;
    if (!id || from === target) return;
    if (from === "paid_closed") return;
    onStatusChange(id, target, from);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((s) => (
        <div
          key={s}
          onDragOver={(e) => { e.preventDefault(); setDragOver(s); }}
          onDragLeave={() => setDragOver((d) => (d === s ? null : d))}
          onDrop={(e) => onDrop(e, s)}
          className={cn(
            "rounded-xl border bg-muted/30 p-3 flex flex-col gap-2 min-h-[200px] transition-colors",
            dragOver === s && "ring-2 ring-primary",
          )}
        >
          <div className="flex items-center justify-between px-1">
            <TaskStatusBadge status={s} />
            <span className="text-xs text-muted-foreground">{groupBy(s).length}</span>
          </div>
          <div className="space-y-2">
            {groupBy(s).map((t) => {
              const locked = t.status === "paid_closed";
              const assignee = t.assigned_to ? profileMap.get(t.assigned_to) : null;
              return (
                <div
                  key={t.id}
                  draggable={!locked}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/task-id", t.id);
                    e.dataTransfer.setData("text/task-status", t.status);
                  }}
                  className={cn(
                    "rounded-lg border bg-card p-3 shadow-sm hover:shadow transition-shadow",
                    !locked && "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <Link href={`/tasks/${t.id}`} className="font-medium hover:underline flex items-start gap-1">
                    {locked && <Lock className="h-3.5 w-3.5 text-green-600 mt-1 shrink-0" />}
                    <span className="line-clamp-2">{t.title}</span>
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1 truncate">{t.client_name}</div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-muted-foreground truncate">{assignee?.full_name ?? "بدون"}</span>
                    <span className="font-medium">{formatCurrency(t.price, t.currency ?? "EGP")}</span>
                  </div>
                </div>
              );
            })}
            {groupBy(s).length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-6">لا يوجد مهام في {STATUS_LABELS[s]}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
