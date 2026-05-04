import Image from "next/image";
import { MessageCircle, ListChecks, Users, Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-5 bg-background">
      {/* Left side - Branding (wider) */}
      <div className="hidden lg:flex lg:col-span-3 flex-col justify-between p-10 relative overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-600 to-blue-600">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-300/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm grid place-items-center">
            <Image src="/assets/logo.svg" alt="TaskFlow" width={24} height={24} priority />
          </div>
          <span className="text-xl font-bold text-white">TaskFlow</span>
        </div>

        <div className="relative z-10 space-y-6 text-white max-w-lg">
          <h1 className="text-4xl font-bold leading-tight text-balance">
            اتكلموا، اشتغلوا، خلصوا.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            المكان اللي تيمك هيتجمع فيه - شات لايف، تنظيم شغل، وملفات من غير حدود.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Feature icon={<MessageCircle className="h-4 w-4" />} text="شات لحظي" />
            <Feature icon={<ListChecks className="h-4 w-4" />} text="تنظيم الشغل" />
            <Feature icon={<Users className="h-4 w-4" />} text="تيم واحد" />
            <Feature icon={<Zap className="h-4 w-4" />} text="ملفات من غير حدود" />
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">TaskFlow {new Date().getFullYear()}</div>
      </div>

      {/* Right side - Form (narrower) */}
      <div className="lg:col-span-2 flex items-center justify-center p-6 md:p-10 relative">
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <Image src="/assets/logo.svg" alt="TaskFlow" width={28} height={28} priority />
          <span className="font-bold">TaskFlow</span>
        </div>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-white/80">
      <div className="h-8 w-8 rounded-lg bg-white/10 grid place-items-center shrink-0">
        {icon}
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}
