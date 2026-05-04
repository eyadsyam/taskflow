import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";
import type { Profile, Task } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = createClient();
  const [{ data: profiles }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("tasks").select("assigned_to, status"),
  ]);

  const activeCountByUser = new Map<string, number>();
  for (const t of (tasks ?? []) as Pick<Task, "assigned_to" | "status">[]) {
    if (t.assigned_to && t.status !== "paid_closed") {
      activeCountByUser.set(t.assigned_to, (activeCountByUser.get(t.assigned_to) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">الفريق</h1>
        <p className="text-muted-foreground">{(profiles ?? []).length} عضو</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {((profiles ?? []) as Profile[]).map((p) => {
          const initials = p.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
          return (
            <Card key={p.id}>
              <CardHeader className="flex-row items-center gap-3">
                <Avatar className="h-12 w-12">
                  {p.avatar_url && <AvatarImage src={p.avatar_url} alt={p.full_name} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base truncate">{p.full_name}</CardTitle>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm">
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{ROLE_LABELS[p.role]}</span>
                <span className="text-muted-foreground">{activeCountByUser.get(p.id) ?? 0} مهمة نشطة</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
