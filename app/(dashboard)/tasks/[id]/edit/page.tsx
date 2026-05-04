import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader><CardTitle>تعديل المهمة</CardTitle></CardHeader>
        <CardContent><TaskForm task={task as Task} workTeam={teamMembers} /></CardContent>
      </Card>
    </div>
  );
}
