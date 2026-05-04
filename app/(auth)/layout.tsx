import Link from "next/link";
import { ListChecks, MessageCircle, Users, Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-[0.4]" />
      <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
        {/* Left: brand panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 relative">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <div className="relative h-9 w-9 rounded-md bg-primary grid place-items-center">
              <span className="text-xs font-bold text-primary-foreground tabular">TF</span>
              <div className="absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-background" />
            </div>
            <span className="text-lg font-bold">TaskFlow</span>
          </Link>

          {/* Hero text */}
          <div className="space-y-8">
            <div>
              <div className="section-label mb-4 text-primary/70">منصة التيم</div>
              <h1 className="text-5xl xl:text-6xl font-bold leading-[1.05] text-balance tracking-tight">
                اتكلموا.<br />
                اشتغلوا.<br />
                <span className="text-primary">خلصوا.</span>
              </h1>
              <p className="text-muted-foreground text-base mt-6 max-w-md leading-relaxed">
                مكان واحد لتيمك يتجمع فيه. شات لايف، تنظيم شغل، وملفات من غير حدود.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Feature icon={<MessageCircle className="h-3.5 w-3.5" />} text="شات لحظي" />
              <Feature icon={<ListChecks className="h-3.5 w-3.5" />} text="تنظيم الشغل" />
              <Feature icon={<Users className="h-3.5 w-3.5" />} text="تيم واحد" />
              <Feature icon={<Zap className="h-3.5 w-3.5" />} text="ملفات بلا حدود" />
            </div>
          </div>

          {/* Footer marks */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="tabular">© {new Date().getFullYear()} TaskFlow</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>نظام شغال 100%</span>
            </span>
          </div>
        </div>

        {/* Right: form panel */}
        <div className="flex items-center justify-center p-6 md:p-12 lg:p-16">
          {/* Mobile logo */}
          <Link href="/" className="absolute top-6 right-6 lg:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary grid place-items-center">
              <span className="text-[10px] font-bold text-primary-foreground tabular">TF</span>
            </div>
            <span className="font-bold text-sm">TaskFlow</span>
          </Link>

          <div className="w-full max-w-[380px]">
            <div className="rounded-xl border border-border bg-card/60 backdrop-blur-sm p-6 md:p-8 shadow-soft">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-border bg-card/40">
      <div className="h-6 w-6 rounded grid place-items-center bg-primary/10 text-primary border border-primary/20 shrink-0">
        {icon}
      </div>
      <span className="text-xs font-medium">{text}</span>
    </div>
  );
}
