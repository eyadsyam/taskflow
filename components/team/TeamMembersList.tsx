"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Briefcase, ListChecks } from "lucide-react";
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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {liveMembers.map((p) => {
        const status = getUserStatus(p.last_seen_at);
        const isMe = p.id === currentUserId;
        const isAdmin = p.role === "admin";

        return (
          <div
            key={p.id}
            className="group rounded-lg border border-border bg-card hover:border-border-strong transition-colors overflow-hidden"
          >
            {/* Top: avatar + status */}
            <div className="p-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <UserAvatar
                    name={p.full_name}
                    src={p.avatar_url}
                    size="md"
                    status={status}
                  />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm truncate">{p.full_name}</h3>
                    {isMe && (
                      <span className="text-[10px] text-muted-foreground bg-elevated px-1.5 py-0.5 rounded border border-border">
                        أنت
                      </span>
                    )}
                  </div>
                  {p.job_title ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                      <Briefcase className="h-2.5 w-2.5 shrink-0" />
                      {p.job_title}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">—</p>
                  )}
                </div>
              </div>

              {p.status_message && (
                <p className="text-[11px] text-muted-foreground mt-3 line-clamp-2 italic">
                  &ldquo;{p.status_message}&rdquo;
                </p>
              )}
            </div>

            {/* Footer: meta strip */}
            <div className="px-4 py-2.5 border-t border-border bg-elevated/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {isAdmin && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">
                    {ROLE_LABELS[p.role]}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 tabular">
                  <ListChecks className="h-2.5 w-2.5" />
                  {taskCounts[p.id] ?? 0} تاسك
                </span>
              </div>
              {!isMe && (
                <Button
                  onClick={() => startDM(p.id)}
                  variant="ghost"
                  size="icon-sm"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="كلمه"
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
