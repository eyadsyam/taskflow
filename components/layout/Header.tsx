"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, Sun, Moon, Users, LayoutDashboard, ListChecks } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/tasks", label: "المهام", icon: ListChecks },
  { href: "/team", label: "الفريق", icon: Users },
];

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 h-16">
        <div className="flex items-center gap-3 lg:hidden">
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></Button>
          <div className="font-bold">TaskFlow</div>
        </div>
        <div className="hidden lg:block text-sm text-muted-foreground">مرحباً بك في TaskFlow</div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك جديد</Link>
          </Button>
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
        </div>
      </div>
      {open && (
        <nav className="lg:hidden border-t p-2 space-y-1 bg-background">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link href="/tasks/new" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" /> تاسك جديد
          </Link>
          <form action="/auth/signout" method="post">
            <button className="w-full text-right rounded-lg px-3 py-2 text-sm text-destructive hover:bg-accent">خروج</button>
          </form>
        </nav>
      )}
    </header>
  );
}
