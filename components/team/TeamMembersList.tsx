"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, MessageCircle, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
      toast.error("فشل بدء المحادثة");
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {liveMembers.map((p) => {
        const status = getUserStatus(p.last_seen_at);
        const isMe = p.id === currentUserId;
        
        return (
          <Card key={p.id} className="overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="h-20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20" />
            <CardContent className="pt-0 -mt-10">
              <div className="flex flex-col items-center text-center">
                <UserAvatar 
                  name={p.full_name} 
                  src={p.avatar_url} 
                  size="xl" 
                  status={status}
                  className="ring-4 ring-background"
                />
                <h3 className="font-semibold mt-3 text-base">
                  {p.full_name}
                  {isMe && <span className="text-xs text-muted-foreground mr-1">(أنت)</span>}
                </h3>
                {p.job_title && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {p.job_title}
                  </p>
                )}
                {p.status_message && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">
                    &ldquo;{p.status_message}&rdquo;
                  </p>
                )}
                
                <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    p.role === "admin" 
                      ? "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300" 
                      : "bg-secondary"
                  }`}>
                    {ROLE_LABELS[p.role]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {taskCounts[p.id] ?? 0} مهمة
                  </span>
                </div>

                {!isMe && (
                  <Button 
                    onClick={() => startDM(p.id)}
                    variant="soft"
                    size="sm"
                    className="mt-4 w-full"
                  >
                    <MessageCircle className="h-4 w-4" />
                    إرسال رسالة
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
