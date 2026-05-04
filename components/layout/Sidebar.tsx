"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListChecks, Users, Plus, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/components/profile-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ROLE_LABELS } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/tasks", label: "المهام", icon: ListChecks },
  { href: "/team", label: "الفريق", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const profile = useProfile();
  const initials = profile.full_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="hidden lg:flex fixed right-0 top-0 h-screen w-72 flex-col border-s bg-card p-4">
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">T</div>
        <div className="font-bold text-lg">TaskFlow</div>
      </div>

      <Button asChild className="my-4">
        <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك جديد</Link>
      </Button>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t pt-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar><AvatarFallback>{initials}</AvatarFallback></Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile.full_name}</div>
            <div className="text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</div>
          </div>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="ghost" size="icon" title="خروج">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
