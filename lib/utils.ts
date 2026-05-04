import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TaskStatus, UserRole } from "@/lib/database.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending_client: "مستني رد العميل",
  in_progress: "شغالين عليها",
  done_pending_payment: "خلصت - مستنيين الفلوس",
  paid_closed: "مغلق / مدفوع",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending_client: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400",
  in_progress: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400",
  done_pending_payment: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-400",
  paid_closed: "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400",
};

export const STATUS_ORDER: TaskStatus[] = [
  "pending_client",
  "in_progress",
  "done_pending_payment",
  "paid_closed",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "أدمن",
  client_team: "تيم العلاقات",
  work_team: "تيم الشغل",
};

export function formatCurrency(amount: number | null, currency = "EGP"): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export function formatDateTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return d;
  }
}

export function relativeTime(d: string | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "الآن";
  const min = Math.round(sec / 60);
  if (min < 60) return `منذ ${min} دقيقة`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `منذ ${hr} ساعة`;
  const day = Math.round(hr / 24);
  if (day < 30) return `منذ ${day} يوم`;
  return formatDate(d);
}
