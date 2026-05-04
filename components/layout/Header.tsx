"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Plus,
  Users,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  X,
  Search,
  Bell,
  ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/chat", label: "الشات", icon: MessageCircle },
  { href: "/tasks", label: "التاسكات", icon: ListChecks },
  { href: "/team", label: "التيم", icon: Users },
];

const PAGE_INFO: Record<string, { label: string; hint?: string }> = {
  "/dashboard": { label: "الرئيسية" },
  "/chat": { label: "الشات", hint: "محادثات الفريق" },
  "/tasks": { label: "التاسكات", hint: "كل المهام" },
  "/tasks/new": { label: "تاسك جديد" },
  "/team": { label: "التيم", hint: "أعضاء الفريق" },
  "/settings": { label: "الإعدادات" },
};

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Build breadcrumb segments
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    const info = PAGE_INFO[path];
    return { path, label: info?.label || seg };
  });

  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-[52px] border-b border-border",
        "bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 md:px-6 h-full">
        {/* Mobile: hamburger */}
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={() => setOpen(!open)}
          className="lg:hidden h-8 w-8"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-sm flex-1 min-w-0 overflow-hidden">
          {crumbs.length === 0 ? (
            <span className="text-foreground font-medium">الرئيسية</span>
          ) : (
            crumbs.map((c, i) => (
              <div key={c.path} className="flex items-center gap-1.5 min-w-0">
                {i > 0 && (
                  <ChevronLeft className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}
                {i === crumbs.length - 1 ? (
                  <span className="font-medium truncate">{c.label}</span>
                ) : (
                  <Link
                    href={c.path}
                    className="text-muted-foreground hover:text-foreground transition-colors truncate"
                  >
                    {c.label}
                  </Link>
                )}
              </div>
            ))
          )}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex h-8 gap-2 px-2.5 text-muted-foreground hover:text-foreground"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline text-xs">دور...</span>
            <kbd className="hidden md:inline-flex">⌘K</kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon-sm"
            className="h-8 w-8 text-muted-foreground hover:text-foreground relative"
            title="الإشعارات"
          >
            <Bell className="h-3.5 w-3.5" />
          </Button>

          <Button asChild size="sm" variant="default" className="h-8 hidden md:inline-flex">
            <Link href="/tasks/new">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">تاسك</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="lg:hidden absolute inset-x-0 top-[52px] border-b border-border bg-background animate-slide-down p-2 space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                  active ? "bg-elevated text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4", active && "text-primary")} />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/tasks/new"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground font-medium mt-2"
          >
            <Plus className="h-4 w-4" /> تاسك جديد
          </Link>
          <form action="/auth/signout" method="post" className="border-t border-border mt-2 pt-2">
            <button className="w-full text-right rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
              خروج
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
