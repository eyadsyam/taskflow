import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">نورت تاني</h2>
        <p className="text-muted-foreground">ادخل عشان تكمل شغلك</p>
      </div>
      <Suspense><LoginForm /></Suspense>
      <p className="text-center text-sm text-muted-foreground">
        معندكش حساب؟{" "}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          اعمل واحد
        </Link>
      </p>
    </div>
  );
}
