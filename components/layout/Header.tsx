"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Plus, Sun, Moon, Users, LayoutDashboard, ListChecks, MessageCircle, Search, X } from "lucide-react";
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

export function Header() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 glass-subtle">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 lg:px-8 h-16 border-b border-border/50">
        <div className="flex items-center gap-3 lg:hidden">
          <Button size="icon" variant="ghost" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <Image src="/assets/logo.svg" alt="TaskFlow" width={32} height={32} priority />
            <div className="font-bold">TaskFlow</div>
          </div>
        </div>
        
        {/* Search bar - desktop only */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="دور على حاجة..."
              className="w-full h-10 rounded-lg border border-border bg-muted/30 pe-10 ps-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="gradient" className="hidden md:inline-flex">
            <Link href="/tasks/new"><Plus className="h-4 w-4" /> تاسك</Link>
          </Button>
          {mounted && (
            <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="غير المود">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      
      {/* Mobile nav drawer */}
      {open && (
        <nav className="lg:hidden border-t border-border bg-background p-2 space-y-1 animate-slide-down">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "hover:bg-accent",
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
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white"
          >
            <Plus className="h-4 w-4" /> تاسك جديد
          </Link>
          <form action="/auth/signout" method="post" className="pt-2 border-t border-border">
            <button className="w-full text-right rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-accent">
              خروج
            </button>
          </form>
        </nav>
      )}
    </header>
  );
}
