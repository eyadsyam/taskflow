import { createClient } from "@/lib/supabase/client";
import type { Conversation, Message, MessageWithRelations, Profile } from "@/lib/database.types";

const supabase = createClient();

// Get or create a DM conversation between two users
export async function getOrCreateDM(userId1: string, userId2: string): Promise<string | null> {
  // Find existing DM where both users are members
  const { data: existing } = await supabase
    .from("conversations")
    .select(`
      id,
      type,
      conversation_members!inner(user_id)
    `)
    .eq("type", "dm");
  
  if (existing) {
    for (const conv of existing as Array<{ id: string; type: string; conversation_members: Array<{ user_id: string }> }>) {
      const memberIds = conv.conversation_members.map((m) => m.user_id);
      if (memberIds.length === 2 && memberIds.includes(userId1) && memberIds.includes(userId2)) {
        return conv.id;
      }
    }
  }

  // Create new DM
  const { data: newConv, error } = await supabase
    .from("conversations")
    .insert({ type: "dm", created_by: userId1 } as Record<string, unknown>)
    .select()
    .single();
  
  if (error || !newConv) {
    console.error("Failed to create DM", error);
    return null;
  }

  const conv = newConv as Conversation;
  
  // Add both members
  await supabase.from("conversation_members").insert([
    { conversation_id: conv.id, user_id: userId1 },
    { conversation_id: conv.id, user_id: userId2 },
  ] as unknown as Record<string, unknown>);

  return conv.id;
}

export async function uploadFile(file: File, conversationId: string, userId: string): Promise<{
  url: string;
  name: string;
  size: number;
  type: string;
} | null> {
  const ext = file.name.split(".").pop();
  const fileName = `${conversationId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
  
  const { error } = await supabase.storage
    .from("chat-files")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });
  
  if (error) {
    console.error("Upload failed", error);
    return null;
  }

  const { data: { publicUrl } } = supabase.storage
    .from("chat-files")
    .getPublicUrl(fileName);

  return {
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  };
}

export async function sendMessage(
  conversationId: string,
  authorId: string,
  content: string,
  files?: File[],
  replyToId?: string
): Promise<Message | null> {
  // Insert message first
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      author_id: authorId,
      content: content || null,
      reply_to_id: replyToId || null,
    } as Record<string, unknown>)
    .select()
    .single();
  
  if (msgError || !msg) {
    console.error("Send message failed", msgError);
    return null;
  }

  const message = msg as Message;

  // Upload and attach files
  if (files && files.length > 0) {
    const attachments = [];
    for (const file of files) {
      const uploaded = await uploadFile(file, conversationId, authorId);
      if (uploaded) {
        attachments.push({
          message_id: message.id,
          file_url: uploaded.url,
          file_name: uploaded.name,
          file_size: uploaded.size,
          file_type: uploaded.type,
        });
      }
    }
    if (attachments.length > 0) {
      await supabase.from("message_attachments").insert(attachments as unknown as Record<string, unknown>);
    }
  }

  return message;
}

export async function toggleReaction(messageId: string, userId: string, emoji: string): Promise<void> {
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .single();
  
  if (existing) {
    await supabase.from("message_reactions").delete().eq("id", (existing as { id: string }).id);
  } else {
    await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: userId,
      emoji,
    } as Record<string, unknown>);
  }
}

export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function deleteMessage(messageId: string): Promise<void> {
  await supabase.from("messages").delete().eq("id", messageId);
}

export async function editMessage(messageId: string, content: string): Promise<void> {
  await supabase
    .from("messages")
    .update({ content, is_edited: true, edited_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", messageId);
}

export async function updatePresence(userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() } as Record<string, unknown>)
    .eq("id", userId);
}

export const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "✨"];

export function getDmPartner(conv: Conversation, members: Profile[], currentUserId: string): Profile | null {
  if (conv.type !== "dm") return null;
  return members.find((m) => m.id !== currentUserId) || null;
}

export function getConversationDisplayName(
  conv: Conversation,
  members: Profile[],
  currentUserId: string
): string {
  if (conv.type === "dm") {
    const partner = getDmPartner(conv, members, currentUserId);
    return partner?.full_name || "محادثة خاصة";
  }
  return conv.name || "بدون اسم";
}
