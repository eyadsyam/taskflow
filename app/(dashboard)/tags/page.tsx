import Link from "next/link";
import { Tag as TagIcon, Hash } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TagsOverviewPage() {
  const supabase = createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, tags, status")
    .not("tags", "is", null);

  const all = (tasks ?? []) as Pick<Task, "id" | "tags" | "status">[];
  const tagMap = new Map<string, { count: number; openCount: number }>();
  for (const t of all) {
    for (const tag of t.tags ?? []) {
      const entry = tagMap.get(tag) ?? { count: 0, openCount: 0 };
      entry.count += 1;
      if (t.status !== "paid_closed") entry.openCount += 1;
      tagMap.set(tag, entry);
    }
  }

  // Sort by count desc
  const tags = Array.from(tagMap.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="fade-in">
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="section-label mb-1">Tags</div>
          <h1 className="text-3xl font-bold tracking-tight">التاجات</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tags.length} تاج · {all.length} تاسك
          </p>
        </div>
      </section>

      <section className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-5xl mx-auto">
          {tags.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="mx-auto h-12 w-12 rounded-lg border border-border bg-elevated grid place-items-center mb-3">
                <TagIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">لسه مفيش تاجات</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tags.map((tag) => (
                <Link
                  key={tag.name}
                  href={`/tags/${encodeURIComponent(tag.name)}`}
                  className="group flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-primary/5 transition-all"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                    <Hash className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate group-hover:text-primary transition-colors">
                      {tag.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {tag.count} تاسك
                      {tag.openCount > 0 && (
                        <span className="ms-1.5 text-emerald-400">
                          · {tag.openCount} شغال
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
