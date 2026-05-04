import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">أهلاً بعودتك 👋</h2>
        <p className="text-muted-foreground">سجل دخولك للوصول لمنصة الفريق</p>
      </div>
      <Suspense><LoginForm /></Suspense>
      <p className="text-center text-sm text-muted-foreground">
        ليس لديك حساب؟{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          إنشاء حساب جديد
        </Link>
      </p>
    </div>
  );
}
