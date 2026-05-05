"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  ListChecks,
  MessageCircle,
  UserPlus,
  RefreshCw,
  AtSign,
  Reply,
  Smile,
  Paperclip,
  Send,
  Calendar,
  DollarSign,
  PartyPopper,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  bindAudioUnlock,
  isNotificationSoundMuted,
  playNotificationSound,
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

type NotifRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

/**
 * Global realtime alert center. Lives in the dashboard layout so it's mounted
 * on every page. Responsibilities:
 *   1) Bind audio unlock on first user gesture (browser autoplay policy).
 *   2) Subscribe to the user's notifications realtime stream.
 *   3) For every new notification: play loud sound + show a toast with a
 *      click-through link.
 *   4) Auto-reconnect when the tab regains focus (Supabase realtime can drop
 *      after long idle periods).
 */
export function RealtimeAlerts({ userId }: { userId: string }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const seenIds = useRef<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Keep latest pathname in a ref so the realtime callback (closure) always
  // reads the current value without re-subscribing on every navigation.
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Unlock audio ASAP on any user gesture
  useEffect(() => {
    bindAudioUnlock();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    function buildChannel() {
      // Always remove previous before re-subscribing
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch { /* ignore */ }
        channelRef.current = null;
      }
      const ch = supabase
        .channel(`realtime-alerts-${userId}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            const n = payload.new as NotifRow;
            if (!n?.id || seenIds.current.has(n.id)) return;
            seenIds.current.add(n.id);
            handleNotification(n);
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            // eslint-disable-next-line no-console
            console.log("[realtime-alerts] subscribed");
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // eslint-disable-next-line no-console
            console.warn("[realtime-alerts] status:", status, "— will retry");
            if (!cancelled) setTimeout(buildChannel, 2000);
          }
        });
      channelRef.current = ch;
    }

    function handleNotification(n: NotifRow) {
      // If the user is already viewing the destination page, suppress both
      // the toast and the sound to avoid annoying duplicates.
      const onThisPage = n.link && pathnameRef.current === n.link;
      if (onThisPage) return;

      // Loud sound regardless of which page the user is on
      if (!isNotificationSoundMuted()) {
        void playNotificationSound();
      }
      const Icon = ICON_MAP[n.type] ?? Bell;
      toast.custom(
        (id) => (
          <div
            className="flex items-start gap-3 rounded-lg border border-primary/30 bg-card p-3 shadow-2xl min-w-[320px] max-w-[420px] animate-slide-down"
            dir="rtl"
          >
            <div className="h-9 w-9 rounded-md bg-primary/15 text-primary grid place-items-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{n.title}</div>
              {n.body && (
                <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {n.body}
                </div>
              )}
              {n.link && (
                <Link
                  href={n.link}
                  onClick={() => toast.dismiss(id)}
                  className="text-[11px] text-primary hover:underline mt-1.5 inline-block"
                >
                  افتح ←
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => toast.dismiss(id)}
              className="text-muted-foreground hover:text-foreground text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        ),
        { duration: 6000 },
      );
    }

    buildChannel();

    // Reconnect on tab focus
    function onVisibility() {
      if (document.visibilityState === "visible") {
        buildChannel();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch { /* ignore */ }
      }
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}
