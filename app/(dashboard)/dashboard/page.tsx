import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Task, Profile } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { DashboardCharts } from "./charts";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { ListChecks, Wallet, CheckCircle2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: rawTasks }, { data: rawProfiles }] = await Promise.all([
    supabase.from("tasks").select("*").order("updated_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, role"),
  ]);

  const all = (rawTasks ?? []) as Task[];
  const profiles = (rawProfiles ?? []) as Pick<Profile, "id" | "full_name" | "role">[];
  const active = all.filter((t) => t.status !== "paid_closed").length;
  const pendingPayment = all.filter((t) => t.status === "done_pending_payment").length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const doneThisMonth = all.filter(
    (t) => (t.status === "paid_closed" || t.status === "done_pending_payment") && new Date(t.updated_at) >= monthStart,
  ).length;

  const workload = new Map<string, number>();
  for (const t of all) {
    if (t.assigned_to && t.status !== "paid_closed") {
      workload.set(t.assigned_to, (workload.get(t.assigned_to) ?? 0) + 1);
    }
  }
  const teamMembers = (profiles ?? []).filter((p) => p.role === "work_team");
  const avgWorkload = teamMembers.length
    ? Math.round((Array.from(workload.values()).reduce((a, b) => a + b, 0) / teamMembers.length) * 10) / 10
    : 0;

  const statusCounts = [
    { name: "pending_client", value: all.filter((t) => t.status === "pending_client").length },
    { name: "in_progress", value: all.filter((t) => t.status === "in_progress").length },
    { name: "done_pending_payment", value: all.filter((t) => t.status === "done_pending_payment").length },
    { name: "paid_closed", value: all.filter((t) => t.status === "paid_closed").length },
  ];

  // Tasks created last 30 days
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    byDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const t of all) {
    const k = t.created_at.slice(0, 10);
    if (byDay.has(k)) byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const timeline = Array.from(byDay.entries()).map(([date, value]) => ({ date: date.slice(5), value }));

  const recent = all.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على مهام الفريق</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={ListChecks} label="مهام نشطة" value={active} hint="غير مغلقة" />
        <Kpi icon={Wallet} label="في انتظار الدفع" value={pendingPayment} hint="مستنيين الفلوس" />
        <Kpi icon={CheckCircle2} label="خلصت الشهر ده" value={doneThisMonth} hint="مدفوعة + مسلّمة" />
        <Kpi icon={Users} label="متوسط حمل الفريق" value={avgWorkload} hint={`${teamMembers.length} شخص`} />
      </div>

      <DashboardCharts statusCounts={statusCounts} timeline={timeline} />

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>آخر المهام</CardTitle>
          <Link className="text-sm text-primary hover:underline" href="/tasks">كل المهام</Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد مهام بعد.</p>
          ) : (
            recent.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.client_name} • {relativeTime(t.updated_at)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <TaskStatusBadge status={t.status} />
                  <span className="text-sm text-muted-foreground hidden sm:inline">{formatCurrency(t.price, t.currency ?? "EGP")}</span>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-1">{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
          </div>
          <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
