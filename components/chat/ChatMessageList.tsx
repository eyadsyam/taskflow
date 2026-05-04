"use client";
import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { groupMessagesByDate, getDateLabel, cn } from "@/lib/utils";
import type { Profile, Message, MessageAttachment, MessageReaction } from "@/lib/database.types";

type FullMessage = Message & {
  author: Profile;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
};

interface Props {
  messages: FullMessage[];
  currentUserId: string;
  onReply: (msg: FullMessage) => void;
  typingUsers: string[];
}

export function ChatMessageList({ messages, currentUserId, onReply, typingUsers }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const grouped = groupMessagesByDate(messages);
  const sortedDates = Array.from(grouped.keys()).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-2 md:px-6 py-4">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-1 max-w-4xl mx-auto">
          {sortedDates.map((dateStr) => {
            const dateMessages = grouped.get(dateStr) ?? [];
            return (
              <div key={dateStr}>
                {/* Date separator */}
                <div className="flex items-center my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="px-3 text-xs font-medium text-muted-foreground bg-muted rounded-full py-1">
                    {getDateLabel(dateStr)}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                
                {/* Messages */}
                {dateMessages.map((msg, idx) => {
                  const prev = dateMessages[idx - 1];
                  const isFirstInGroup = !prev 
                    || prev.author_id !== msg.author_id 
                    || (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) > 5 * 60 * 1000;
                  
                  return (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isOwn={msg.author_id === currentUserId}
                      currentUserId={currentUserId}
                      showAvatar={isFirstInGroup}
                      onReply={onReply}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 max-w-4xl mx-auto">
          <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-muted">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
          <span className="text-xs text-muted-foreground">
            {typingUsers.length === 1 
              ? `${typingUsers[0]} يكتب...`
              : `${typingUsers.length} أشخاص يكتبون...`
            }
          </span>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-3 max-w-sm">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 grid place-items-center">
          <span className="text-4xl">👋</span>
        </div>
        <h3 className="text-lg font-semibold">لا توجد رسائل بعد</h3>
        <p className="text-sm text-muted-foreground">
          ابدأ المحادثة بكتابة رسالة في الأسفل
        </p>
      </div>
    </div>
  );
}
