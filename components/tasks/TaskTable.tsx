"use client";
import Link from "next/link";
import { Lock, MoreHorizontal, Pencil, Trash2, ListChecks, Plus } from "lucide-react";
import type { Profile, Task, TaskStatus } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { formatCurrency, formatDateTime, STATUS_LABELS, STATUS_ORDER } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useProfile } from "@/components/profile-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function TaskTable({
  tasks,
  profileMap,
  onStatusChange,
}: {
  tasks: Task[];
  profileMap: Map<string, Profile>;
  onStatusChange: (id: string, next: TaskStatus, prev: TaskStatus) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 py-16 text-center">
        <div className="mx-auto h-12 w-12 rounded-lg border border-border bg-elevated grid place-items-center mb-3">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">مفيش تاسكات بالوصف ده</p>
        <p className="text-xs text-muted-foreground mt-1 mb-4">جرب تغير الفلاتر أو ابدأ تاسك جديد</p>
        <Button asChild size="sm">
          <Link href="/tasks/new"><Plus className="h-3.5 w-3.5" /> تاسك جديد</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-right border-b border-border bg-elevated/30">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">التاسك</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">العميل</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">الحالة</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">الشغال عليها</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">التسليم</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">السعر</th>
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map((t) => (
              <Row key={t.id} task={t} profileMap={profileMap} onStatusChange={onStatusChange} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({
  task,
  profileMap,
  onStatusChange,
}: {
  task: Task;
  profileMap: Map<string, Profile>;
  onStatusChange: (id: string, next: TaskStatus, prev: TaskStatus) => void;
}) {
  const me = useProfile();
  const router = useRouter();
  const locked = task.status === "paid_closed";
  const assignee = task.assigned_to ? profileMap.get(task.assigned_to) : null;

  async function onDelete() {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) return toast.error(error.message);
    toast.success("اتمسح");
    router.refresh();
  }

  return (
    <tr className="group hover:bg-elevated/40 transition-colors">
      <td className="px-4 py-3">
        <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary transition-colors flex items-center gap-1.5 group/title">
          {locked && <Lock className="h-3.5 w-3.5 text-emerald-400" />}
          <span className="line-clamp-1">{task.title}</span>
        </Link>
        {(task.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {task.tags!.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-elevated text-muted-foreground border border-border">
                {tag}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{task.client_name}</td>
      <td className="px-4 py-3">
        {locked ? (
          <TaskStatusBadge status={task.status} />
        ) : (
          <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v as TaskStatus, task.status)}>
            <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 hover:opacity-80 [&>svg]:hidden focus:ring-0 focus:border-0">
              <SelectValue asChild><TaskStatusBadge status={task.status} /></SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        {assignee ? (
          <div className="flex items-center gap-2">
            <UserAvatar name={assignee.full_name} src={assignee.avatar_url} size="xs" />
            <span className="text-xs">{assignee.full_name}</span>
          </div>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground text-xs tabular">{formatDateTime(task.due_date)}</td>
      <td className="px-4 py-3 hidden md:table-cell text-xs tabular font-medium">{formatCurrency(task.price, task.currency ?? "EGP")}</td>
      <td className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/tasks/${task.id}`}>افتح</Link></DropdownMenuItem>
            {!locked && (
              <DropdownMenuItem asChild>
                <Link href={`/tasks/${task.id}/edit`}><Pencil className="h-3.5 w-3.5" /> عدل</Link>
              </DropdownMenuItem>
            )}
            {me.role === "admin" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> امسح
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>متأكد؟</AlertDialogTitle>
                    <AlertDialogDescription>هتمسح التاسك &ldquo;{task.title}&rdquo; خالص. ده مش هينفع نرجعه.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>لا</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">امسحه</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
