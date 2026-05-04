import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Conversation } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function ChatIndexPage() {
  const supabase = createClient();
  
  // Find the general channel and redirect there
  const { data } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", "channel")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  
  const conv = data as Pick<Conversation, "id"> | null;
  
  if (conv) {
    redirect(`/chat/${conv.id}`);
  }
  
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">لا توجد محادثات بعد</h2>
        <p className="text-sm text-muted-foreground">ابدأ بإنشاء قناة جديدة</p>
      </div>
    </div>
  );
}
