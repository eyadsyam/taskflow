import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Task, Profile } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { DashboardCharts } from "./charts";
import { formatCurrency, relativeTime, getUserStatus } from "@/lib/utils";
import { ListChecks, Wallet, CheckCircle2, Users, MessageCircle, Plus, ArrowLeft, Activity, TrendingUp } from "lucide-react";

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

  const recent = all.slice(0, 5);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 fade-in">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-blue-600 p-6 md:p-8 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">نورت يا تيم</h1>
            <p className="text-white/80 mt-2 text-lg">{onlineMembers.length} أونلاين دلوقتي من {profiles.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary" size="lg">
              <Link href="/chat"><MessageCircle className="h-5 w-5" /> الشات</Link>
            </Button>
            <Button asChild size="lg" className="bg-white text-violet-700 hover:bg-white/90">
              <Link href="/tasks/new"><Plus className="h-5 w-5" /> تاسك جديد</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi 
          icon={ListChecks} 
          label="تاسكات شغالة" 
          value={active} 
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-100 dark:bg-blue-900/30"
        />
        <Kpi 
          icon={Wallet} 
          label="مستنيين الفلوس" 
          value={pendingPayment} 
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-100 dark:bg-amber-900/30"
        />
        <Kpi 
          icon={CheckCircle2} 
          label="خلصوا الشهر ده" 
          value={doneThisMonth} 
          color="text-green-600 dark:text-green-400"
          bg="bg-green-100 dark:bg-green-900/30"
        />
        <Kpi 
          icon={Activity} 
          label="أونلاين" 
          value={onlineMembers.length} 
          subtitle={`من ${profiles.length}`}
          color="text-violet-600 dark:text-violet-400"
          bg="bg-violet-100 dark:bg-violet-900/30"
        />
      </div>

      {/* Charts + Online team */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardCharts statusCounts={statusCounts} timeline={timeline} />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              التيم
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profiles.slice(0, 8).map((p) => {
              const status = getUserStatus(p.last_seen_at);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
                  <UserAvatar 
                    name={p.full_name} 
                    src={p.avatar_url} 
                    size="sm" 
                    status={status}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.status_message || p.job_title || (status === "online" ? "أونلاين" : "مش هنا")}
                    </div>
                  </div>
                </div>
              );
            })}
            <Button asChild variant="ghost" size="sm" className="w-full justify-center mt-2">
              <Link href="/team">شوف الكل <ArrowLeft className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent tasks */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            آخر التاسكات
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/tasks">شوف الكل <ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 opacity-70 text-muted-foreground">
                <Image src="/assets/empty-tasks.svg" alt="" width={200} height={160} className="mx-auto" />
              </div>
              <p className="font-medium">مفيش تاسكات لسه</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">ابدأ بأول تاسك ليك</p>
              <Button asChild variant="gradient">
                <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك جديد</Link>
              </Button>
            </div>
          ) : (
            recent.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-4 hover:bg-accent hover:border-primary/30 transition-all group"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate group-hover:text-primary transition-colors">{t.title}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{t.client_name} • {relativeTime(t.updated_at)}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium hidden sm:inline">{formatCurrency(t.price, t.currency ?? "EGP")}</span>
                  <TaskStatusBadge status={t.status} />
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ 
  icon: Icon, 
  label, 
  value, 
  subtitle,
  color,
  bg,
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  value: number | string;
  subtitle?: string;
  color: string;
  bg: string;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm font-medium text-muted-foreground">{label}</div>
            <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
            {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
          </div>
          <div className={`h-12 w-12 rounded-xl grid place-items-center ${bg}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
