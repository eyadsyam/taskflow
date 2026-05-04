import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/tasks/TaskForm";
import type { Profile, Task } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function EditTaskPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: rawTask }, { data: rawProfiles }] = await Promise.all([
    supabase.from("tasks").select("*").eq("id", params.id).single(),
    supabase.from("profiles").select("*").order("full_name"),
  ]);
  if (!rawTask) notFound();
  const task = rawTask as unknown as Task;
  if (task.status === "paid_closed") redirect(`/tasks/${params.id}?error=locked`);

  const teamMembers = ((rawProfiles ?? []) as Profile[]);
  return (
    <div className="fade-in">
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="section-label mb-1">Edit</div>
          <h1 className="text-3xl font-bold tracking-tight">عدل التاسك</h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">{task.title}</p>
        </div>
      </section>
      <section className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto rounded-lg border border-border bg-card p-6">
          <TaskForm task={task} workTeam={teamMembers} />
        </div>
      </section>
    </div>
  );
}
