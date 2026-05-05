"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Sparkles,
  Loader2,
  ArrowLeft,
  Hash,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const EXAMPLES = [
  "كل تاسكات Big Data",
  "التاسكات المتأخرة",
  "التاسكات الشغالة على إياد",
  "تاسكات خلصت والعميل لسه مدفعش",
  "تاسكات اتعملت الشهر ده",
  "تاسكات مطعم التحرير",
];

type SearchResult = {
  interpretation: string;
  filters: Record<string, unknown>;
  tasks: Task[];
  count: number;
};

export function SearchClient({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (trimmed.length < 2) return;
      setLoading(true);
      setError(null);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-search`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token ?? ""}`,
            },
            body: JSON.stringify({ query: trimmed }),
          },
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "فشل البحث");
        setResult(data as SearchResult);
        // Sync to URL
        const params = new URLSearchParams(searchParams);
        params.set("q", trimmed);
        router.replace(`/search?${params.toString()}`);
      } catch (e) {
        setError((e as Error).message);
        setResult(null);
      } finally {
        setLoading(false);
      }
    },
    [supabase, router, searchParams],
  );

  // Run initial search if q= in URL
  useEffect(() => {
    if (initialQuery) runSearch(initialQuery);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    runSearch(query);
  }

  return (
    <div className="space-y-6">
      {/* Search input */}
      <form onSubmit={onSubmit} className="relative">
        <div className="relative flex items-center">
          <Sparkles className="absolute start-3 h-4 w-4 text-primary pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اسأل بلغتك... مثلاً: تاسكات Big Data المتأخرة"
            className="w-full h-12 ps-10 pe-32 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
          <Button
            type="submit"
            disabled={loading || query.trim().length < 2}
            className="absolute end-1 h-10"
            variant="default"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">ابحث</span>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 ps-2">
          مدعوم بـ Gemini AI — يفهم العربي المصري والإنجليزي
        </p>
      </form>

      {/* Example chips (only when no results yet) */}
      {!result && !loading && (
        <div>
          <div className="section-label mb-2">جرب تسأل</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setQuery(ex);
                  runSearch(ex);
                }}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all"
              >
                <Sparkles className="h-3 w-3" />
                {ex}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-0.5">
                فهمت كده:
              </div>
              <div className="text-sm font-medium">{result.interpretation}</div>
              <div className="text-xs text-muted-foreground mt-1">
                لقيت {result.count} تاسك
              </div>
            </div>
          </div>

          {result.tasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-lg border border-border bg-elevated grid place-items-center mb-3">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                مفيش نتايج مطابقة
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {result.tasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40 transition-colors"
    >
      <TaskStatusBadge status={task.status} />
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate text-sm">{task.title}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <UserIcon className="h-3 w-3" />
            {task.client_name}
          </span>
          {task.due_date && (
            <span>· {formatDateTime(task.due_date)}</span>
          )}
          {(task.tags?.length ?? 0) > 0 && (
            <span className="inline-flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {task.tags!.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
      </div>
      {task.price && (
        <div className="text-xs font-semibold text-primary tabular shrink-0">
          {formatCurrency(task.price, task.currency ?? "EGP")}
        </div>
      )}
      <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0 rtl:rotate-180" />
    </Link>
  );
}
