"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, MessageCircle, Users, Settings, LogOut, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/profile-context";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ROLE_LABELS } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/chat", label: "المحادثات", icon: MessageCircle, badge: true },
  { href: "/tasks", label: "المهام", icon: ListChecks },
  { href: "/team", label: "الفريق", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const profile = useProfile();

  return (
    <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-72 flex-col bg-sidebar border-s border-sidebar-border">
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center shadow-lg shadow-violet-500/30">
          <Sparkles className="h-5 w-5 text-white" />
          <div className="absolute inset-0 rounded-xl bg-white/20 blur-md -z-10" />
        </div>
        <div>
          <div className="font-bold text-lg leading-tight">TaskFlow</div>
          <div className="text-xs text-muted-foreground">منصة الفريق</div>
        </div>
      </div>

      {/* Quick Action */}
      <div className="px-3 pt-4">
        <Button asChild variant="gradient" className="w-full">
          <Link href="/tasks/new"><Plus className="h-4 w-4" /> مهمة جديدة</Link>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto scrollbar-thin">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all relative",
                active 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 transition-transform", active ? "" : "group-hover:scale-110")} />
              <span className="flex-1">{item.label}</span>
              {active && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/30 rounded-l-full" />}
            </Link>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <Settings className="h-4 w-4" />
          الإعدادات
        </Link>
        
        <div className="flex items-center gap-3 px-2 pt-2">
          <UserAvatar 
            name={profile.full_name} 
            src={profile.avatar_url}
            size="md" 
            status="online" 
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {profile.job_title || ROLE_LABELS[profile.role]}
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="icon-sm" title="تسجيل الخروج" className="text-muted-foreground hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
