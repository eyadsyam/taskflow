"use client";
import { useState } from "react";
import { Reply, Smile, MoreHorizontal, Trash2, Edit2, Download, FileText, Image as ImageIcon, Film, Music, Archive } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn, formatTime, formatFileSize } from "@/lib/utils";
import { toggleReaction, deleteMessage, editMessage, COMMON_EMOJIS } from "@/lib/chat-helpers";
import { toast } from "sonner";
import type { Profile, Message, MessageAttachment, MessageReaction } from "@/lib/database.types";

type FullMessage = Message & {
  author: Profile;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
};

interface Props {
  message: FullMessage;
  isOwn: boolean;
  currentUserId: string;
  showAvatar: boolean;
  onReply: (msg: FullMessage) => void;
}

export function ChatMessage({ message, isOwn, currentUserId, showAvatar, onReply }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content || "");

  // Group reactions by emoji
  const reactionGroups = message.reactions.reduce<Record<string, MessageReaction[]>>((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {});

  async function handleReact(emoji: string) {
    await toggleReaction(message.id, currentUserId, emoji);
  }

  async function handleDelete() {
    if (!confirm("هل أنت متأكد من حذف هذه الرسالة؟")) return;
    await deleteMessage(message.id);
    toast.success("تم حذف الرسالة");
  }

  async function handleSaveEdit() {
    if (!editValue.trim()) return;
    await editMessage(message.id, editValue.trim());
    setIsEditing(false);
    toast.success("تم تعديل الرسالة");
  }

  return (
    <div 
      className={cn(
        "group flex gap-3 px-2 md:px-4 py-1 hover:bg-accent/30 rounded-lg transition-colors",
        showAvatar ? "mt-3" : "mt-0.5"
      )}
    >
      {/* Avatar */}
      <div className="w-10 shrink-0">
        {showAvatar && (
          <UserAvatar 
            name={message.author.full_name} 
            src={message.author.avatar_url} 
            size="md" 
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Author + time */}
        {showAvatar && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm">{message.author.full_name}</span>
            <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
            {message.is_edited && <span className="text-xs text-muted-foreground italic">(معدّل)</span>}
          </div>
        )}

        {/* Message body */}
        {isEditing ? (
          <div className="flex gap-2 mt-1">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
            <Button size="sm" onClick={handleSaveEdit}>حفظ</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>إلغاء</Button>
          </div>
        ) : (
          <>
            {message.content && (
              <div className="text-sm whitespace-pre-wrap break-words text-foreground leading-relaxed">
                {message.content}
              </div>
            )}
            
            {/* Attachments */}
            {message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((att) => (
                  <Attachment key={att.id} attachment={att} />
                ))}
              </div>
            )}

            {/* Reactions */}
            {Object.keys(reactionGroups).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(reactionGroups).map(([emoji, reactions]) => {
                  const hasReacted = reactions.some((r) => r.user_id === currentUserId);
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors",
                        hasReacted 
                          ? "bg-primary/10 border-primary/30 text-primary" 
                          : "bg-muted border-border hover:bg-accent"
                      )}
                    >
                      <span>{emoji}</span>
                      <span className="font-medium">{reactions.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons - show on hover */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-0.5 self-start">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon-sm" title="إضافة تفاعل">
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="end">
            <div className="flex gap-1">
              {COMMON_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent text-lg transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Button variant="ghost" size="icon-sm" onClick={() => onReply(message)} title="رد">
          <Reply className="h-4 w-4" />
        </Button>
        
        {isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="h-4 w-4" />
                تعديل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
                حذف
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function Attachment({ attachment }: { attachment: MessageAttachment }) {
  const isImage = attachment.file_type?.startsWith("image/");
  const isVideo = attachment.file_type?.startsWith("video/");
  const isAudio = attachment.file_type?.startsWith("audio/");
  
  if (isImage) {
    return (
      <a 
        href={attachment.file_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-block max-w-md rounded-xl overflow-hidden border border-border hover:opacity-90 transition-opacity"
      >
        <img 
          src={attachment.file_url} 
          alt={attachment.file_name}
          className="max-h-96 w-auto object-contain bg-muted"
        />
      </a>
    );
  }
  
  if (isVideo) {
    return (
      <div className="max-w-md rounded-xl overflow-hidden border border-border bg-black">
        <video controls src={attachment.file_url} className="max-h-96 w-full" />
      </div>
    );
  }
  
  if (isAudio) {
    return (
      <div className="max-w-md rounded-xl bg-muted p-3">
        <audio controls src={attachment.file_url} className="w-full" />
      </div>
    );
  }
  
  // File - generic
  const Icon = getFileIcon(attachment.file_type);
  
  return (
    <a 
      href={attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.file_name}
      className="flex items-center gap-3 max-w-md rounded-xl border border-border bg-muted/50 p-3 hover:bg-accent transition-colors group"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{attachment.file_name}</div>
        <div className="text-xs text-muted-foreground">{formatFileSize(attachment.file_size)}</div>
      </div>
      <Download className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

function getFileIcon(type: string | null) {
  if (!type) return FileText;
  if (type.startsWith("image/")) return ImageIcon;
  if (type.startsWith("video/")) return Film;
  if (type.startsWith("audio/")) return Music;
  if (type.includes("zip") || type.includes("rar") || type.includes("tar")) return Archive;
  return FileText;
}
