import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">أهلاً بعودتك 👋</h2>
        <p className="text-muted-foreground">سجّل الدخول للوصول إلى لوحة المهام</p>
      </div>
      <Suspense><LoginForm /></Suspense>
      <p className="text-center text-sm text-muted-foreground">
        ماعندكش حساب؟{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          أنشئ حساب جديد
        </Link>
      </p>
    </div>
  );
}
