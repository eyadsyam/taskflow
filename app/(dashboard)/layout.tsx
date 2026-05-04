import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ProfileContext } from "@/components/profile-context";
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = rawProfile as Profile | null;
  if (!profile) {
    // Profile row should be auto-created by handle_new_user trigger; fail safe:
    redirect("/login?error=missing_profile");
  }

  return (
    <ProfileContext profile={profile}>
      <KeyboardShortcuts />
      <div className="min-h-screen bg-muted/30">
        <Sidebar />
        <div className="lg:pe-72">
          <Header />
          <main className="p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </ProfileContext>
  );
}
