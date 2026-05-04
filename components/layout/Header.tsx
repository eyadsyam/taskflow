"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Plus, Sun, Moon, Users, LayoutDashboard, ListChecks, MessageCircle, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/chat", label: "الشات", icon: MessageCircle },
  { href: "/tasks", label: "التاسكات", icon: ListChecks },
  { href: "/team", label: "التيم", icon: Users },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "الرئيسية",
  "/chat": "الشات",
  "/tasks": "التاسكات",
  "/team": "التيم",
  "/settings": "الإعدادات",
};

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const pageTitle = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + "/")
  )?.[1];

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 h-14">
        {/* Mobile: hamburger + logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)} className="h-8 w-8">
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <Image src="/assets/logo.svg" alt="TaskFlow" width={24} height={24} priority />
          <span className="font-semibold text-sm">TaskFlow</span>
        </div>

        {/* Desktop: page title */}
        <div className="hidden lg:block">
          {pageTitle && <h2 className="text-sm font-medium text-muted-foreground">{pageTitle}</h2>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button asChild size="sm" variant="ghost" className="hidden md:inline-flex h-8 text-xs">
            <Link href="/tasks/new"><Plus className="h-3.5 w-3.5" /> تاسك</Link>
          </Button>
          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="غير المود" className="h-8 w-8">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="lg:hidden border-t border-border bg-background p-2 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/tasks/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> تاسك جديد
          </Link>
          <form action="/auth/signout" method="post" className="pt-2 border-t border-border mt-1">
            <button className="w-full text-right rounded-lg px-3 py-2 text-sm text-destructive hover:bg-muted">
              خروج
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
