export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-primary text-primary-foreground p-12">
        <div className="text-2xl font-bold">TaskFlow</div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            بوابة واحدة بين تيم العلاقات وتيم الشغل.
          </h1>
          <p className="text-primary-foreground/70 text-lg">
            نظّم المهام، تابع الحالة، استلم إشعارات لحظية، واقفل كل تاسك مدفوع بأمان كامل.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/60">© TaskFlow</div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
