"use client";
import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Task, TaskStatus } from "@/lib/database.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/utils";
import { useProfile } from "@/components/profile-context";

export function StatusChanger({ task }: { task: Task }) {
  const supabase = createClient();
  const me = useProfile();
  const [status, setStatus] = useState<TaskStatus>(task.status);

  if (status === "paid_closed") {
    return <TaskStatusBadge status={status} />;
  }

  async function onChange(next: TaskStatus) {
    const prev = status;
    setStatus(next);
    const { error } = await supabase.from("tasks").update({ status: next } as Record<string, unknown>).eq("id", task.id);
    if (error) {
      setStatus(prev);
      return toast.error(error.message);
    }
    toast.success("تم تحديث الحالة");
    const session = (await supabase.auth.getSession()).data.session;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/on-task-status-change`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
      body: JSON.stringify({ task_id: task.id, old_status: prev, new_status: next, changed_by: me.id }),
    }).catch(() => {});
  }

  return (
    <Select value={status} onValueChange={(v) => onChange(v as TaskStatus)}>
      <SelectTrigger className="h-9 w-auto border-0 bg-transparent p-0 hover:opacity-80">
        <SelectValue asChild><TaskStatusBadge status={status} /></SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STATUS_ORDER.map((s) => (<SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}
