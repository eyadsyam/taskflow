import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pencil, User, Calendar, Tag, Phone, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Task, TaskComment, TaskHistory } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { StatusChanger } from "@/components/tasks/StatusChanger";
import { CommentSection } from "@/components/tasks/CommentSection";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: rawTask }, { data: rawProfiles }, { data: rawComments }, { data: rawHistory }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", params.id).single(),
    supabase.from("profiles").select("*"),
    supabase.from("task_comments").select("*").eq("task_id", params.id).order("created_at", { ascending: true }),
    supabase.from("task_history").select("*").eq("task_id", params.id).order("changed_at", { ascending: true }),
  ]);
  if (!rawTask) notFound();

  const t = rawTask as unknown as Task;
  const profiles = (rawProfiles ?? []) as Profile[];
  const comments = (rawComments ?? []) as TaskComment[];
  const history = (rawHistory ?? []) as TaskHistory[];
  const profileMap = new Map<string, Profile>(profiles.map((p) => [p.id, p]));
  const assignee = t.assigned_to ? profileMap.get(t.assigned_to) : null;
  const creator = profileMap.get(t.created_by);
  const locked = t.status === "paid_closed";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px] max-w-7xl mx-auto">
      <div className="space-y-4 min-w-0">
        {locked && (
          <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-green-600" />
            <div className="text-sm text-green-900 dark:text-green-400">
              🔒 هذا التاسك مغلق — العميل دفع واستلم. لا يمكن التعديل.
            </div>
          </div>
        )}

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-2xl">{t.title}</CardTitle>
              <div className="text-sm text-muted-foreground mt-1">{t.client_name}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusChanger task={t} />
              {!locked && (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/tasks/${t.id}/edit`}><Pencil className="h-4 w-4" /> تعديل</Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {t.description && (
              <div>
                <div className="text-sm font-medium mb-1">الوصف</div>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground">{t.description}</div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <Info icon={User} label="المنفّذ" value={assignee?.full_name ?? "بدون"} />
              <Info icon={User} label="تم إنشاؤه بواسطة" value={creator?.full_name ?? "—"} />
              <Info icon={Calendar} label="تاريخ التسليم" value={formatDate(t.due_date)} />
              <Info icon={Calendar} label="تاريخ الإنشاء" value={formatDate(t.created_at)} />
              <Info icon={Phone} label="تواصل العميل" value={t.client_contact ?? "—"} dir="ltr" />
              <Info icon={Tag} label="السعر" value={formatCurrency(t.price, t.currency ?? "EGP")} />
            </div>

            {(t.tags?.length ?? 0) > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">التاجات</div>
                <div className="flex flex-wrap gap-1.5">
                  {t.tags!.map((tag) => (
                    <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {(t.attachments?.length ?? 0) > 0 && (
              <div>
                <div className="text-sm font-medium mb-2 flex items-center gap-1.5"><Paperclip className="h-4 w-4" /> المرفقات</div>
                <div className="space-y-2">
                  {t.attachments!.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm rounded border p-2 hover:bg-accent truncate">
                      <Paperclip className="h-4 w-4 shrink-0" />
                      <span className="truncate">{decodeURIComponent(url.split("/").pop() ?? url)}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CommentSection
        taskId={t.id}
        locked={locked}
        initialComments={(comments ?? []) as TaskComment[]}
        initialHistory={(history ?? []) as TaskHistory[]}
        profileMap={Object.fromEntries(profileMap)}
      />
    </div>
  );
}

function Info({ icon: Icon, label, value, dir }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; dir?: "ltr" | "rtl" }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium truncate" dir={dir}>{value}</div>
      </div>
    </div>
  );
}
