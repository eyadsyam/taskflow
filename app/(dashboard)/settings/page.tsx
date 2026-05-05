import { createClient } from "@/lib/supabase/server";
import { SettingsClient } from "./settings-client";
import type { Profile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, job_title, avatar_url")
    .order("full_name");

  return (
    <div className="fade-in">
      <section className="border-b border-border px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="section-label mb-1">Settings</div>
          <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
          <p className="text-sm text-muted-foreground mt-1">إعدادات حسابك والفريق</p>
        </div>
      </section>
      <section className="px-4 md:px-8 lg:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <SettingsClient
            profile={profile as Profile}
            teamMembers={(allProfiles ?? []) as Profile[]}
          />
        </div>
      </section>
    </div>
  );
}
