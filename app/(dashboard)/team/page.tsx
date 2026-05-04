import { createClient } from "@/lib/supabase/server";
import { TeamMembersList } from "@/components/team/TeamMembersList";
import type { Profile, Task } from "@/lib/database.types";
import { getUserStatus } from "@/lib/utils";

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

  const allProfiles = (profiles ?? []) as Profile[];
  const onlineCount = allProfiles.filter((p) => getUserStatus(p.last_seen_at) === "online").length;
  const adminCount = allProfiles.filter((p) => p.role === "admin").length;

  return (
    <div className="fade-in">
      {/* Header */}
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="section-label mb-1">Team</div>
          <h1 className="text-3xl font-bold tracking-tight">التيم</h1>

          {/* Mini stats */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <Stat label="الكل" value={allProfiles.length} />
            <Divider />
            <Stat label="أونلاين" value={onlineCount} dot="bg-emerald-500" />
            <Divider />
            <Stat label="مسؤولين" value={adminCount} />
          </div>
        </div>
      </section>

      {/* Members */}
      <section className="px-4 md:px-8 lg:px-10 py-6 max-w-[1400px] mx-auto">
        <TeamMembersList
          members={allProfiles}
          taskCounts={taskCountsObj}
          currentUserId={user?.id || ""}
        />
      </section>
    </div>
  );
}

function Stat({ label, value, dot }: { label: string; value: number; dot?: string }) {
  return (
    <div className="flex items-center gap-2">
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold tabular">{value}</span>
    </div>
  );
}

function Divider() {
  return <span className="h-3 w-px bg-border" />;
}
