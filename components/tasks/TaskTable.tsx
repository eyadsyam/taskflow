"use client";
import Link from "next/link";
import { Lock, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Profile, Task, TaskStatus } from "@/lib/database.types";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { formatCurrency, formatDate, STATUS_LABELS, STATUS_ORDER } from "@/lib/utils";
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
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="text-muted-foreground">مفيش تاسكات بالوصف ده.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-right">
              <th className="px-4 py-3 font-medium">التاسك</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">العميل</th>
              <th className="px-4 py-3 font-medium">الحالة</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">الشغال عليها</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">التسليم</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">السعر</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">اتعملت</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
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
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3">
        <Link href={`/tasks/${task.id}`} className="font-medium hover:underline flex items-center gap-1.5">
          {locked && <Lock className="h-3.5 w-3.5 text-green-600" />}
          <span className="line-clamp-1">{task.title}</span>
        </Link>
        {(task.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {task.tags!.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
            ))}
          </div>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{task.client_name}</td>
      <td className="px-4 py-3">
        {locked ? (
          <TaskStatusBadge status={task.status} />
        ) : (
          <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v as TaskStatus, task.status)}>
            <SelectTrigger className="h-8 w-auto border-0 bg-transparent p-0 hover:opacity-80">
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
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{assignee?.full_name ?? "—"}</td>
      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{formatDate(task.due_date)}</td>
      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{formatCurrency(task.price, task.currency ?? "EGP")}</td>
      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{formatDate(task.created_at)}</td>
      <td className="px-4 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild><Link href={`/tasks/${task.id}`}>افتح</Link></DropdownMenuItem>
            {!locked && (
              <DropdownMenuItem asChild>
                <Link href={`/tasks/${task.id}/edit`}><Pencil className="h-4 w-4" /> عدل</Link>
              </DropdownMenuItem>
            )}
            {me.role === "admin" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> امسح
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
