"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateDM } from "@/lib/chat-helpers";
import { ROLE_LABELS, getUserStatus } from "@/lib/utils";
import { toast } from "sonner";
import type { Profile } from "@/lib/database.types";

interface Props {
  members: Profile[];
  taskCounts: Record<string, number>;
  currentUserId: string;
}

export function TeamMembersList({ members, taskCounts, currentUserId }: Props) {
  const [liveMembers, setLiveMembers] = useState(members);
  const router = useRouter();

  // Subscribe to live presence
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("team-presence")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        const updated = payload.new as Profile;
        setLiveMembers((prev) => prev.map((m) => m.id === updated.id ? { ...m, ...updated } : m));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function startDM(memberId: string) {
    const dmId = await getOrCreateDM(currentUserId, memberId);
    if (dmId) {
      router.push(`/chat/${dmId}`);
    } else {
      toast.error("مقدرش يفتح المحادثة");
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {liveMembers.map((p) => {
        const status = getUserStatus(p.last_seen_at);
        const isMe = p.id === currentUserId;

        return (
          <div
            key={p.id}
            className="rounded-xl border bg-card p-4 hover:border-primary/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <UserAvatar
                name={p.full_name}
                src={p.avatar_url}
                size="lg"
                status={status}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {p.full_name}
                  {isMe && <span className="text-xs text-muted-foreground mr-1">(انت)</span>}
                </h3>
                {p.job_title && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                    <Briefcase className="h-3 w-3 shrink-0" />
                    {p.job_title}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.role === "admin"
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {ROLE_LABELS[p.role]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {taskCounts[p.id] ?? 0} تاسك
                  </span>
                </div>
              </div>
            </div>

            {p.status_message && (
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50 line-clamp-1 italic">
                {p.status_message}
              </p>
            )}

            {!isMe && (
              <Button
                onClick={() => startDM(p.id)}
                variant="outline"
                size="sm"
                className="w-full mt-3 text-xs"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                كلمه
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
