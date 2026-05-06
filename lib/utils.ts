import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { TaskStatus, UserRole } from "@/lib/database.types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  pending_client: "مستني العميل",
  in_progress: "شغالين عليها",
  done_pending_payment: "خلصت - مستنيين الفلوس",
  paid_closed: "مقفولة - اتدفعت",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  pending_client: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  done_pending_payment: "bg-orange-500/10 text-orange-400 border-orange-500/25",
  paid_closed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
};

export const STATUS_ORDER: TaskStatus[] = [
  "pending_client",
  "in_progress",
  "done_pending_payment",
  "paid_closed",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "مسؤول",
  member: "عضو التيم",
};

export function formatCurrency(amount: number | null, currency = "EGP"): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("ar-EG", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/**
 * Fixed conversion rate from SAR to EGP. The user works only with EGP & SAR
 * and uses 12.5 EGP per 1 SAR (intentionally lower than the real rate to
 * pre-account for an off-platform broker fee).
 */
export const SAR_TO_EGP = 12.5;

/** Convert any supported currency amount to its EGP equivalent. */
export function toEgp(amount: number | null, currency: string | null | undefined): number {
  if (amount == null) return 0;
  if (!currency || currency.toUpperCase() === "EGP") return amount;
  if (currency.toUpperCase() === "SAR") return amount * SAR_TO_EGP;
  return amount; // fallback — unsupported currency stays as-is
}

/**
 * Compute task earnings split:
 *   - Creator: 10% if total < 1000 EGP, 20% if >= 1000 EGP
 *   - Assignee: gets the rest (90% / 80%)
 */
export function taskEarnings(price: number | null, currency: string | null | undefined) {
  const totalEgp = toEgp(price, currency);
  const creatorPct = totalEgp < 1000 ? 0.1 : 0.2;
  const creatorAmount = Math.round(totalEgp * creatorPct * 100) / 100;
  const assigneeAmount = Math.round(totalEgp * (1 - creatorPct) * 100) / 100;
  return { totalEgp, creatorPct, creatorAmount, assigneeAmount };
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

export function formatTime(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return d;
  }
}

export function relativeTime(d: string | null | undefined): string {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "دلوقتي";
  const min = Math.round(sec / 60);
  if (min < 60) return `من ${min} د`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `من ${hr} س`;
  const day = Math.round(hr / 24);
  if (day < 7) return `من ${day} يوم`;
  return formatDate(d);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

// Generate a stable color from a string (for avatars without images)
export function getAvatarColor(seed: string): string {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-cyan-500", "bg-emerald-500",
    "bg-pink-500", "bg-rose-500", "bg-amber-500", "bg-indigo-500",
    "bg-purple-500", "bg-teal-500", "bg-fuchsia-500", "bg-sky-500",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function isUserOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  return diff < 60_000; // 1 minute
}

export function getUserStatus(lastSeenAt: string | null): "online" | "away" | "offline" {
  if (!lastSeenAt) return "offline";
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < 60_000) return "online";
  if (diff < 5 * 60_000) return "away";
  return "offline";
}

// Format message timestamps in chat style
export function formatMessageTime(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }
  if (isYesterday) {
    return "إمبارح " + date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function groupMessagesByDate<T extends { created_at: string }>(messages: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const msg of messages) {
    const date = new Date(msg.created_at).toDateString();
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(msg);
  }
  return groups;
}

export function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isToday) return "النهاردة";
  if (isYesterday) return "إمبارح";
  return date.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
}
