import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-[0.4]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative text-center space-y-6 max-w-sm">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-8xl font-bold tabular tracking-tighter text-primary leading-none">4</span>
          <span className="text-8xl font-bold tabular tracking-tighter leading-none">0</span>
          <span className="text-8xl font-bold tabular tracking-tighter text-primary leading-none">4</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">الصفحة مش موجودة</h1>
          <p className="text-sm text-muted-foreground">يمكن اتمسحت أو الرابط فيه غلطة</p>
        </div>
        <Button asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" />
            ارجع للرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );
}
