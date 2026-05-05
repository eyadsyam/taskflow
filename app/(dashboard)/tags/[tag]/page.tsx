import Link from "next/link";
import { Hash, ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Task } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime, STATUS_ORDER, STATUS_LABELS } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TagDetailPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const supabase = createClient();

  const [{ data: rawTasks }, { data: rawProfiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .contains("tags", [tag])
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, full_name, avatar_url, role, email, job_title"),
  ]);

  const tasks = (rawTasks ?? []) as Task[];
  const profileMap = new Map<string, Partial<Profile>>(
    (rawProfiles ?? []).map((p) => [p.id as string, p as Partial<Profile>]),
  );

  // Group tasks by status
  const byStatus = new Map<string, Task[]>();
  for (const t of tasks) {
    const arr = byStatus.get(t.status) ?? [];
    arr.push(t);
    byStatus.set(t.status, arr);
  }

  // Stats
  const openCount = tasks.filter((t) => t.status !== "paid_closed").length;
  const totalRevenue = tasks
    .filter((t) => t.status === "paid_closed")
    .reduce((sum, t) => sum + (t.price ?? 0), 0);

  return (
    <div className="fade-in">
      {/* Header */}
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/tags"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            <span>كل التاجات</span>
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                <Hash className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <div className="section-label">Tag</div>
                <h1 className="text-3xl font-bold tracking-tight truncate">{tag}</h1>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>{tasks.length} تاسك</span>
                  {openCount > 0 && (
                    <span className="text-emerald-400">· {openCount} شغال</span>
                  )}
                  {totalRevenue > 0 && (
                    <span className="text-primary">
                      · دخل: {formatCurrency(totalRevenue, "EGP")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button asChild variant="default" size="sm">
              <Link href="/tasks/new">
                <Plus className="h-3.5 w-3.5" />
                تاسك جديد
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-lg border border-border bg-elevated grid place-items-center mb-3">
                <Hash className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">مفيش تاسكات بهذا التاج</p>
            </div>
          ) : (
            STATUS_ORDER.map((status) => {
              const group = byStatus.get(status);
              if (!group || group.length === 0) return null;
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <TaskStatusBadge status={status} />
                    <span className="text-xs text-muted-foreground">
                      ({group.length})
                    </span>
                  </div>
                  <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                    {group.map((t) => {
                      const assignee = t.assigned_to
                        ? profileMap.get(t.assigned_to)
                        : null;
                      return (
                        <Link
                          key={t.id}
                          href={`/tasks/${t.id}`}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate text-sm">
                              {t.title}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {t.client_name}
                              {t.due_date && (
                                <span className="ms-2">
                                  · {formatDateTime(t.due_date)}
                                </span>
                              )}
                            </div>
                            {(t.tags?.length ?? 0) > 1 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {t
                                  .tags!.filter((x) => x !== tag)
                                  .slice(0, 4)
                                  .map((otherTag) => (
                                    <span
                                      key={otherTag}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-elevated text-muted-foreground border border-border"
                                    >
                                      {otherTag}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                          {t.price && (
                            <div className="text-xs font-semibold text-primary tabular shrink-0">
                              {formatCurrency(t.price, t.currency ?? "EGP")}
                            </div>
                          )}
                          {assignee && (
                            <UserAvatar
                              name={assignee.full_name ?? ""}
                              src={assignee.avatar_url}
                              size="xs"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

// Suppress unused var warning for STATUS_LABELS
void STATUS_LABELS;
