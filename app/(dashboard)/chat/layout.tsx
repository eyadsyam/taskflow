import { createClient } from "@/lib/supabase/server";
import type { Conversation, Profile } from "@/lib/database.types";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

export const dynamic = "force-dynamic";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Load all channels and DMs the user is part of
  const [{ data: channelsData }, { data: profilesData }, { data: dmsData }] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .eq("type", "channel")
      .order("name", { ascending: true }),
    supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .order("full_name", { ascending: true }),
    supabase
      .from("conversation_members")
      .select(`
        conversation_id,
        last_read_at,
        conversations!inner(*)
      `)
      .eq("user_id", user.id),
  ]);

  const channels = (channelsData ?? []) as Conversation[];
  const profiles = (profilesData ?? []) as Profile[];
  const memberRows = (dmsData ?? []) as unknown as Array<{ conversation_id: string; last_read_at: string; conversations: Conversation }>;
  const dms = memberRows
    .map((m) => m.conversations)
    .filter((c) => c && c.type === "dm");

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <ChatSidebar 
        channels={channels} 
        dms={dms} 
        teamMembers={profiles}
        currentUserId={user.id}
      />
      <div className="flex-1 flex flex-col bg-background">
        {children}
      </div>
    </div>
  );
}
