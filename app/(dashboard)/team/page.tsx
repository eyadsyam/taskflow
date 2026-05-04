import { createClient } from "@/lib/supabase/server";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import type { Profile, Task } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const [{ data: profiles }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("*").order("last_seen_at", { ascending: false }),
    supabase.from("tasks").select("assigned_to, status"),
  ]);

  const activeCountByUser = new Map<string, number>();
  for (const t of (tasks ?? []) as Pick<Task, "assigned_to" | "status">[]) {
    if (t.assigned_to && t.status !== "paid_closed") {
      activeCountByUser.set(t.assigned_to, (activeCountByUser.get(t.assigned_to) ?? 0) + 1);
    }
  }
  
  const taskCountsObj: Record<string, number> = {};
  activeCountByUser.forEach((v, k) => { taskCountsObj[k] = v; });

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">الفريق</h1>
        <p className="text-muted-foreground mt-1">{(profiles ?? []).length} عضو في الفريق</p>
      </div>
      
      <TeamMembersList 
        members={(profiles ?? []) as Profile[]} 
        taskCounts={taskCountsObj}
        currentUserId={user?.id || ""}
      />
    </div>
  );
}
