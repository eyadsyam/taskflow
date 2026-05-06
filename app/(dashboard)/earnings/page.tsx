import Link from "next/link";
import { Wallet, TrendingUp, Clock, ListChecks, ArrowLeft, BadgeDollarSign, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, TaskStatus } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

type EarningsRow = {
  total_earned_egp: number;
  total_pending_egp: number;
  tasks_created: number;
  tasks_done: number;
  tasks_paid: number;
  created_earned_egp: number;
  created_pending_egp: number;
  assigned_earned_egp: number;
  assigned_pending_egp: number;
};

type TaskEarning = {
  task_id: string;
  title: string;
  client_name: string;
  status: TaskStatus;
  created_by: string;
  assigned_to: string | null;
  price: number | null;
  currency: string;
  amount_egp: number;
  creator_pct: number;
  creator_amount_egp: number;
  assignee_amount_egp: number;
  created_at: string;
};

export default async function EarningsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const me = profile as Profile | null;
  if (!me) return null;

  // Fetch earnings summary + per-task breakdown for tasks I'm involved in
  const [{ data: summaryRows }, { data: tasksData }, { data: profilesData }] = await Promise.all([
    supabase.rpc("user_earnings", { p_user: user.id }),
    supabase
      .from("task_earnings")
      .select("*")
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url"),
  ]);

  const summary = (summaryRows?.[0] ?? null) as EarningsRow | null;
  const tasks = (tasksData ?? []) as TaskEarning[];
  const profileMap = new Map<string, Pick<Profile, "id" | "full_name" | "avatar_url">>(
    (profilesData ?? []).map((p) => [p.id as string, p as Pick<Profile, "id" | "full_name" | "avatar_url">]),
  );

  const isAdmin = me.role === "admin";

  // For admin: also fetch all team earnings
  let allTeamEarnings: Array<EarningsRow & { user: Pick<Profile, "id" | "full_name" | "avatar_url"> }> = [];
  if (isAdmin) {
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url");
    const ids = (allProfiles ?? []).map((p) => p.id as string);
    const results = await Promise.all(
      ids.map(async (id) => {
        const { data } = await supabase.rpc("user_earnings", { p_user: id });
        const row = (data?.[0] ?? null) as EarningsRow | null;
        return row ? { ...row, user: profileMap.get(id)! } : null;
      }),
    );
    allTeamEarnings = results
      .filter((r): r is EarningsRow & { user: Pick<Profile, "id" | "full_name" | "avatar_url"> } => r !== null)
      .sort((a, b) => b.total_earned_egp - a.total_earned_egp);
  }

  return (
    <div className="fade-in">
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="section-label mb-1">Earnings</div>
          <h1 className="text-3xl font-bold tracking-tight">المالية</h1>
          <p className="text-sm text-muted-foreground mt-1">
            حسابك من التاسكات اللي عملتها أو شغلت عليها
          </p>
        </div>
      </section>

      <section className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* My summary */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              label="مكسبت"
              value={formatCurrency(summary?.total_earned_egp ?? 0, "EGP")}
              hint="من التاسكات المقفولة"
              accent="success"
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="مستني الدفع"
              value={formatCurrency(summary?.total_pending_egp ?? 0, "EGP")}
              hint="مش مدفوع لسه"
              accent="warning"
            />
            <StatCard
              icon={<ListChecks className="h-4 w-4" />}
              label="تاسكات شغلت عليها"
              value={String(summary?.tasks_done ?? 0)}
              hint={`منهم ${summary?.tasks_paid ?? 0} اتدفعت`}
            />
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="تاسكات عملتها"
              value={String(summary?.tasks_created ?? 0)}
              hint="انت اللي ضفتها"
            />
          </div>

          {/* Split breakdown */}
          {summary && (summary.created_earned_egp > 0 || summary.assigned_earned_egp > 0 || summary.created_pending_egp > 0 || summary.assigned_pending_egp > 0) && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="section-label mb-4">تفصيل المالية</div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-elevated/40 p-4">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BadgeDollarSign className="h-3.5 w-3.5" />
                    من التاسكات اللي عملتها
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">مكسبت:</span>
                      <span className="font-semibold text-emerald-400">{formatCurrency(summary.created_earned_egp, "EGP")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">مستني:</span>
                      <span className="font-semibold text-amber-400">{formatCurrency(summary.created_pending_egp, "EGP")}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                    اللي عمل التاسك بياخد <strong>10%</strong> لو السعر أقل من 1000 جنيه، و <strong>20%</strong> لو أكتر
                  </p>
                </div>
                <div className="rounded-md border border-border bg-elevated/40 p-4">
                  <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                    <BadgeDollarSign className="h-3.5 w-3.5" />
                    من التاسكات اللي شغلت عليها
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">مكسبت:</span>
                      <span className="font-semibold text-emerald-400">{formatCurrency(summary.assigned_earned_egp, "EGP")}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">مستني:</span>
                      <span className="font-semibold text-amber-400">{formatCurrency(summary.assigned_pending_egp, "EGP")}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
                    الشغّال على التاسك بياخد الباقي (<strong>80%</strong> أو <strong>90%</strong>)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Per-task breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">تاسكاتك</h2>
              <span className="text-xs text-muted-foreground">
                ملاحظة: السعر بالريال بيتحوّل بـ 12.5 جنيه لكل ريال
              </span>
            </div>
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
                <div className="mx-auto h-12 w-12 rounded-lg border border-border bg-elevated grid place-items-center mb-3">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">لسه مفيش تاسكات</p>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                {tasks.map((t) => {
                  const isCreator = t.created_by === user.id;
                  const isAssignee = t.assigned_to === user.id;
                  const myShare = isCreator
                    ? t.creator_amount_egp
                    : isAssignee
                      ? t.assignee_amount_egp
                      : 0;
                  const myRole = isCreator && isAssignee
                    ? "عملتها وشغلت عليها"
                    : isCreator
                      ? `عملتها · ${(t.creator_pct * 100).toFixed(0)}%`
                      : `شغلت عليها · ${((1 - t.creator_pct) * 100).toFixed(0)}%`;
                  const otherUserId = isCreator ? t.assigned_to : t.created_by;
                  const otherUser = otherUserId ? profileMap.get(otherUserId) : null;
                  const isPaid = t.status === "paid_closed";

                  return (
                    <Link
                      key={t.task_id}
                      href={`/tasks/${t.task_id}`}
                      className="grid grid-cols-12 items-center gap-3 px-4 py-3 hover:bg-elevated/40 transition-colors"
                    >
                      <div className="col-span-12 sm:col-span-5 min-w-0">
                        <div className="flex items-center gap-2">
                          <TaskStatusBadge status={t.status} />
                        </div>
                        <div className="font-medium truncate text-sm mt-1">{t.title}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{t.client_name}</div>
                      </div>
                      <div className="col-span-6 sm:col-span-3 text-xs">
                        <div className="text-muted-foreground">{myRole}</div>
                        {otherUser && (
                          <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                            <UserAvatar name={otherUser.full_name} src={otherUser.avatar_url} size="xs" />
                            <span className="truncate">
                              {isCreator ? "شغّال:" : "صاحب:"} {otherUser.full_name}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-xs text-end">
                        <div className="text-muted-foreground">السعر</div>
                        <div className="font-semibold tabular">
                          {formatCurrency(t.price, t.currency)}
                          {t.currency === "SAR" && (
                            <span className="text-[10px] text-muted-foreground ms-1 block">
                              ≈ {formatCurrency(t.amount_egp, "EGP")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="col-span-3 sm:col-span-2 text-xs text-end">
                        <div className="text-muted-foreground">حصتي</div>
                        <div className={`font-bold tabular ${isPaid ? "text-emerald-400" : "text-amber-400"}`}>
                          {formatCurrency(myShare, "EGP")}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {isPaid ? "اتقبضت" : "مستنية"}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin: Team-wide earnings */}
          {isAdmin && allTeamEarnings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">حسابات التيم كله</h2>
                <span className="text-[10px] text-muted-foreground bg-elevated border border-border px-2 py-0.5 rounded">
                  للأدمن بس
                </span>
              </div>
              <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                {allTeamEarnings.map((m) => (
                  <div
                    key={m.user.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40 transition-colors"
                  >
                    <UserAvatar name={m.user.full_name} src={m.user.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{m.user.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.tasks_done} شغل · {m.tasks_created} عمل · {m.tasks_paid} مدفوع
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-xs text-muted-foreground">مكسب</div>
                      <div className="font-bold tabular text-emerald-400">{formatCurrency(m.total_earned_egp, "EGP")}</div>
                    </div>
                    <div className="text-end">
                      <div className="text-xs text-muted-foreground">مستني</div>
                      <div className="font-bold tabular text-amber-400">{formatCurrency(m.total_pending_egp, "EGP")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="rounded-lg border border-border bg-elevated/30 p-4 text-xs text-muted-foreground leading-relaxed">
            <div className="flex items-center gap-1.5 mb-1.5 text-foreground font-semibold">
              <UserIcon className="h-3.5 w-3.5" />
              قواعد الحساب
            </div>
            <ul className="list-disc list-inside space-y-1">
              <li>السعر بالجنيه أو الريال السعودي بس. الريال = 12.5 جنيه (شامل عمولة الوسيط).</li>
              <li>اللي عمل التاسك ياخد <strong className="text-foreground">10%</strong> من السعر لو أقل من 1000 جنيه، و <strong className="text-foreground">20%</strong> لو 1000 فأكتر.</li>
              <li>الشغّال على التاسك ياخد الباقي (<strong className="text-foreground">90%</strong> أو <strong className="text-foreground">80%</strong>).</li>
              <li>المبالغ بتتحسب &quot;مكسبت&quot; بس لما حالة التاسك تبقى &quot;اتدفع ومقفول&quot;.</li>
            </ul>
            <Link
              href="/tasks"
              className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
            >
              <ArrowLeft className="h-3 w-3 rtl:rotate-180" />
              للتاسكات
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  accent?: "success" | "warning";
}) {
  const accentColor =
    accent === "success" ? "text-emerald-400" : accent === "warning" ? "text-amber-400" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold tabular ${accentColor}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
