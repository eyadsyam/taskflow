import { createClient } from "@/lib/supabase/server";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Profile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const supabase = createClient();
  const { data: rawProfiles } = await supabase.from("profiles").select("*").order("full_name");
  const teamMembers = ((rawProfiles ?? []) as Profile[]);
  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader><CardTitle>تاسك جديد</CardTitle></CardHeader>
        <CardContent><TaskForm workTeam={teamMembers} /></CardContent>
      </Card>
    </div>
  );
}
