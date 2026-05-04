"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingWizard } from "./onboarding-wizard";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      // Try to get existing profile
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");
      setProfileExists(!error && !!profile);
      
      // Use profile data if exists, otherwise use user metadata
      setInitialData(profile as Record<string, unknown> || {
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
        email: user.email || "",
        role: user.user_metadata?.role || "work_team",
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      });
      setLoading(false);
    }
    checkAuth();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId || !initialData) return null;

  return (
    <OnboardingWizard 
      userId={userId} 
      userEmail={userEmail}
      initialData={initialData} 
      profileExists={profileExists}
    />
  );
}
