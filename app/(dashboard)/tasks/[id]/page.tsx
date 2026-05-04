import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Pencil, User, Calendar, Tag, Phone, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Task, Conversation } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-4">
      {locked && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-green-600" />
          <div className="text-sm text-green-900 dark:text-green-400">
            التاسك ده مقفول - العميل دفع واستلم. مش هينفع تعدله.
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TaskStatusBadge status={t.status} />
            </div>
            <CardTitle className="text-2xl">{t.title}</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">العميل: {t.client_name}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusChanger task={t} />
            {!locked && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/tasks/${t.id}/edit`}><Pencil className="h-4 w-4" /> عدل</Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {t.description && (
            <div>
              <div className="text-sm font-semibold mb-2">التفاصيل</div>
              <div className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed bg-muted/50 rounded-lg p-3">
                {t.description}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <InfoBox icon={User} label="الشغال عليها">
              {assignee ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={assignee.full_name} src={assignee.avatar_url} size="sm" />
                  <span className="font-medium">{assignee.full_name}</span>
                </div>
              ) : <span className="text-muted-foreground">لسه متعينش</span>}
            </InfoBox>
            
            <InfoBox icon={User} label="عملها">
              {creator ? (
                <div className="flex items-center gap-2">
                  <UserAvatar name={creator.full_name} src={creator.avatar_url} size="sm" />
                  <span className="font-medium">{creator.full_name}</span>
                </div>
              ) : <span className="text-muted-foreground">—</span>}
            </InfoBox>
            
            <InfoBox icon={Calendar} label="موعد التسليم">
              <span className="font-medium">{formatDate(t.due_date)}</span>
            </InfoBox>
            
            <InfoBox icon={Phone} label="تليفون العميل">
              <span className="font-medium" dir="ltr">{t.client_contact ?? "—"}</span>
            </InfoBox>
            
            <InfoBox icon={Tag} label="السعر">
              <span className="font-medium text-lg">{formatCurrency(t.price, t.currency ?? "EGP")}</span>
            </InfoBox>
            
            <InfoBox icon={Calendar} label="اتعملت في">
              <span className="font-medium">{formatDate(t.created_at)}</span>
            </InfoBox>
          </div>

          {(t.tags?.length ?? 0) > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2">تاجات</div>
              <div className="flex flex-wrap gap-1.5">
                {t.tags!.map((tag) => (
                  <span key={tag} className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(t.attachments?.length ?? 0) > 0 && (
            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Paperclip className="h-4 w-4" /> الملفات</div>
              <div className="space-y-2">
                {t.attachments!.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm rounded-lg border p-3 hover:bg-accent transition-colors truncate">
                    <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate">{decodeURIComponent(url.split("/").pop() ?? url)}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <TaskChatLink taskId={t.id} taskTitle={t.title} existingConversationId={conversation?.id} />
    </div>
  );
}

function InfoBox({ 
  icon: Icon, 
  label, 
  children,
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
