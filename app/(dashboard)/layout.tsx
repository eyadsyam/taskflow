import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ProfileContext } from "@/components/profile-context";
import { PresenceTracker } from "@/components/presence-tracker";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = rawProfile as Profile | null;
  if (!profile) {
    redirect("/login?error=missing_profile");
  }

  return (
    <ProfileContext profile={profile}>
      <PresenceTracker />
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pe-72">
          <Header />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
      </div>
    </ProfileContext>
  );
}
