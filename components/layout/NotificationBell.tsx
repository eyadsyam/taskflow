"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ListChecks,
  MessageCircle,
  UserPlus,
  RefreshCw,
  Volume2,
  VolumeX,
  AtSign,
  Reply,
  Smile,
  Paperclip,
  Send,
  Calendar,
  DollarSign,
  PartyPopper,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/profile-context";
import { Button } from "@/components/ui/button";
import { cn, relativeTime } from "@/lib/utils";
import type { Notification } from "@/lib/database.types";
import {
  bindAudioUnlock,
  isNotificationSoundMuted,
  playNotificationSound,
  setNotificationSoundMuted,
} from "@/lib/sound";

const ICON_MAP: Record<string, typeof Bell> = {
  task_created: ListChecks,
  task_status_changed: RefreshCw,
  task_assigned: UserPlus,
  task_due_changed: Calendar,
  task_price_changed: DollarSign,
  task_files_added: Paperclip,
  task_submitted: Send,
  task_deleted: Trash2,
  task_comment: MessageSquare,
  message_received: MessageCircle,
  message_reply: Reply,
  message_mention: AtSign,
  message_reaction: Smile,
  conversation_added: UserPlus,
  member_joined: PartyPopper,
};

export function NotificationBell() {
  const supabase = useRef(createClient());
  const me = useProfile();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const initialLoadDone = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Read mute pref on mount + bind audio unlock to first user gesture
  useEffect(() => {
    setMuted(isNotificationSoundMuted());
    bindAudioUnlock();
  }, []);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    setNotificationSoundMuted(next);
    if (!next) playNotificationSound({ force: true }); // preview the alarm
  }

  function testSound() {
    playNotificationSound({ force: true });
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.current
      .from("notifications")
      .select("*")
      .eq("user_id", me.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  }, [me.id]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications().then(() => {
      initialLoadDone.current = true;
    });
  }, [fetchNotifications]);

  // Realtime subscription — keeps the BELL list & badge live.
  // (Sound + toast are handled globally by <RealtimeAlerts /> in the layout.)
  useEffect(() => {
    const client = supabase.current;
    const channel = client
      .channel(`notifications-bell-${me.id}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` },
        (payload) => {
          setNotifications((prev) => {
            const incoming = payload.new as Notification;
            if (prev.some((n) => n.id === incoming.id)) return prev;
            return [incoming, ...prev].slice(0, 50);
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${me.id}` },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? { ...n, ...updated } : n)),
          );
        },
      )
      .subscribe();
    return () => { client.removeChannel(channel); };
  }, [me.id]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markRead(id: string) {
    await supabase.current.from("notifications").update({ is_read: true } as Record<string, unknown>).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  async function markAllRead() {
    await supabase.current
      .from("notifications")
      .update({ is_read: true } as Record<string, unknown>)
      .eq("user_id", me.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  async function clearAll() {
    await supabase.current.from("notifications").delete().eq("user_id", me.id);
    setNotifications([]);
    setOpen(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
        title="الإشعارات"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-3.5 w-3.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] rounded-full bg-lime-400 text-[10px] font-bold text-black flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden animate-slide-down">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-semibold text-sm">الإشعارات</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={testSound}
                title="جرب الصوت"
              >
                <Volume2 className="h-3 w-3" />
                جرب
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7"
                onClick={toggleMute}
                title={muted ? "شغّل الصوت" : "اكتم الصوت"}
              >
                {muted ? (
                  <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 text-primary" />
                )}
              </Button>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
                  <CheckCheck className="h-3 w-3" />
                  قراءة الكل
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={clearAll}>
                  <Trash2 className="h-3 w-3" />
                  مسح
                </Button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                مفيش إشعارات
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = ICON_MAP[notif.type] ?? Bell;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-accent/30 transition-colors",
                      !notif.is_read && "bg-lime-400/5",
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-full grid place-items-center shrink-0 mt-0.5",
                      !notif.is_read ? "bg-lime-400/15 text-lime-400" : "bg-muted text-muted-foreground",
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {notif.link ? (
                        <Link
                          href={notif.link}
                          onClick={() => { markRead(notif.id); setOpen(false); }}
                          className="block"
                        >
                          <p className={cn("text-sm truncate", !notif.is_read && "font-semibold")}>{notif.title}</p>
                          {notif.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.body}</p>}
                        </Link>
                      ) : (
                        <>
                          <p className={cn("text-sm truncate", !notif.is_read && "font-semibold")}>{notif.title}</p>
                          {notif.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.body}</p>}
                        </>
                      )}
                      <p className="text-[11px] text-muted-foreground mt-1">{relativeTime(notif.created_at)}</p>
                    </div>
                    {!notif.is_read && (
                      <Button variant="ghost" size="icon-sm" className="h-6 w-6 shrink-0" onClick={() => markRead(notif.id)} title="اقرأها">
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
