"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { taskSchema, type TaskFormValues } from "@/lib/schemas";
import type { Profile, Task } from "@/lib/database.types";
import { useProfile } from "@/components/profile-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/utils";

export function TaskForm({ task, workTeam }: { task?: Task; workTeam: Profile[] }) {
  const supabase = createClient();
  const router = useRouter();
  const me = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      client_name: task?.client_name ?? "",
      client_contact: task?.client_contact ?? "",
      status: task?.status ?? "pending_client",
      assigned_to: task?.assigned_to ?? null,
      due_date: task?.due_date ?? "",
      price: task?.price ?? null,
      currency: task?.currency ?? "EGP",
      tags: task?.tags ?? [],
      attachments: task?.attachments ?? [],
    },
  });

  const tags = form.watch("tags");
  const attachments = form.watch("attachments");

  function addTag(t: string) {
    const clean = t.trim();
    if (!clean) return;
    if (!tags.includes(clean)) form.setValue("tags", [...tags, clean], { shouldDirty: true });
    setTagInput("");
  }

  function removeTag(t: string) {
    form.setValue("tags", tags.filter((x) => x !== t), { shouldDirty: true });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files).slice(0, Math.max(0, 5 - attachments.length));
    if (chosen.length === 0) return toast.error("الحد الأقصى 5 مرفقات");
    setUploading(true);
    const uploaded: string[] = [];
    for (const f of chosen) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} أكبر من 10MB`); continue; }
      const path = `${me.id}/${Date.now()}-${f.name}`;
      const { error } = await supabase.storage.from("task-attachments").upload(path, f);
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("task-attachments").getPublicUrl(path);
      uploaded.push(data.publicUrl);
    }
    form.setValue("attachments", [...attachments, ...uploaded], { shouldDirty: true });
    setUploading(false);
  }

  function removeAttachment(url: string) {
    form.setValue("attachments", attachments.filter((a) => a !== url), { shouldDirty: true });
  }

  async function onSubmit(values: TaskFormValues) {
    setSubmitting(true);
    const payload = {
      ...values,
      description: values.description || null,
      client_contact: values.client_contact || null,
      assigned_to: values.assigned_to || null,
      due_date: values.due_date || null,
      price: values.price === null || values.price === undefined ? null : Number(values.price),
    };

    if (task) {
      const oldStatus = task.status;
      const { error } = await supabase.from("tasks").update(payload as Record<string, unknown>).eq("id", task.id);
      if (error) { setSubmitting(false); return toast.error(error.message); }
      if (oldStatus !== values.status) {
        const session = (await supabase.auth.getSession()).data.session;
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/on-task-status-change`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ task_id: task.id, old_status: oldStatus, new_status: values.status, changed_by: me.id }),
        }).catch(() => {});
      }
      toast.success("اتحفظ");
      router.push(`/tasks/${task.id}`);
      router.refresh();
    } else {
      const { data, error } = await supabase.from("tasks").insert({ ...payload, created_by: me.id } as Record<string, unknown>).select("id").single();
      if (error) { setSubmitting(false); return toast.error(error.message); }
      toast.success("التاسك اتعمل");
      router.push(`/tasks/${(data as { id: string }).id}`);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="عنوان التاسك" error={form.formState.errors.title?.message}>
          <Input {...form.register("title")} placeholder="تصميم لوجو، تطوير موقع..." />
        </Field>
        <Field label="اسم العميل" error={form.formState.errors.client_name?.message}>
          <Input {...form.register("client_name")} />
        </Field>
        <Field label="واتساب العميل">
          <Input {...form.register("client_contact")} placeholder="+2010..." dir="ltr" />
        </Field>
        <Field label="الحالة">
          <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as TaskFormValues["status"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (<SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>))}
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
              {workTeam.map((p) => (<SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="موعد التسليم">
          <Input type="date" {...form.register("due_date")} />
        </Field>
        <Field label="السعر">
          <div className="flex gap-2">
            <Input type="number" step="0.01" {...form.register("price")} />
            <Select value={form.watch("currency") ?? "EGP"} onValueChange={(v) => form.setValue("currency", v)}>
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

      <Field label="التفاصيل">
        <Textarea rows={5} {...form.register("description")} placeholder="اكتب تفاصيل الشغل المطلوب..." />
      </Field>

      <Field label="التاجات">
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs">
              {t}
              <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
          }}
          onBlur={() => addTag(tagInput)}
          placeholder="اكتب واضغط Enter"
        />
      </Field>

      <Field label="الملفات">
        <div className="space-y-2">
          {attachments.map((url) => (
            <div key={url} className="flex items-center justify-between rounded border p-2 text-sm">
              <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">{url.split("/").pop()}</a>
              <button type="button" onClick={() => removeAttachment(url)} className="text-destructive hover:text-destructive/80">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-md p-4 text-sm text-muted-foreground hover:bg-accent">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "بيترفع..." : "ارفع ملفات"}
            <input type="file" className="hidden" multiple onChange={(e) => onFiles(e.target.files)} />
          </label>
        </div>
      </Field>

      <div className="flex justify-start gap-2">
        <Button type="submit" variant="gradient" disabled={submitting || uploading}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {task ? "احفظ" : "اعمل التاسك"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>لا</Button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
