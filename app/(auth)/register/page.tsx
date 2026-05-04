import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">أنشئ حساب جديد</h2>
        <p className="text-muted-foreground">انضم لفريق TaskFlow</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        عندك حساب بالفعل؟{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </div>
  );
}
