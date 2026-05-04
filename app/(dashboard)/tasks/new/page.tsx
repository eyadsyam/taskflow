import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/tasks/TaskForm";
import type { Profile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const supabase = createClient();
  const { data: rawProfiles } = await supabase.from("profiles").select("*").order("full_name");
  const teamMembers = ((rawProfiles ?? []) as Profile[]);
  return (
    <div className="fade-in">
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="section-label mb-1">New Task</div>
          <h1 className="text-3xl font-bold tracking-tight">تاسك جديد</h1>
          <p className="text-sm text-muted-foreground mt-1">املا التفاصيل وابدأ الشغل</p>
        </div>
      </section>
      <section className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto rounded-lg border border-border bg-card p-6">
          <TaskForm workTeam={teamMembers} />
        </div>
      </section>
    </div>
  );
}
