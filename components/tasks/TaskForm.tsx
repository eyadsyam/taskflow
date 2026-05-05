"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, FolderInput, FolderOutput } from "lucide-react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { taskSchema, type TaskFormValues } from "@/lib/schemas";
import type { AttachmentItem, Profile, Task } from "@/lib/database.types";
import { useProfile } from "@/components/profile-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/utils";
import { AttachmentsField, normalizeLegacyAttachments } from "@/components/tasks/AttachmentsField";

export function TaskForm({ task, workTeam }: { task?: Task; workTeam: Profile[] }) {
  const supabase = createClient();
  const router = useRouter();
  const me = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [workingUploading, setWorkingUploading] = useState(false);
  const [submissionUploading, setSubmissionUploading] = useState(false);
  const [numberingTitle, setNumberingTitle] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const uploading = workingUploading || submissionUploading;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      client_name: task?.client_name ?? "",
      client_contact: task?.client_contact ?? "",
      status: task?.status ?? "pending_client",
      assigned_to: task?.assigned_to ?? null,
      due_date: task?.due_date ? toLocalDateTimeInput(task.due_date) : "",
      price: task?.price ?? null,
      currency: task?.currency ?? "EGP",
      tags: task?.tags ?? [],
      attachments: task?.attachments ?? [],
      attachment_items: (task?.attachment_items ??
        normalizeLegacyAttachments(task?.attachments ?? [])) as AttachmentItem[],
      submission_items: (task?.submission_items ?? []) as AttachmentItem[],
    },
  });

  const tags = form.watch("tags");
  const workingItems = form.watch("attachment_items") as AttachmentItem[];
  const submissionItems = form.watch("submission_items") as AttachmentItem[];
  const isNew = !task;

  async function autoNumberTitleForTag(tagName: string) {
    if (!isNew) return;
    const currentTitle = form.getValues("title").trim();
    if (currentTitle.length > 0) return;
    setNumberingTitle(true);
    try {
      const { count, error } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .contains("tags", [tagName]);
      if (error) throw error;
      const next = (count ?? 0) + 1;
      form.setValue("title", `${tagName} #${next}`, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (e) {
      console.error("autoNumberTitleForTag error:", e);
    } finally {
      setNumberingTitle(false);
    }
  }

  function addTag(t: string) {
    const clean = t.trim();
    if (!clean) return;
    if (tags.includes(clean)) {
      setTagInput("");
      return;
    }
    const wasEmpty = tags.length === 0;
    form.setValue("tags", [...tags, clean], { shouldDirty: true });
    setTagInput("");
    if (wasEmpty) autoNumberTitleForTag(clean);
  }

  function removeTag(t: string) {
    form.setValue("tags", tags.filter((x) => x !== t), { shouldDirty: true });
  }

  async function onSubmit(values: TaskFormValues) {
    setSubmitting(true);
    const payload = {
      title: values.title,
      description: values.description || null,
      client_name: values.client_name,
      client_contact: values.client_contact || null,
      status: values.status,
      assigned_to: values.assigned_to || null,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
      price: values.price === null || values.price === undefined ? null : Number(values.price),
      currency: values.currency,
      tags: values.tags,
      attachments: values.attachment_items.map((a) => a.url),
      attachment_items: values.attachment_items,
      submission_items: values.submission_items,
    };

    if (task) {
      const oldStatus = task.status;
      const { error } = await supabase
        .from("tasks")
        .update(payload as Record<string, unknown>)
        .eq("id", task.id);
      if (error) {
        setSubmitting(false);
        return toast.error(error.message);
      }
      if (oldStatus !== values.status) {
        const session = (await supabase.auth.getSession()).data.session;
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/on-task-status-change`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({
            task_id: task.id,
            old_status: oldStatus,
            new_status: values.status,
            changed_by: me.id,
          }),
        }).catch(() => {});
      }
      toast.success("اتحفظ");
      router.push(`/tasks/${task.id}`);
      router.refresh();
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...payload, created_by: me.id } as Record<string, unknown>)
        .select("id")
        .single();
      if (error) {
        setSubmitting(false);
        return toast.error(error.message);
      }
      toast.success("التاسك اتعمل");
      router.push(`/tasks/${(data as { id: string }).id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* TAGS first */}
      <Field
        label="التاجات"
        hint={isNew ? "أول تاج هيحدد اسم التاسك تلقائياً (مثلاً: تصميم #3)" : undefined}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium"
            >
              {t}
              <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(tagInput);
            }
          }}
          onBlur={() => addTag(tagInput)}
          placeholder="اكتب تاج (تصميم، Big Data...) واضغط Enter"
        />
      </Field>

      {/* Title & client info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="عنوان التاسك" error={form.formState.errors.title?.message}>
          <div className="relative">
            <Input
              {...form.register("title")}
              placeholder="هيتعبى تلقائياً من أول تاج"
              disabled={numberingTitle}
            />
            {numberingTitle && (
              <Loader2 className="absolute end-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </Field>
        <Field label="اسم العميل" error={form.formState.errors.client_name?.message}>
          <Input {...form.register("client_name")} />
        </Field>
        <Field label="واتساب العميل">
          <Input {...form.register("client_contact")} placeholder="+2010..." dir="ltr" />
        </Field>
        <Field label="الحالة">
          <Select
            value={form.watch("status")}
            onValueChange={(v) => form.setValue("status", v as TaskFormValues["status"])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="الشغال عليها">
          <Select
            value={form.watch("assigned_to") ?? "none"}
            onValueChange={(v) => form.setValue("assigned_to", v === "none" ? null : v)}
          >
            <SelectTrigger><SelectValue placeholder="اختار" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">لسه</SelectItem>
              {workTeam.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="موعد التسليم (التاريخ والساعة)">
          <Input type="datetime-local" {...form.register("due_date")} />
        </Field>
        <Field label="السعر">
          <div className="flex gap-2">
            <Input type="number" step="0.01" {...form.register("price")} />
            <Select
              value={form.watch("currency") ?? "EGP"}
              onValueChange={(v) => form.setValue("currency", v)}
            >
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">EGP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Field>
      </div>

      {/* Description */}
      <Field label="التفاصيل">
        <Textarea rows={5} {...form.register("description")} placeholder="اكتب تفاصيل الشغل المطلوب..." />
      </Field>

      {/* Working files (input) */}
      <SectionCard
        icon={<FolderInput className="h-4 w-4" />}
        title="ملفات الشغل"
        subtitle="الملفات والمواد اللي هتشتغل عليها التاسك (Brief، أمثلة، PSD، إلخ)"
        accentClassName="text-primary border-primary/20 bg-primary/5"
      >
        <AttachmentsField
          value={workingItems}
          onChange={(items) =>
            form.setValue("attachment_items", items, { shouldDirty: true })
          }
          userId={me.id}
          bucketPrefix="working"
          accent="primary"
          onUploadingChange={setWorkingUploading}
        />
      </SectionCard>

      {/* Submission files (output) */}
      <SectionCard
        icon={<FolderOutput className="h-4 w-4" />}
        title="ملفات التسليم للعميل"
        subtitle="النسخ النهائية اللي هتبعتها للعميل بعد ما تخلص"
        accentClassName="text-emerald-400 border-emerald-400/30 bg-emerald-400/5"
      >
        <AttachmentsField
          value={submissionItems}
          onChange={(items) =>
            form.setValue("submission_items", items, { shouldDirty: true })
          }
          userId={me.id}
          bucketPrefix="submission"
          accent="success"
          onUploadingChange={setSubmissionUploading}
        />
      </SectionCard>

      <div className="flex justify-start gap-2">
        <Button type="submit" variant="gradient" disabled={submitting || uploading}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {task ? "احفظ" : "اعمل التاسك"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          لا
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  accentClassName,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className={`flex items-start gap-3 px-4 py-3 border-b border-border ${accentClassName ?? ""}`}>
        <div className="h-7 w-7 rounded-md grid place-items-center shrink-0 bg-current/10">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs opacity-80 mt-0.5">{subtitle}</div>}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
