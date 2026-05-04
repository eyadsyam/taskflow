"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/profile-context";
import { toast } from "sonner";
import type { Conversation } from "@/lib/database.types";

interface Props {
  taskId: string;
  taskTitle: string;
  existingConversationId?: string;
}

export function TaskChatLink({ taskId, taskTitle, existingConversationId }: Props) {
  const router = useRouter();
  const profile = useProfile();
  const [creating, setCreating] = useState(false);

  async function createOrOpen() {
    if (existingConversationId) {
      router.push(`/chat/${existingConversationId}`);
      return;
    }
    
    setCreating(true);
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        type: "task",
        name: `📋 ${taskTitle}`,
        task_id: taskId,
        created_by: profile.id,
        icon: "list-checks",
      } as Record<string, unknown>)
      .select()
      .single();
    
    setCreating(false);
    
    if (error || !data) {
      toast.error("فشل إنشاء غرفة المحادثة");
      return;
    }
    
    router.push(`/chat/${(data as Conversation).id}`);
  }
  
  return (
    <Card className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border-violet-500/20">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center shrink-0">
            <MessageCircle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold">
              {existingConversationId ? "محادثة المهمة" : "ابدأ محادثة لهذه المهمة"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {existingConversationId 
                ? "استمر في النقاش حول هذه المهمة"
                : "ناقش التفاصيل مع الفريق في مكان واحد"
              }
            </p>
          </div>
        </div>
        <Button onClick={createOrOpen} disabled={creating} variant="gradient">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
          {existingConversationId ? "فتح المحادثة" : "إنشاء"}
        </Button>
      </CardContent>
    </Card>
  );
}
