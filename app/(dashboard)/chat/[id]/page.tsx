import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, Profile, Message, MessageAttachment, MessageReaction } from "@/lib/database.types";
import { ChatRoom } from "@/components/chat/ChatRoom";

export const dynamic = "force-dynamic";

export default async function ChatConversationPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Load conversation
  const { data: convData } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", params.id)
    .single();
  
  if (!convData) notFound();
  const conversation = convData as Conversation;

  // Load members for DMs
  const { data: membersData } = await supabase
    .from("conversation_members")
    .select(`
      user_id,
      is_admin,
      profiles!inner(*)
    `)
    .eq("conversation_id", params.id);
  
  const memberRows = (membersData ?? []) as unknown as Array<{ user_id: string; is_admin: boolean; profiles: Profile }>;
  const members = memberRows.map((m) => m.profiles).filter(Boolean);

  // Load messages with attachments and reactions
  const { data: messagesData } = await supabase
    .from("messages")
    .select(`
      *,
      author:profiles!messages_author_id_fkey(*),
      attachments:message_attachments(*),
      reactions:message_reactions(*)
    `)
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true })
    .limit(100);

  type RawMsg = Message & { author: Profile; attachments: MessageAttachment[]; reactions: MessageReaction[] };
  const raw = (messagesData ?? []) as RawMsg[];
  // Resolve reply_to from already-loaded messages (PostgREST can't self-join)
  const msgMap = new Map(raw.map((m) => [m.id, m]));
  const messages = raw.map((m) => ({
    ...m,
    reply_to: m.reply_to_id ? (msgMap.get(m.reply_to_id) ?? null) : null,
  }));

  // Load all team members for @mentions
  const { data: allMembersData } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");
  const allMembers = (allMembersData ?? []) as Profile[];

  return (
    <ChatRoom
      conversation={conversation}
      members={members}
      allMembers={allMembers}
      initialMessages={messages}
      currentUserId={user.id}
    />
  );
}
