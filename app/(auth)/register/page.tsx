import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <div className="section-label">حساب جديد</div>
        <h2 className="text-2xl font-bold tracking-tight">انضم للتيم</h2>
        <p className="text-sm text-muted-foreground">دقيقة واحدة وخلصنا</p>
      </div>
      <RegisterForm />
      <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
        عندك حساب أصلاً؟{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          ادخل
        </Link>
      </div>
    </div>
  );
}
