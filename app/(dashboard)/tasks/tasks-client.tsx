"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, LayoutGrid, Table as TableIcon, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Task, TaskStatus } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TaskTable } from "@/components/tasks/TaskTable";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/utils";
import { useProfile } from "@/components/profile-context";

export function TasksClient({ initialTasks, profiles }: { initialTasks: Task[]; profiles: Profile[] }) {
  const supabase = createClient();
  const router = useRouter();
  const sp = useSearchParams();
  const me = useProfile();

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState(sp.get("q") ?? "");
  const [status, setStatus] = useState<string>(sp.get("status") ?? "all");
  const [assignee, setAssignee] = useState<string>(sp.get("assignee") ?? "all");
  const [view, setView] = useState<"table" | "kanban">((sp.get("view") as "table" | "kanban") ?? "table");

  // Persist to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (assignee !== "all") params.set("assignee", assignee);
    if (view !== "table") params.set("view", view);
    const qs = params.toString();
    router.replace(qs ? `/tasks?${qs}` : "/tasks", { scroll: false });
  }, [search, status, assignee, view, router]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("tasks-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        setTasks((prev) => {
          if (payload.eventType === "INSERT") return [payload.new as Task, ...prev];
          if (payload.eventType === "UPDATE") {
            return prev.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t));
          }
          if (payload.eventType === "DELETE") return prev.filter((t) => t.id !== (payload.old as Task).id);
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (assignee !== "all" && t.assigned_to !== assignee) return false;
      if (q) {
        const hay = `${t.title} ${t.client_name} ${t.description ?? ""} ${(t.tags ?? []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tasks, search, status, assignee]);

  async function changeStatus(id: string, next: TaskStatus, prev: TaskStatus) {
    // Optimistic
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: next } : t)));
    const { error } = await supabase.from("tasks").update({ status: next } as Record<string, unknown>).eq("id", id);
    if (error) {
      setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: prev } : t)));
      const { toast } = await import("sonner");
      toast.error(error.message);
      return;
    }
    // fire edge function (non-blocking)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/on-task-status-change`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ task_id: id, old_status: prev, new_status: next, changed_by: me.id }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">المهام</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} تاسك</p>
        </div>
        <Button asChild>
          <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك جديد</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في العنوان، العميل، الوصف..." className="ps-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger className="md:w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأشخاص</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "table" | "kanban")}>
        <TabsList>
          <TabsTrigger value="table"><TableIcon className="h-4 w-4" /> جدول</TabsTrigger>
          <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4" /> كانبان</TabsTrigger>
        </TabsList>
        <TabsContent value="table">
          <TaskTable tasks={filtered} profileMap={profileMap} onStatusChange={changeStatus} />
        </TabsContent>
        <TabsContent value="kanban">
          <TaskKanban tasks={filtered} profileMap={profileMap} onStatusChange={changeStatus} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
