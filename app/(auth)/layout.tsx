import { Sparkles, MessageCircle, ListChecks, Users, Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-violet-600 via-fuchsia-600 to-blue-600">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-300/20 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm grid place-items-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="text-2xl font-bold text-white">TaskFlow</div>
        </div>
        
        <div className="relative z-10 space-y-8 text-white">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold leading-tight text-balance">
              تواصل، تعاون، أنجز.
            </h1>
            <p className="text-white/80 text-xl">
              منصة الفريق المتكاملة - محادثات لحظية، إدارة مهام، ومشاركة ملفات بدون قيود.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <Feature icon={<MessageCircle className="h-5 w-5" />} text="محادثات لحظية" />
            <Feature icon={<ListChecks className="h-5 w-5" />} text="إدارة المهام" />
            <Feature icon={<Users className="h-5 w-5" />} text="فريق موحد" />
            <Feature icon={<Zap className="h-5 w-5" />} text="ملفات بدون حدود" />
          </div>
        </div>
        
        <div className="relative z-10 text-sm text-white/60">© {new Date().getFullYear()} TaskFlow • منصة الفريق</div>
      </div>
      
      {/* Right side - Form */}
      <div className="flex items-center justify-center p-6 md:p-12 bg-background relative">
        <div className="absolute top-6 left-6 lg:hidden flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 grid place-items-center shadow-lg shadow-violet-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="text-xl font-bold">TaskFlow</div>
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-white/90">
      <div className="h-9 w-9 rounded-lg bg-white/15 backdrop-blur-sm grid place-items-center shrink-0">
        {icon}
      </div>
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
