"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Hash, Info, Search, MoreVertical, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInput } from "./ChatInput";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { markConversationRead } from "@/lib/chat-helpers";
import { cn, getUserStatus } from "@/lib/utils";
import type { Conversation, Profile, Message, MessageAttachment, MessageReaction } from "@/lib/database.types";

type FullMessage = Message & {
  author: Profile;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
};

interface Props {
  conversation: Conversation;
  members: Profile[];
  allMembers: Profile[];
  initialMessages: FullMessage[];
  currentUserId: string;
}

export function ChatRoom({ conversation, members, allMembers, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<FullMessage[]>(initialMessages);
  const [replyTo, setReplyTo] = useState<FullMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const supabase = useRef(createClient());

  const dmPartner = conversation.type === "dm" 
    ? members.find((m) => m.id !== currentUserId)
    : null;

  // Set up realtime subscriptions
  useEffect(() => {
    const channel = supabase.current
      .channel(`conversation-${conversation.id}`)
      .on("postgres_changes", { 
        event: "INSERT", 
        schema: "public", 
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, async (payload) => {
        const newMsg = payload.new as Message;
        // Fetch full message with relations
        const { data } = await supabase.current
          .from("messages")
          .select(`
            *,
            author:profiles!messages_author_id_fkey(*),
            attachments:message_attachments(*),
            reactions:message_reactions(*)
          `)
          .eq("id", newMsg.id)
          .single();
        if (data) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (data as FullMessage).id)) return prev;
            return [...prev, data as FullMessage];
          });
        }
      })
      .on("postgres_changes", { 
        event: "DELETE", 
        schema: "public", 
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as Message).id));
      })
      .on("postgres_changes", { 
        event: "UPDATE", 
        schema: "public", 
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "message_reactions",
      }, async () => {
        // Refresh reactions for messages in this conversation
        const { data } = await supabase.current
          .from("messages")
          .select(`*, reactions:message_reactions(*)`)
          .eq("conversation_id", conversation.id);
        if (data) {
          const reactionMap = new Map<string, MessageReaction[]>();
          for (const m of data as Array<Message & { reactions: MessageReaction[] }>) {
            reactionMap.set(m.id, m.reactions);
          }
          setMessages((prev) => prev.map((m) => ({
            ...m,
            reactions: reactionMap.get(m.id) ?? m.reactions,
          })));
        }
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, name } = payload.payload as { userId: string; name: string };
        if (userId === currentUserId) return;
        setTypingUsers((prev) => prev.includes(name) ? prev : [...prev, name]);
        // Auto-remove after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== name));
        }, 3000);
      })
      .subscribe();

    return () => { 
      supabase.current.removeChannel(channel); 
    };
  }, [conversation.id, currentUserId]);

  // Mark as read when messages arrive
  useEffect(() => {
    markConversationRead(conversation.id, currentUserId);
  }, [messages.length, conversation.id, currentUserId]);

  const broadcastTyping = useCallback((userName: string) => {
    supabase.current.channel(`conversation-${conversation.id}`).send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, name: userName },
    });
  }, [conversation.id, currentUserId]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {conversation.type === "dm" && dmPartner ? (
            <>
              <UserAvatar 
                name={dmPartner.full_name} 
                src={dmPartner.avatar_url} 
                size="md" 
                status={getUserStatus(dmPartner.last_seen_at)}
              />
              <div>
                <h2 className="font-semibold">{dmPartner.full_name}</h2>
                <div className="text-xs text-muted-foreground">
                  {getUserStatus(dmPartner.last_seen_at) === "online" 
                    ? <span className="text-green-600 dark:text-green-400">أونلاين</span>
                    : dmPartner.status_message || dmPartner.job_title || "مش هنا"
                  }
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center text-primary">
                <Hash className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold flex items-center gap-2">
                  {conversation.name}
                  {conversation.is_private && <Lock className="h-3 w-3 text-muted-foreground" />}
                </h2>
                <div className="text-xs text-muted-foreground">
                  {conversation.description || `${allMembers.length} عضو`}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" title="دور في المحادثة">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="تفاصيل">
            <Info className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="المزيد">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ChatMessageList
        messages={messages}
        currentUserId={currentUserId}
        onReply={setReplyTo}
        typingUsers={typingUsers}
      />

      {/* Input */}
      <ChatInput
        conversationId={conversation.id}
        currentUserId={currentUserId}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onTyping={broadcastTyping}
      />
    </div>
  );
}
