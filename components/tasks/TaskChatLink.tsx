"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, ArrowLeft, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface Props {
  taskId: string;
  taskTitle: string;
  existingConversationId?: string;
}

/**
 * Every task now has its own auto-created chat (DB trigger handles it).
 * This card just opens the chat and shows how many people are in it.
 */
export function TaskChatLink({ taskId, existingConversationId }: Props) {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [convId, setConvId] = useState<string | null>(existingConversationId ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // Resolve conversation id if not provided (rare race-condition safety)
      let id = convId;
      if (!id) {
        const { data } = await supabase
          .from("conversations")
          .select("id")
          .eq("task_id", taskId)
          .maybeSingle();
        id = (data as { id: string } | null)?.id ?? null;
        if (!cancelled) setConvId(id);
      }
      if (!id) return;
      const { count } = await supabase
        .from("conversation_members")
        .select("user_id", { count: "exact", head: true })
        .eq("conversation_id", id);
      if (!cancelled) setMemberCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [taskId, convId]);

  if (!convId) {
    // Should be rare — trigger creates one on insert.
    return null;
  }

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-md border border-primary/30 bg-primary/10 grid place-items-center shrink-0">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">شات التاسك</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Users className="h-3 w-3" />
              {memberCount === null ? "..." : `${memberCount} مشترك`}
              <span className="opacity-50">·</span>
              <span>اتكلم مع الفريق في مكان واحد</span>
            </p>
          </div>
        </div>
        <Button asChild variant="gradient">
          <Link href={`/chat/${convId}`}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            افتح
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
