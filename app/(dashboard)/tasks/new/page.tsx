import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const supabase = createClient();
  const { data: rawProfiles } = await supabase.from("profiles").select("*").order("full_name");
  const workTeam = ((rawProfiles ?? []) as Profile[]).filter((p) => p.role !== "client_team");
  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader><CardTitle>تاسك جديد</CardTitle></CardHeader>
        <CardContent><TaskForm workTeam={workTeam} /></CardContent>
      </Card>
    </div>
  );
}
