"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Users,
  Settings,
  LogOut,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/profile-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ROLE_LABELS } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, hint: "G D" },
  { href: "/chat", label: "الشات", icon: MessageCircle, hint: "G C" },
  { href: "/tasks", label: "التاسكات", icon: ListChecks, hint: "G T" },
  { href: "/team", label: "التيم", icon: Users, hint: "G P" },
];

export function Sidebar() {
  const pathname = usePathname();
  const profile = useProfile();

  return (
    <aside
      className={cn(
        "hidden lg:flex fixed right-0 top-0 h-screen w-[260px] flex-col z-40",
        "bg-sidebar border-s border-sidebar-border",
      )}
    >
      {/* Workspace header */}
      <div className="flex items-center gap-2.5 px-4 h-[52px] border-b border-sidebar-border shrink-0">
        <div className="relative h-7 w-7 rounded-md bg-primary grid place-items-center shrink-0">
          <span className="text-[11px] font-bold text-primary-foreground tabular">TF</span>
          <div className="absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-sidebar" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold leading-tight">TaskFlow</div>
          <div className="text-[10px] text-muted-foreground leading-tight">منصة الفريق</div>
        </div>
      </div>

      {/* Quick action */}
      <div className="px-3 pt-3 pb-2">
        <Button asChild variant="default" size="sm" className="w-full justify-between h-8">
          <Link href="/tasks/new">
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              تاسك جديد
            </span>
            <kbd className="hidden lg:inline-flex bg-black/15 text-primary-foreground/70 border-black/20">N</kbd>
          </Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin">
        <div className="px-2 mb-1.5 section-label">الصفحات</div>
        <div className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-all",
                  active
                    ? "bg-elevated text-foreground"
                    : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground",
                )}
              >
                {active && (
                  <span className="absolute end-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-l-full bg-primary" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active && "text-primary")} />
                <span className="flex-1">{item.label}</span>
                <kbd className="opacity-0 group-hover:opacity-100 transition-opacity">{item.hint}</kbd>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Pro tip strip */}
      <div className="mx-3 mb-3 rounded-md border border-border/60 bg-elevated/40 p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold">طريقة سريعة</span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          اضغط <kbd>K</kbd> + <kbd>⌘</kbd> عشان تفتح أي حاجة في ثانية.
        </p>
      </div>

      {/* User strip */}
      <div className="border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <UserAvatar
            name={profile.full_name}
            src={profile.avatar_url}
            size="sm"
            status="online"
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{profile.full_name}</div>
            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
              <span className="h-1 w-1 rounded-full bg-emerald-500" />
              {profile.job_title || ROLE_LABELS[profile.role]}
            </div>
          </div>
          <Link
            href="/settings"
            className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title="الإعدادات"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              title="خروج"
              className="h-7 w-7 grid place-items-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
