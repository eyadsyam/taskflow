"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("global-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_comments" }, (payload) => {
        const row = payload.new as { content: string };
        toast.message("كومنت جديد", { description: row.content.slice(0, 80) });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tasks" }, (payload) => {
        const oldRow = payload.old as { status?: string };
        const newRow = payload.new as { status?: string; title?: string };
        if (oldRow.status && newRow.status && oldRow.status !== newRow.status) {
          toast.message("تحديث حالة", { description: newRow.title });
        }
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Button variant="ghost" size="icon" className="relative" title={connected ? "متصل لحظياً" : "قيد الاتصال"}>
      <Bell className="h-4 w-4" />
      <span className={cn("absolute top-2 end-2 h-2 w-2 rounded-full", connected ? "bg-green-500" : "bg-muted-foreground")} />
    </Button>
  );
}
