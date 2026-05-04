"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Smile, Loader2, Image as ImageIcon, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { sendMessage } from "@/lib/chat-helpers";
import { useProfile } from "@/components/profile-context";
import { toast } from "sonner";
import { cn, formatFileSize } from "@/lib/utils";
import type { Message, Profile, MessageAttachment, MessageReaction } from "@/lib/database.types";

type FullMessage = Message & {
  author: Profile;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
};

interface Props {
  conversationId: string;
  currentUserId: string;
  replyTo: FullMessage | null;
  onCancelReply: () => void;
  onTyping: (name: string) => void;
}

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
  "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
  "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜",
  "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
  "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🫰",
  "🫶", "🤝", "🙏", "✍️", "💪", "🦾", "🫵", "👋",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "🔥", "✨", "🎉", "🎊", "💯", "💢", "💥", "💫",
];

export function ChatInput({ conversationId, currentUserId, replyTo, onCancelReply, onTyping }: Props) {
  const profile = useProfile();
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout>();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId]);

  function handleTyping() {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onTyping(profile.full_name);
    typingTimeout.current = setTimeout(() => {}, 1000);
  }

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setFiles((prev) => [...prev, ...arr]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed && files.length === 0) return;
    if (sending) return;

    setSending(true);
    setUploadProgress(0);
    
    try {
      const sent = await sendMessage(
        conversationId,
        currentUserId,
        trimmed,
        files,
        replyTo?.id
      );
      
      if (sent) {
        setMessage("");
        setFiles([]);
        onCancelReply();
      } else {
        toast.error("مقدرش يبعت");
      }
    } catch (e) {
      toast.error("في حاجة غلط");
      console.error(e);
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      e.preventDefault();
      setFiles((prev) => [...prev, ...pastedFiles]);
    }
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = message.substring(0, start) + emoji + message.substring(end);
      setMessage(newValue);
      setTimeout(() => {
        textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        textarea.focus();
      }, 0);
    } else {
      setMessage(message + emoji);
    }
  }

  return (
    <div className="border-t border-border p-3 md:p-4 bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-start justify-between gap-2 mb-2 p-3 rounded-lg bg-muted/50 border-r-4 border-primary">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-primary mb-0.5">رد على {replyTo.author.full_name}</div>
              <div className="text-sm text-muted-foreground truncate">{replyTo.content || "ملف"}</div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onCancelReply}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* File previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {files.map((file, idx) => {
              const isImage = file.type.startsWith("image/");
              return (
                <div key={idx} className="relative group rounded-lg border border-border bg-muted p-2 flex items-center gap-2 max-w-xs">
                  {isImage ? (
                    <div className="h-12 w-12 rounded-md overflow-hidden shrink-0">
                      <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-primary/10 grid place-items-center shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">{formatFileSize(file.size)}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon-sm" 
                    onClick={() => removeFile(idx)}
                    className="opacity-60 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input area */}
        <div className={cn(
          "flex items-end gap-2 rounded-2xl border border-input bg-background px-3 py-2 transition-colors",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
        )}>
          <Button 
            type="button"
            variant="ghost" 
            size="icon-sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            title="ارفع ملف"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
            className="hidden"
          />
          
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="اكتب..."
            rows={1}
            className="flex-1 resize-none bg-transparent border-0 px-2 py-2 text-sm placeholder:text-muted-foreground focus:outline-none scrollbar-thin"
            style={{ maxHeight: "200px" }}
            disabled={sending}
          />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" disabled={sending} title="إيموجي">
                <Smile className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="grid grid-cols-8 gap-1 max-h-60 overflow-y-auto">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent text-lg transition-transform hover:scale-110"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            type="button"
            variant="gradient"
            size="icon-sm"
            onClick={handleSend}
            disabled={sending || (!message.trim() && files.length === 0)}
            title="ابعت"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="mt-1 flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Enter</kbd> عشان تبعت • <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Shift+Enter</kbd> سطر جديد
          </p>
          {sending && uploadProgress > 0 && (
            <p className="text-xs text-muted-foreground">
              بيترفع: {uploadProgress}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
