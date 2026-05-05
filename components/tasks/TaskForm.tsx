"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload, X, Folder, FolderOpen, File as FileIcon } from "lucide-react";
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

// Extend HTMLInputElement file input attrs with non-standard `webkitdirectory`
// so TS lets us pass it through to the DOM.
declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

type FileWithPath = File & { webkitRelativePath?: string };

export function TaskForm({ task, workTeam }: { task?: Task; workTeam: Profile[] }) {
  const supabase = createClient();
  const router = useRouter();
  const me = useProfile();
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [numberingTitle, setNumberingTitle] = useState(false);
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
      due_date: task?.due_date ? toLocalDateTimeInput(task.due_date) : "",
      price: task?.price ?? null,
      currency: task?.currency ?? "EGP",
      tags: task?.tags ?? [],
      attachments: task?.attachments ?? [],
      attachment_items: (task?.attachment_items ?? normalizeLegacyAttachments(task?.attachments ?? [])) as AttachmentItem[],
    },
  });

  const tags = form.watch("tags");
  const items = form.watch("attachment_items") as AttachmentItem[];
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

  /**
   * Upload one or more files to storage.
   * `relativePath` is the path inside the uploaded folder (e.g. "BigData/templates/foo.pdf").
   * For single files (no folder) it's just the file name.
   */
  async function uploadFiles(files: FileWithPath[]) {
    if (!files.length) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    const uploaded: AttachmentItem[] = [];
    const batchId = Date.now();

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const relativePath = f.webkitRelativePath && f.webkitRelativePath.length > 0
        ? f.webkitRelativePath
        : f.name;
      // Storage path: `{user_id}/{batchId}/{relativePath}`.
      // The batchId prevents collisions when the same folder is uploaded twice.
      const storagePath = `${me.id}/${batchId}/${relativePath}`;
      const { error } = await supabase.storage.from("task-attachments").upload(storagePath, f, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        toast.error(`${f.name}: ${error.message}`);
        continue;
      }
      const { data } = supabase.storage.from("task-attachments").getPublicUrl(storagePath);
      uploaded.push({
        url: data.publicUrl,
        name: f.name,
        path: relativePath,
        type: f.type || null,
        size: f.size || null,
      });
      setUploadProgress({ done: i + 1, total: files.length });
    }

    form.setValue("attachment_items", [...items, ...uploaded], { shouldDirty: true });
    setUploading(false);
    setUploadProgress(null);
    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} ملف اترفع`);
    }
  }

  function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    uploadFiles(Array.from(fileList) as FileWithPath[]);
  }

  function removeItem(path: string) {
    form.setValue("attachment_items", items.filter((a) => a.path !== path), { shouldDirty: true });
  }

  function removeFolder(folderPath: string) {
    const prefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";
    form.setValue(
      "attachment_items",
      items.filter((a) => !a.path.startsWith(prefix)),
      { shouldDirty: true },
    );
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
      // Keep legacy `attachments` (text[]) in sync with URLs for backward compat
      attachments: values.attachment_items.map((a) => a.url),
      attachment_items: values.attachment_items,
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
      {/* 1) TAGS first — auto-names the task */}
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
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); }
          }}
          onBlur={() => addTag(tagInput)}
          placeholder="اكتب تاج (تصميم، Big Data...) واضغط Enter"
        />
      </Field>

      {/* 2) Title & client info */}
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

      {/* 3) Description */}
      <Field label="التفاصيل">
        <Textarea rows={5} {...form.register("description")} placeholder="اكتب تفاصيل الشغل المطلوب..." />
      </Field>

      {/* 4) Attachments — file OR whole folder */}
      <Field label="الملفات والمجلدات">
        <AttachmentsEditor
          items={items}
          onRemove={removeItem}
          onRemoveFolder={removeFolder}
          onFiles={onFiles}
          uploading={uploading}
          progress={uploadProgress}
        />
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

// ---------------------------------------------------------------------------

function AttachmentsEditor({
  items,
  onRemove,
  onRemoveFolder,
  onFiles,
  uploading,
  progress,
}: {
  items: AttachmentItem[];
  onRemove: (path: string) => void;
  onRemoveFolder: (folder: string) => void;
  onFiles: (files: FileList | null) => void;
  uploading: boolean;
  progress: { done: number; total: number } | null;
}) {
  const tree = buildFileTree(items);

  return (
    <div className="space-y-3">
      {/* Existing files/folders */}
      {items.length > 0 && (
        <div className="rounded-lg border border-border bg-elevated/30 p-2">
          <FileTreeView node={tree} onRemoveFile={onRemove} onRemoveFolder={onRemoveFolder} depth={0} />
        </div>
      )}

      {/* Two upload buttons: single files, or whole folder */}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-border rounded-md p-4 text-sm text-muted-foreground hover:bg-accent hover:border-primary/40 transition-colors">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>{uploading ? "بيترفع..." : "ارفع ملفات"}</span>
          <input type="file" className="hidden" multiple disabled={uploading} onChange={(e) => onFiles(e.target.files)} />
        </label>

        <label className="flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-primary/30 rounded-md p-4 text-sm text-primary hover:bg-primary/5 hover:border-primary/60 transition-colors">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />}
          <span>{uploading ? "بيترفع..." : "ارفع مجلد كامل"}</span>
          <input
            type="file"
            className="hidden"
            multiple
            disabled={uploading}
            webkitdirectory=""
            directory=""
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
      </div>

      {uploading && progress && (
        <div className="text-xs text-muted-foreground">
          {progress.done} / {progress.total}
          <div className="mt-1 h-1 w-full rounded bg-elevated overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- File tree building & rendering ---------------------------------------

type TreeNode = {
  name: string;
  path: string; // full path from root
  isFolder: boolean;
  item?: AttachmentItem;
  children: TreeNode[];
};

function buildFileTree(items: AttachmentItem[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFolder: true, children: [] };

  for (const item of items) {
    const segments = item.path.split("/").filter(Boolean);
    let current = root;
    let accumPath = "";

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      accumPath = accumPath ? `${accumPath}/${seg}` : seg;
      const isLast = i === segments.length - 1;

      let child = current.children.find((c) => c.name === seg);
      if (!child) {
        child = {
          name: seg,
          path: accumPath,
          isFolder: !isLast,
          children: [],
        };
        current.children.push(child);
      }
      if (isLast) {
        child.isFolder = false;
        child.item = item;
      }
      current = child;
    }
  }

  // Sort: folders first, then by name
  const sortRec = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortRec);
  };
  sortRec(root);

  return root;
}

function FileTreeView({
  node,
  onRemoveFile,
  onRemoveFolder,
  depth,
}: {
  node: TreeNode;
  onRemoveFile: (path: string) => void;
  onRemoveFolder: (folder: string) => void;
  depth: number;
}) {
  if (node.isFolder && depth === 0) {
    // Root node — just render children without the folder header
    return (
      <div className="space-y-0.5">
        {node.children.map((c) => (
          <FileTreeView key={c.path} node={c} onRemoveFile={onRemoveFile} onRemoveFolder={onRemoveFolder} depth={1} />
        ))}
      </div>
    );
  }

  const pad = { paddingInlineStart: `${depth * 16}px` };

  if (node.isFolder) {
    return (
      <div>
        <div
          className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-elevated/60"
          style={pad}
        >
          <Folder className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
          <span className="text-[10px] text-muted-foreground">
            {countFiles(node)} ملف
          </span>
          <button
            type="button"
            onClick={() => onRemoveFolder(node.path)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
            title="احذف المجلد كله"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="space-y-0.5">
          {node.children.map((c) => (
            <FileTreeView key={c.path} node={c} onRemoveFile={onRemoveFile} onRemoveFolder={onRemoveFolder} depth={depth + 1} />
          ))}
        </div>
      </div>
    );
  }

  // File
  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-elevated/60"
      style={pad}
    >
      <FileIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <a
        href={node.item?.url}
        target="_blank"
        rel="noreferrer"
        className="text-sm flex-1 truncate hover:text-primary hover:underline"
      >
        {node.name}
      </a>
      {node.item?.size != null && (
        <span className="text-[10px] text-muted-foreground tabular">
          {formatBytes(node.item.size)}
        </span>
      )}
      <button
        type="button"
        onClick={() => onRemoveFile(node.path)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function countFiles(node: TreeNode): number {
  if (!node.isFolder) return 1;
  return node.children.reduce((acc, c) => acc + countFiles(c), 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Converts legacy `attachments: string[]` of URLs into AttachmentItems.
function normalizeLegacyAttachments(urls: string[]): AttachmentItem[] {
  return urls.map((url) => {
    const name = decodeURIComponent(url.split("/").pop() ?? url);
    return { url, name, path: name, type: null, size: null };
  });
}

// ---------------------------------------------------------------------------

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

function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
