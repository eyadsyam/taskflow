import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pencil, User, Calendar, Tag, Phone, Paperclip, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Task, Conversation } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { StatusChanger } from "@/components/tasks/StatusChanger";
import { TaskChatLink } from "@/components/tasks/TaskChatLink";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: rawTask }, { data: rawProfiles }, { data: convData }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", params.id).single(),
    supabase.from("profiles").select("*"),
    supabase.from("conversations").select("*").eq("task_id", params.id).single(),
  ]);
  if (!rawTask) notFound();

  const t = rawTask as unknown as Task;
  const profiles = (rawProfiles ?? []) as Profile[];
  const conversation = convData as Conversation | null;
  const profileMap = new Map<string, Profile>(profiles.map((p) => [p.id, p]));
  const assignee = t.assigned_to ? profileMap.get(t.assigned_to) : null;
  const creator = profileMap.get(t.created_by);
  const locked = t.status === "paid_closed";

  return (
    <div className="fade-in">
      {/* Header */}
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowRight className="h-3 w-3 rtl:rotate-180" />
            <span>كل التاسكات</span>
          </Link>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <TaskStatusBadge status={t.status} />
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{t.client_name}</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t.title}</h1>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusChanger task={t} />
              {!locked && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/tasks/${t.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" />
                    عدل
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="px-4 md:px-8 lg:px-10 py-6 max-w-4xl mx-auto space-y-4">
        {locked && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 flex items-center gap-3">
            <Lock className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="text-xs text-emerald-300/80">
              التاسك ده مقفول · العميل دفع واستلم. مش هينفع تعدله.
            </div>
          </div>
        )}

        {/* Description */}
        {t.description && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="section-label mb-3">التفاصيل</div>
            <div className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
              {t.description}
            </div>
          </div>
        )}

        {/* Info grid */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border [&>*]:border-border">
            <InfoCell icon={User} label="الشغال عليها">
              {assignee ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={assignee.full_name} src={assignee.avatar_url} size="xs" />
                  <span className="text-sm font-medium truncate">{assignee.full_name}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">لسه متعينش</span>}
            </InfoCell>
            <InfoCell icon={User} label="عملها">
              {creator ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={creator.full_name} src={creator.avatar_url} size="xs" />
                  <span className="text-sm font-medium truncate">{creator.full_name}</span>
                </div>
              ) : <span className="text-xs text-muted-foreground">—</span>}
            </InfoCell>
            <InfoCell icon={Calendar} label="موعد التسليم">
              <span className="text-sm font-medium tabular">{formatDate(t.due_date)}</span>
            </InfoCell>
            <InfoCell icon={Phone} label="تليفون العميل">
              <span className="text-sm font-medium tabular" dir="ltr">{t.client_contact ?? "—"}</span>
            </InfoCell>
            <InfoCell icon={Tag} label="السعر">
              <span className="text-base font-semibold tabular text-primary">
                {formatCurrency(t.price, t.currency ?? "EGP")}
              </span>
            </InfoCell>
            <InfoCell icon={Calendar} label="اتعملت في">
              <span className="text-sm font-medium tabular">{formatDate(t.created_at)}</span>
            </InfoCell>
          </div>
        </div>

        {/* Tags */}
        {(t.tags?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="section-label mb-3">تاجات</div>
            <div className="flex flex-wrap gap-1.5">
              {t.tags!.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-elevated border border-border px-2 py-0.5 text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {(t.attachments?.length ?? 0) > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="section-label mb-3 flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" />
              الملفات
            </div>
            <div className="space-y-2">
              {t.attachments!.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-sm rounded-md border border-border bg-elevated/50 p-3 hover:border-border-strong hover:bg-elevated transition-colors truncate"
                >
                  <Paperclip className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">{decodeURIComponent(url.split("/").pop() ?? url)}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <TaskChatLink taskId={t.id} taskTitle={t.title} existingConversationId={conversation?.id} />
      </section>
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
