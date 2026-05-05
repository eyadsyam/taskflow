"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, X, Folder, FolderOpen, File as FileIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AttachmentItem } from "@/lib/database.types";
import { cn } from "@/lib/utils";

declare module "react" {
  interface InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

type FileWithPath = File & { webkitRelativePath?: string };

export type AttachmentsFieldProps = {
  /** Current items */
  value: AttachmentItem[];
  /** Update handler */
  onChange: (items: AttachmentItem[]) => void;
  /** Owner user ID for storage path scoping */
  userId: string;
  /** Sub-folder under the user's storage prefix to keep working/submission files separated */
  bucketPrefix: string;
  /** Visual accent — affects upload button colors */
  accent?: "primary" | "success";
  /** Notify parent about uploading state so it can disable the submit button */
  onUploadingChange?: (uploading: boolean) => void;
};

export function AttachmentsField({
  value,
  onChange,
  userId,
  bucketPrefix,
  accent = "primary",
  onUploadingChange,
}: AttachmentsFieldProps) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  function setUploadingState(v: boolean) {
    setUploading(v);
    onUploadingChange?.(v);
  }

  async function uploadFiles(files: FileWithPath[]) {
    if (!files.length) return;
    setUploadingState(true);
    setProgress({ done: 0, total: files.length });

    const uploaded: AttachmentItem[] = [];
    const batchId = Date.now();

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const relativePath =
        f.webkitRelativePath && f.webkitRelativePath.length > 0
          ? f.webkitRelativePath
          : f.name;
      // Supabase Storage rejects non-ASCII chars (Arabic, etc.) in keys.
      // Sanitize storage path while keeping the original `relativePath` in
      // the DB so the UI displays the real Arabic folder/file names.
      const safeStoragePath = sanitizeStoragePath(relativePath, i);
      const storagePath = `${userId}/${bucketPrefix}/${batchId}/${safeStoragePath}`;
      const { error } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, f, { cacheControl: "3600", upsert: false });
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
      setProgress({ done: i + 1, total: files.length });
    }

    onChange([...value, ...uploaded]);
    setUploadingState(false);
    setProgress(null);
    if (uploaded.length > 0) {
      toast.success(`${uploaded.length} ملف اترفع`);
    }
  }

  function onFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    uploadFiles(Array.from(fileList) as FileWithPath[]);
  }

  function removeFile(path: string) {
    onChange(value.filter((a) => a.path !== path));
  }

  function removeFolder(folderPath: string) {
    const prefix = folderPath.endsWith("/") ? folderPath : folderPath + "/";
    onChange(value.filter((a) => !a.path.startsWith(prefix)));
  }

  const tree = buildFileTree(value);

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="rounded-lg border border-border bg-elevated/30 p-2">
          <FileTreeView
            node={tree}
            onRemoveFile={removeFile}
            onRemoveFolder={removeFolder}
            depth={0}
          />
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label
          className={cn(
            "flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-md p-4 text-sm transition-colors",
            "border-border text-muted-foreground hover:bg-accent",
            accent === "primary" && "hover:border-primary/40",
            accent === "success" && "hover:border-emerald-400/40",
          )}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span>{uploading ? "بيترفع..." : "ارفع ملفات"}</span>
          <input
            type="file"
            className="hidden"
            multiple
            disabled={uploading}
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>

        <label
          className={cn(
            "flex items-center justify-center gap-2 cursor-pointer border-2 border-dashed rounded-md p-4 text-sm transition-colors",
            accent === "primary" &&
              "border-primary/30 text-primary hover:bg-primary/5 hover:border-primary/60",
            accent === "success" &&
              "border-emerald-400/40 text-emerald-400 hover:bg-emerald-400/5 hover:border-emerald-400/70",
          )}
        >
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
              className={cn(
                "h-full transition-all",
                accent === "primary" ? "bg-primary" : "bg-emerald-400",
              )}
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// -- Tree helpers (editor view, with remove buttons) ------------------------

type TreeNode = {
  name: string;
  path: string;
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
        child = { name: seg, path: accumPath, isFolder: !isLast, children: [] };
        current.children.push(child);
      }
      if (isLast) {
        child.isFolder = false;
        child.item = item;
      }
      current = child;
    }
  }
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortRec);
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
    return (
      <div className="space-y-0.5">
        {node.children.map((c) => (
          <FileTreeView
            key={c.path}
            node={c}
            onRemoveFile={onRemoveFile}
            onRemoveFolder={onRemoveFolder}
            depth={1}
          />
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
          <span className="text-[10px] text-muted-foreground">{countFiles(node)} ملف</span>
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
            <FileTreeView
              key={c.path}
              node={c}
              onRemoveFile={onRemoveFile}
              onRemoveFolder={onRemoveFolder}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }

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

function countFiles(n: TreeNode): number {
  if (!n.isFolder) return 1;
  return n.children.reduce((acc, c) => acc + countFiles(c), 0);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// Converts legacy `attachments: string[]` of URLs into AttachmentItems.
export function normalizeLegacyAttachments(urls: string[]): AttachmentItem[] {
  return urls.map((url) => {
    const name = decodeURIComponent(url.split("/").pop() ?? url);
    return { url, name, path: name, type: null, size: null };
  });
}

/**
 * Sanitize a relative path so it's safe as a Supabase Storage object key.
 * - Preserves slashes (folder hierarchy).
 * - Replaces any non-ASCII or unsafe character with an underscore.
 * - Keeps file extension visible (helpful for content-type detection).
 * - Adds an index suffix to the filename to avoid collisions across
 *   sanitized segments that map to the same name (e.g. two different
 *   Arabic-named folders that both become "_____").
 */
function sanitizeStoragePath(relativePath: string, index: number): string {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length === 0) return `file-${index}`;

  const sanitized = segments.map((seg) => sanitizeSegment(seg));
  // Append a small unique tag to the filename (last segment) so that
  // sanitization collisions don't overwrite files within the same batch.
  const last = sanitized[sanitized.length - 1];
  const dot = last.lastIndexOf(".");
  const base = dot > 0 ? last.slice(0, dot) : last;
  const ext = dot > 0 ? last.slice(dot) : "";
  sanitized[sanitized.length - 1] = `${base}-${index}${ext}`;
  return sanitized.join("/");
}

function sanitizeSegment(seg: string): string {
  // Allowed: a-z, A-Z, 0-9, dot, dash, underscore. Everything else → _
  // Trim leading/trailing whitespace and dots.
  const replaced = seg
    .normalize("NFKD")
    .replace(/[^\w.-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+|[._]+$/g, "");
  return replaced.length > 0 ? replaced.slice(0, 80) : "x";
}
