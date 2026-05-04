"use client";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { History, Lock, MessageSquare, Send, Loader2 } from "lucide-react";
import type { Profile, TaskComment, TaskHistory, TaskStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";
import { commentSchema, type CommentFormValues } from "@/lib/schemas";
import { useProfile } from "@/components/profile-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { STATUS_LABELS, formatDateTime, ROLE_LABELS, cn } from "@/lib/utils";

type ProfileMap = Record<string, Profile>;

type FeedItem =
  | { kind: "comment"; data: TaskComment }
  | { kind: "history"; data: TaskHistory };

export function CommentSection({
  taskId,
  locked,
  initialComments,
  initialHistory,
  profileMap,
}: {
  taskId: string;
  locked: boolean;
  initialComments: TaskComment[];
  initialHistory: TaskHistory[];
  profileMap: ProfileMap;
}) {
  const supabase = createClient();
  const me = useProfile();
  const [comments, setComments] = useState<TaskComment[]>(initialComments);
  const [history, setHistory] = useState<TaskHistory[]>(initialHistory);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "", is_internal: false },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`task-${taskId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${taskId}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setComments((c) => c.some((x) => x.id === (payload.new as TaskComment).id) ? c : [...c, payload.new as TaskComment]);
        } else if (payload.eventType === "DELETE") {
          setComments((c) => c.filter((x) => x.id !== (payload.old as TaskComment).id));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_history", filter: `task_id=eq.${taskId}` }, (payload) => {
        setHistory((h) => [...h, payload.new as TaskHistory]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, taskId]);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...comments.map((c) => ({ kind: "comment" as const, data: c })),
      ...history.map((h) => ({ kind: "history" as const, data: h })),
    ];
    items.sort((a, b) => {
      const ta = a.kind === "comment" ? a.data.created_at : a.data.changed_at;
      const tb = b.kind === "comment" ? b.data.created_at : b.data.changed_at;
      return new Date(ta).getTime() - new Date(tb).getTime();
    });
    return items;
  }, [comments, history]);

  async function onSubmit(values: CommentFormValues) {
    const { data, error } = await supabase
      .from("task_comments")
      .insert({ task_id: taskId, author_id: me.id, content: values.content, is_internal: values.is_internal } as Record<string, unknown>)
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    const insertedId = (data as TaskComment | null)?.id;
    form.reset({ content: "", is_internal: false });
    if (insertedId) {
      const session = (await supabase.auth.getSession()).data.session;
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/on-task-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ comment_id: insertedId }),
      }).catch(() => {});
    }
  }

  return (
    <Card className="lg:sticky lg:top-20 h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> نشاط التاسك</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1">
          {feed.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">لا يوجد نشاط بعد.</p>
          ) : (
            feed.map((item) =>
              item.kind === "comment" ? (
                <CommentItem key={`c-${item.data.id}`} comment={item.data} author={profileMap[item.data.author_id]} />
              ) : (
                <HistoryItem key={`h-${item.data.id}`} h={item.data} actor={profileMap[item.data.changed_by]} />
              ),
            )
          )}
        </div>

        {locked ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Lock className="h-4 w-4" /> التاسك مغلق — مش ممكن إضافة كومنتات
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 border-t pt-4">
            <Textarea rows={3} placeholder="اكتب كومنت..." {...form.register("content")} />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="internal"
                  checked={form.watch("is_internal")}
                  onCheckedChange={(v) => form.setValue("is_internal", v)}
                />
                <Label htmlFor="internal" className="text-xs text-muted-foreground">ملاحظة داخلية</Label>
              </div>
              <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                إرسال
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function CommentItem({ comment, author }: { comment: TaskComment; author?: Profile }) {
  const initials = (author?.full_name ?? "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex gap-2">
      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
      <div className={cn("flex-1 rounded-lg p-3", comment.is_internal ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/50")}>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium">{author?.full_name ?? "مستخدم"}</span>
          <span className="text-muted-foreground">{formatDateTime(comment.created_at)}</span>
        </div>
        {author?.role && (
          <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[author.role]}</div>
        )}
        <div className="text-sm whitespace-pre-wrap mt-1">{comment.content}</div>
        {comment.is_internal && (
          <div className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mt-1">ملاحظة داخلية</div>
        )}
      </div>
    </div>
  );
}

function HistoryItem({ h, actor }: { h: TaskHistory; actor?: Profile }) {
  const label = fieldLabel(h.field_name, h.old_value, h.new_value);
  return (
    <div className="flex gap-2 items-start text-xs text-muted-foreground">
      <div className="h-8 w-8 rounded-full bg-muted grid place-items-center shrink-0">
        <History className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 pt-1.5">
        <span className="font-medium text-foreground">{actor?.full_name ?? "مستخدم"}</span> {label}
        <span className="mx-1">•</span>
        <span>{formatDateTime(h.changed_at)}</span>
      </div>
    </div>
  );
}

function fieldLabel(field: string, oldV: string | null, newV: string | null) {
  if (field === "status") {
    return (
      <>غيّر الحالة من <b>{STATUS_LABELS[oldV as TaskStatus] ?? oldV ?? "—"}</b> إلى <b>{STATUS_LABELS[newV as TaskStatus] ?? newV ?? "—"}</b></>
    );
  }
  const names: Record<string, string> = {
    title: "العنوان",
    description: "الوصف",
    assigned_to: "المنفّذ",
    due_date: "تاريخ التسليم",
    price: "السعر",
    client_name: "اسم العميل",
    client_contact: "تواصل العميل",
  };
  return <>حدّث <b>{names[field] ?? field}</b></>;
}
