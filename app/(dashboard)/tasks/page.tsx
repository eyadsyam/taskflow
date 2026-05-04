import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";
import type { Profile, Task } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = createClient();
  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").order("full_name"),
  ]);

  return <TasksClient initialTasks={(tasks ?? []) as Task[]} profiles={(profiles ?? []) as Profile[]} />;
}
