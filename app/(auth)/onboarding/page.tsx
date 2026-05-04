"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { OnboardingWizard } from "./onboarding-wizard";
import { Loader2 } from "lucide-react";

export default function OnboardingPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }

      setUserId(user.id);
      setInitialData(profile as Record<string, unknown> || {
        full_name: user.user_metadata?.full_name || "",
        email: user.email || "",
        role: user.user_metadata?.role || "work_team",
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

  return <OnboardingWizard userId={userId} initialData={initialData} />;
}
