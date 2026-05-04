import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="section-label">تسجيل الدخول</div>
        <h2 className="text-2xl font-bold tracking-tight">نورت تاني</h2>
        <p className="text-sm text-muted-foreground">ادخل عشان تكمل شغلك</p>
      </div>
      <Suspense><LoginForm /></Suspense>
      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
        معندكش حساب؟{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          اعمل واحد
        </Link>
      </div>
    </div>
  );
}
