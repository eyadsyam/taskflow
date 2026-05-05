import { createClient } from "@/lib/supabase/server";
import type { Conversation, Profile } from "@/lib/database.types";
import { ChatSidebar } from "@/components/chat/ChatSidebar";

export const dynamic = "force-dynamic";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profilesData },
    { data: memberRowsData },
    { data: unreadData },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .neq("id", user.id)
      .order("full_name", { ascending: true }),
    // All conversations the user is a member of (channels, DMs, task chats)
    supabase
      .from("conversation_members")
      .select(`
        conversation_id,
        last_read_at,
        conversations!inner(*)
      `)
      .eq("user_id", user.id),
    // Unread counts per conversation
    supabase.rpc("get_unread_counts", { p_user: user.id }),
  ]);

  const profiles = (profilesData ?? []) as Profile[];
  const memberRows = (memberRowsData ?? []) as unknown as Array<{
    conversation_id: string;
    last_read_at: string;
    conversations: Conversation;
  }>;

  const allConversations = memberRows.map((m) => m.conversations).filter(Boolean);
  const channels = allConversations
    .filter((c) => c.type === "channel")
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  const dms = allConversations.filter((c) => c.type === "dm");
  const taskChats = allConversations
    .filter((c) => c.type === "task")
    .sort((a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );

  // Build unread map
  const unreadRows = (unreadData ?? []) as Array<{
    conversation_id: string;
    unread_count: number;
  }>;
  const unreadByConv: Record<string, number> = {};
  for (const r of unreadRows) {
    if (r.unread_count > 0) unreadByConv[r.conversation_id] = Number(r.unread_count);
  }

  return (
    <div className="flex h-[calc(100vh-52px)]">
      <ChatSidebar
        channels={channels}
        dms={dms}
        taskChats={taskChats}
        teamMembers={profiles}
        currentUserId={user.id}
        unreadByConv={unreadByConv}
      />
      <div className="flex-1 flex flex-col bg-background">
        {children}
      </div>
    </div>
  );
}
