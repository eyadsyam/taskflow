"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X, Sparkles, Wand2, Tags } from "lucide-react";
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
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [improvingDesc, setImprovingDesc] = useState(false);
  const [suggestingTags, setSuggestingTags] = useState(false);
  const [numberingTitle, setNumberingTitle] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);

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
    },
  });

  const tags = form.watch("tags");
  const attachments = form.watch("attachments");
  const isNew = !task;

  // Count existing tasks that have the given tag, then auto-set title to
  // `{tag} #{count+1}`. Only runs on NEW tasks and only if title is empty.
  async function autoNumberTitleForTag(tagName: string) {
    if (!isNew) return;
    const currentTitle = form.getValues("title").trim();
    if (currentTitle.length > 0) return; // don't overwrite user-entered titles
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
    setSuggestedTags((prev) => prev.filter((s) => s !== clean));
    // Auto-number title based on FIRST tag only
    if (wasEmpty) autoNumberTitleForTag(clean);
  }

  function removeTag(t: string) {
    form.setValue("tags", tags.filter((x) => x !== t), { shouldDirty: true });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const chosen = Array.from(files);
    setUploading(true);
    const uploaded: string[] = [];
    for (const f of chosen) {
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

  async function callAI(path: string, body: Record<string, unknown>) {
    const session = (await supabase.auth.getSession()).data.session;
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "AI error");
    return data;
  }

  async function generateTitle() {
    const description = form.getValues("description");
    const client_name = form.getValues("client_name");
    const currentTags = form.getValues("tags");
    if (!description && !client_name && (!currentTags || currentTags.length === 0)) {
      toast.error("اكتب تفاصيل أو اسم عميل أو تاجات الأول");
      return;
    }
    setGeneratingTitle(true);
    try {
      const data = await callAI("generate-task-title", {
        description,
        client_name,
        tags: currentTags,
        price: form.getValues("price"),
        currency: form.getValues("currency"),
      });
      form.setValue("title", data.title, { shouldDirty: true, shouldValidate: true });
      toast.success("اتولد عنوان جديد ✨");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGeneratingTitle(false);
    }
  }

  async function improveDescription() {
    const description = form.getValues("description");
    if (!description || description.trim().length < 5) {
      toast.error("اكتب شوية تفاصيل الأول");
      return;
    }
    setImprovingDesc(true);
    try {
      const data = await callAI("improve-task-description", {
        description,
        client_name: form.getValues("client_name"),
        tags: form.getValues("tags"),
      });
      form.setValue("description", data.description, { shouldDirty: true });
      toast.success("اتحسّنت التفاصيل ✨");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImprovingDesc(false);
    }
  }

  async function suggestTags() {
    const description = form.getValues("description");
    const client_name = form.getValues("client_name");
    if (!description && !client_name) {
      toast.error("اكتب تفاصيل أو اسم عميل الأول");
      return;
    }
    setSuggestingTags(true);
    try {
      const data = await callAI("suggest-task-tags", {
        description,
        client_name,
        existing_tags: form.getValues("tags"),
      });
      setSuggestedTags(data.tags ?? []);
      if (!data.tags?.length) toast.info("مفيش اقتراحات جديدة");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSuggestingTags(false);
    }
  }

  async function onSubmit(values: TaskFormValues) {
    setSubmitting(true);
    const payload = {
      ...values,
      description: values.description || null,
      client_contact: values.client_contact || null,
      assigned_to: values.assigned_to || null,
      due_date: values.due_date ? new Date(values.due_date).toISOString() : null,
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
      {/* 1) TAGS — first, so we can auto-name the task */}
      <Field
        label="التاجات"
        hint={isNew ? "أول تاج هيحدد اسم التاسك تلقائياً (مثلاً: تصميم #3)" : undefined}
      >
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
              {t}
              <button type="button" onClick={() => removeTag(t)} className="hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
            }}
            onBlur={() => addTag(tagInput)}
            placeholder="اكتب تاج (تصميم، موقع...) واضغط Enter"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={suggestTags}
            disabled={suggestingTags}
            title="اقتراحات AI للتاجات"
          >
            {suggestingTags ? <Loader2 className="h-4 w-4 animate-spin" /> : <Tags className="h-4 w-4" />}
            اقترح
          </Button>
        </div>
        {suggestedTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-xs text-muted-foreground me-1">اقتراحات:</span>
            {suggestedTags.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addTag(s)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-xs hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                {s}
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* 2) Title + Client + Contact */}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="عنوان التاسك" error={form.formState.errors.title?.message}>
          <div className="relative">
            <Input
              {...form.register("title")}
              placeholder="هيتعبى تلقائياً من التاج أو اضغط AI"
              className="pe-24"
            />
            <button
              type="button"
              onClick={generateTitle}
              disabled={generatingTitle || numberingTitle}
              title="ولّد عنوان بالـ AI من التفاصيل"
              className="absolute end-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
            >
              {generatingTitle || numberingTitle ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>AI</span>
            </button>
          </div>
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
        <Field label="موعد التسليم (التاريخ والساعة)">
          <Input type="datetime-local" {...form.register("due_date")} />
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

      {/* 3) Description w/ AI improver */}
      <Field label="التفاصيل">
        <div className="relative">
          <Textarea
            rows={5}
            {...form.register("description")}
            placeholder="اكتب تفاصيل الشغل المطلوب..."
            className="pe-2"
          />
          <button
            type="button"
            onClick={improveDescription}
            disabled={improvingDesc}
            title="حسّن التفاصيل بالـ AI"
            className="absolute end-2 top-2 inline-flex items-center gap-1 rounded border border-border bg-elevated/90 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors backdrop-blur"
          >
            {improvingDesc ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            <span>حسّن بالـ AI</span>
          </button>
        </div>
      </Field>

      {/* 4) Files */}
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

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Converts an ISO timestamp (or date-only string) to the "YYYY-MM-DDTHH:mm" shape
// required by <input type="datetime-local"> in the user's local timezone.
function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
