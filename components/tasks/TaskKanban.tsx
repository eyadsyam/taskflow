"use client";
import Link from "next/link";
import { useState } from "react";
import { Lock, GripVertical } from "lucide-react";
import type { Profile, Task, TaskStatus } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { STATUS_ORDER, formatCurrency, cn } from "@/lib/utils";

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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {STATUS_ORDER.map((s) => {
        const items = groupBy(s);
        return (
          <div
            key={s}
            onDragOver={(e) => { e.preventDefault(); setDragOver(s); }}
            onDragLeave={() => setDragOver((d) => (d === s ? null : d))}
            onDrop={(e) => onDrop(e, s)}
            className={cn(
              "rounded-lg border bg-card/50 flex flex-col min-h-[360px] transition-colors",
              dragOver === s ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <TaskStatusBadge status={s} />
              <span className="text-[10px] font-medium tabular text-muted-foreground bg-elevated px-1.5 py-0.5 rounded">
                {items.length}
              </span>
            </div>
            <div className="p-2 space-y-2 flex-1">
              {items.map((t) => {
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
                      "group rounded-md border border-border bg-card p-3 hover:border-border-strong transition-all",
                      !locked && "cursor-grab active:cursor-grabbing hover:-translate-y-0.5",
                    )}
                  >
                    <Link href={`/tasks/${t.id}`} className="block">
                      <div className="flex items-start gap-1.5">
                        {locked && <Lock className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />}
                        <span className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {t.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1.5 truncate">{t.client_name}</div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1.5">
                          {assignee ? (
                            <UserAvatar name={assignee.full_name} src={assignee.avatar_url} size="xs" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-dashed border-border" />
                          )}
                          <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                            {assignee?.full_name ?? "لسه"}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium tabular">
                          {formatCurrency(t.price, t.currency ?? "EGP")}
                        </span>
                      </div>
                    </Link>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="text-[11px] text-muted-foreground/60 text-center py-8 border border-dashed border-border/50 rounded-md">
                  مفيش حاجة هنا
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
