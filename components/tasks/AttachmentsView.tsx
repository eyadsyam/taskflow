"use client";
import { useState } from "react";
import { ChevronDown, ChevronLeft, Folder, FolderOpen, File as FileIcon, Download } from "lucide-react";
import type { AttachmentItem } from "@/lib/database.types";
import { cn } from "@/lib/utils";

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

function normalizeLegacy(urls: string[]): AttachmentItem[] {
  return urls.map((url) => {
    const name = decodeURIComponent(url.split("/").pop() ?? url);
    return { url, name, path: name };
  });
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

export function AttachmentsView({
  items,
  legacyUrls,
}: {
  items: AttachmentItem[];
  legacyUrls: string[];
}) {
  // If we have attachment_items, use them. Otherwise fall back to legacy URL list.
  const finalItems = items.length > 0 ? items : normalizeLegacy(legacyUrls);
  if (finalItems.length === 0) return null;

  const tree = buildFileTree(finalItems);
  return (
    <div className="space-y-0.5">
      {tree.children.map((c) => (
        <TreeRow key={c.path} node={c} depth={0} defaultOpen />
      ))}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  defaultOpen = false,
}: {
  node: TreeNode;
  depth: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth === 0);
  const pad = { paddingInlineStart: `${depth * 16 + 8}px` };

  if (node.isFolder) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-elevated/60 transition-colors text-start"
          style={pad}
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0 rtl:rotate-180" />
          )}
          {open ? (
            <FolderOpen className="h-4 w-4 text-amber-400 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-400 shrink-0" />
          )}
          <span className="text-sm font-medium flex-1 truncate">{node.name}</span>
          <span className="text-[10px] text-muted-foreground tabular">
            {countFiles(node)}
          </span>
        </button>
        {open && (
          <div className="space-y-0.5">
            {node.children.map((c) => (
              <TreeRow key={c.path} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // File
  const isImage = node.item?.type?.startsWith("image/") ?? /\.(png|jpe?g|gif|webp|svg)$/i.test(node.name);
  return (
    <div
      className={cn(
        "group flex items-center gap-2 py-1.5 px-2 rounded hover:bg-elevated/60 transition-colors",
      )}
      style={pad}
    >
      <span className="w-3.5" />
      {isImage ? (
        // Render a tiny thumbnail for images
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={node.item?.url}
          alt={node.name}
          className="h-5 w-5 rounded object-cover shrink-0 border border-border"
        />
      ) : (
        <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <a
        href={node.item?.url}
        target="_blank"
        rel="noreferrer"
        className="text-sm flex-1 truncate hover:text-primary hover:underline"
      >
        {node.name}
      </a>
      {node.item?.size != null && (
        <span className="text-[10px] text-muted-foreground tabular shrink-0">
          {formatBytes(node.item.size)}
        </span>
      )}
      <a
        href={node.item?.url}
        download={node.name}
        target="_blank"
        rel="noreferrer"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
        title="تحميل"
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
