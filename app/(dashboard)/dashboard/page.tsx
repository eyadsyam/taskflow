import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Task, Profile } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DashboardCharts } from "./charts";
import { formatCurrency, relativeTime, getUserStatus } from "@/lib/utils";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  TrendingUp,
  Activity,
  Wallet,
  CheckCircle2,
  ListChecks,
  MessageCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ data: rawTasks }, { data: rawProfiles }] = await Promise.all([
    supabase.from("tasks").select("*").order("updated_at", { ascending: false }),
    supabase.from("profiles").select("*").order("last_seen_at", { ascending: false }),
  ]);

  const all = (rawTasks ?? []) as Task[];
  const profiles = (rawProfiles ?? []) as Profile[];
  const active = all.filter((t) => t.status !== "paid_closed").length;
  const pendingPayment = all.filter((t) => t.status === "done_pending_payment").length;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const doneThisMonth = all.filter(
    (t) => (t.status === "paid_closed" || t.status === "done_pending_payment") && new Date(t.updated_at) >= monthStart,
  ).length;

  const totalValue = all
    .filter((t) => t.status !== "paid_closed")
    .reduce((sum, t) => sum + (t.price ?? 0), 0);

  const onlineMembers = profiles.filter((p) => getUserStatus(p.last_seen_at) === "online");

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

  // Greeting based on hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "صباح الفل" : hour < 17 ? "مساء الفل" : "مساء النور";

  return (
    <div className="fade-in">
      {/* HERO STRIP — asymmetric, immediate context */}
      <section className="relative border-b border-border">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid pointer-events-none opacity-50" />

        <div className="relative px-4 md:px-8 lg:px-10 py-8">
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-10 items-end max-w-[1400px] mx-auto">
            {/* Left: greeting + headline number */}
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <span>{greeting}</span>
                <span className="text-border">·</span>
                <span>{onlineMembers.length} أونلاين</span>
              </div>

              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight tabular leading-none">
                  {active}
                </h1>
                <p className="text-lg text-muted-foreground">
                  تاسك شغال
                </p>
              </div>

              <div className="mt-3 flex items-center gap-4 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  بقيمة <span className="text-foreground font-medium tabular">{formatCurrency(totalValue, "EGP")}</span>
                </span>
                {pendingPayment > 0 && (
                  <span className="text-xs flex items-center gap-1.5 text-amber-400">
                    <Wallet className="h-3 w-3" />
                    {pendingPayment} مستنيين الفلوس
                  </span>
                )}
              </div>
            </div>

            {/* Right: quick actions */}
            <div className="flex items-center gap-2 lg:justify-end">
              <Button asChild variant="outline" size="sm">
                <Link href="/chat">
                  <MessageCircle className="h-3.5 w-3.5" />
                  افتح الشات
                </Link>
              </Button>
              <Button asChild variant="default" size="sm">
                <Link href="/tasks/new">
                  <Plus className="h-3.5 w-3.5" />
                  تاسك جديد
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT — asymmetric grid */}
      <section className="px-4 md:px-8 lg:px-10 py-8 max-w-[1400px] mx-auto">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left column — main content */}
          <div className="space-y-6 min-w-0">
            {/* Stat cards row */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <StatTile
                label="شغالة"
                value={active}
                icon={ListChecks}
                accent="bg-blue-500/15 text-blue-400 border-blue-500/30"
              />
              <StatTile
                label="مستنيين"
                value={pendingPayment}
                icon={Wallet}
                accent="bg-amber-500/15 text-amber-400 border-amber-500/30"
              />
              <StatTile
                label="خلصت"
                value={doneThisMonth}
                icon={CheckCircle2}
                accent="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                hint="الشهر ده"
              />
              <StatTile
                label="أونلاين"
                value={onlineMembers.length}
                icon={Activity}
                accent="bg-primary/15 text-primary border-primary/30"
                hint={`من ${profiles.length}`}
              />
            </div>

            {/* Charts */}
            <DashboardCharts statusCounts={statusCounts} timeline={timeline} />

            {/* Recent tasks — table style */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold">آخر النشاط</span>
                </div>
                <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                  <Link href="/tasks">
                    شوف الكل
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </Button>
              </div>

              {recent.length === 0 ? (
                <EmptyTasks />
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks/${t.id}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-elevated/40 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {t.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                          <span className="truncate">{t.client_name}</span>
                          <span className="text-border">·</span>
                          <span>{relativeTime(t.updated_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:inline text-xs font-medium tabular text-muted-foreground">
                          {formatCurrency(t.price, t.currency ?? "EGP")}
                        </span>
                        <TaskStatusBadge status={t.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column — sidebar widgets */}
          <aside className="space-y-6 lg:sticky lg:top-[68px] lg:self-start">
            {/* Team panel */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="section-label">التيم</span>
                <span className="text-[10px] text-muted-foreground tabular">
                  {profiles.length}
                </span>
              </div>
              <div className="p-2 max-h-[280px] overflow-y-auto scrollbar-thin">
                {profiles.slice(0, 8).map((p) => {
                  const status = getUserStatus(p.last_seen_at);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 p-2 rounded-md hover:bg-elevated/60 transition-colors"
                    >
                      <UserAvatar
                        name={p.full_name}
                        src={p.avatar_url}
                        size="sm"
                        status={status}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{p.full_name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {p.status_message ||
                            p.job_title ||
                            (status === "online" ? "أونلاين" : "مش هنا")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-border p-2">
                <Button asChild variant="ghost" size="sm" className="w-full h-7 text-xs">
                  <Link href="/team">شوف الكل ({profiles.length})</Link>
                </Button>
              </div>
            </div>

            {/* Tip card */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 relative overflow-hidden">
              <div className="absolute -top-8 -end-8 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded grid place-items-center bg-primary/15 border border-primary/30">
                    <Sparkles className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-xs font-semibold">عارف؟</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  في تاب التاسكات تقدر تسحب أي تاسك من حالة لحالة من غير ما تفتحها.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-border-strong transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className={`h-7 w-7 grid place-items-center rounded border ${accent}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold tabular leading-none">{value}</div>
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function EmptyTasks() {
  return (
    <div className="px-5 py-12 text-center bg-dots">
      <div className="mx-auto h-12 w-12 rounded-lg border border-border bg-elevated grid place-items-center mb-3">
        <ListChecks className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">مفيش تاسكات لسه</p>
      <p className="text-xs text-muted-foreground mt-1 mb-4">ابدأ بأول تاسك ليك</p>
      <Button asChild size="sm">
        <Link href="/tasks/new">
          <Plus className="h-3.5 w-3.5" />
          تاسك جديد
        </Link>
      </Button>
    </div>
  );
}
