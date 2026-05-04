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
      <div className="flex items-center justify-between px-4 md:px-6 h-[52px] border-b border-border bg-background/70 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {conversation.type === "dm" && dmPartner ? (
            <>
              <UserAvatar
                name={dmPartner.full_name}
                src={dmPartner.avatar_url}
                size="sm"
                status={getUserStatus(dmPartner.last_seen_at)}
              />
              <div className="min-w-0">
                <h2 className="font-semibold text-sm truncate">{dmPartner.full_name}</h2>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  {getUserStatus(dmPartner.last_seen_at) === "online" ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>أونلاين</span>
                    </>
                  ) : (
                    <span className="truncate">{dmPartner.status_message || dmPartner.job_title || "مش هنا"}</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="h-8 w-8 rounded-md border border-border bg-elevated grid place-items-center text-muted-foreground shrink-0">
                <Hash className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm flex items-center gap-1.5 truncate">
                  {conversation.name}
                  {conversation.is_private && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                </h2>
                <div className="text-[11px] text-muted-foreground truncate">
                  {conversation.description || `${allMembers.length} عضو`}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon-sm" title="دور في المحادثة" className="h-7 w-7">
            <Search className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="تفاصيل" className="h-7 w-7">
            <Info className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon-sm" title="المزيد" className="h-7 w-7">
            <MoreVertical className="h-3.5 w-3.5" />
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
