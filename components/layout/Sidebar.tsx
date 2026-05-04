"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, MessageCircle, Users, Settings, LogOut, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/profile-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ROLE_LABELS } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/chat", label: "الشات", icon: MessageCircle },
  { href: "/tasks", label: "التاسكات", icon: ListChecks },
  { href: "/team", label: "التيم", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const profile = useProfile();

  return (
    <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-64 flex-col border-s border-border bg-card/50 backdrop-blur-sm z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border shrink-0">
        <Image src="/assets/logo.svg" alt="TaskFlow" width={28} height={28} priority />
        <span className="font-bold text-lg">TaskFlow</span>
      </div>

      {/* Quick Action */}
      <div className="px-3 pt-4 pb-2">
        <Button asChild variant="gradient" size="sm" className="w-full">
          <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك جديد</Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          الإعدادات
        </Link>

        <div className="flex items-center gap-3 px-3 pt-2">
          <UserAvatar
            name={profile.full_name}
            src={profile.avatar_url}
            size="sm"
            status="online"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {profile.job_title || ROLE_LABELS[profile.role]}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="icon-sm" title="خروج" className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
