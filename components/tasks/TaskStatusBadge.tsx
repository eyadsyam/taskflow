import { Lock, Clock, PlayCircle, Wallet, CheckCircle2 } from "lucide-react";
import type { TaskStatus } from "@/lib/database.types";
import { STATUS_LABELS, STATUS_COLORS, cn } from "@/lib/utils";

const ICONS: Record<TaskStatus, React.ComponentType<{ className?: string }>> = {
  pending_client: Clock,
  in_progress: PlayCircle,
  done_pending_payment: Wallet,
  paid_closed: Lock,
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const Icon = ICONS[status] ?? CheckCircle2;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_COLORS[status],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABELS[status]}
    </span>
  );
}
