import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Task, Profile } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DashboardCharts } from "./charts";
import { formatCurrency, relativeTime, getUserStatus } from "@/lib/utils";
import { ListChecks, Wallet, CheckCircle2, MessageCircle, Plus, ArrowLeft, Activity, TrendingUp, Clock } from "lucide-react";

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
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const doneThisMonth = all.filter(
    (t) => (t.status === "paid_closed" || t.status === "done_pending_payment") && new Date(t.updated_at) >= monthStart,
  ).length;

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

  const recent = all.slice(0, 6);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 fade-in max-w-[1400px] mx-auto">
      {/* Top bar: greeting + actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">نورت يا تيم</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {onlineMembers.length} أونلاين دلوقتي من {profiles.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/chat"><MessageCircle className="h-4 w-4" /> الشات</Link>
          </Button>
          <Button asChild variant="gradient" size="sm">
            <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك جديد</Link>
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={ListChecks}
          label="تاسكات شغالة"
          value={active}
          accentColor="border-blue-500"
          iconBg="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          icon={Wallet}
          label="مستنيين الفلوس"
          value={pendingPayment}
          accentColor="border-amber-500"
          iconBg="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <KpiCard
          icon={CheckCircle2}
          label="خلصوا الشهر ده"
          value={doneThisMonth}
          accentColor="border-emerald-500"
          iconBg="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        />
        <KpiCard
          icon={Activity}
          label="أونلاين"
          value={onlineMembers.length}
          suffix={`/${profiles.length}`}
          accentColor="border-violet-500"
          iconBg="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        />
      </div>

      {/* Online team strip */}
      {profiles.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">التيم:</span>
          <div className="flex items-center -space-x-2 rtl:space-x-reverse">
            {profiles.slice(0, 10).map((p) => (
              <UserAvatar
                key={p.id}
                name={p.full_name}
                src={p.avatar_url}
                size="sm"
                status={getUserStatus(p.last_seen_at)}
                className="ring-2 ring-background"
              />
            ))}
          </div>
          {profiles.length > 10 && (
            <span className="text-xs text-muted-foreground">+{profiles.length - 10}</span>
          )}
          <Link href="/team" className="text-xs text-primary hover:underline whitespace-nowrap mr-auto">
            شوف الكل <ArrowLeft className="inline h-3 w-3" />
          </Link>
        </div>
      )}

      {/* Charts - full width, side by side */}
      <DashboardCharts statusCounts={statusCounts} timeline={timeline} />

      {/* Recent tasks */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            آخر التاسكات
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/tasks">شوف الكل <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 py-16 text-center">
            <Image src="/assets/empty-tasks.svg" alt="" width={160} height={120} className="mx-auto mb-4 opacity-60" />
            <p className="font-medium">مفيش تاسكات لسه</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">ابدأ بأول تاسك ليك</p>
            <Button asChild variant="gradient" size="sm">
              <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك جديد</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="group rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <TaskStatusBadge status={t.status} />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {relativeTime(t.updated_at)}
                  </span>
                </div>
                <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {t.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 truncate">{t.client_name}</p>
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(t.price, t.currency ?? "EGP")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  accentColor,
  iconBg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  suffix?: string;
  accentColor: string;
  iconBg: string;
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 border-s-4 ${accentColor}`}>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-lg grid place-items-center shrink-0 ${iconBg}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-2xl font-bold tabular-nums leading-tight">
            {value}
            {suffix && <span className="text-sm font-normal text-muted-foreground">{suffix}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
