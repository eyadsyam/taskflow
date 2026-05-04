import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-bold">انضم للتيم</h2>
        <p className="text-muted-foreground">دقيقة واحدة وخلصنا</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        عندك حساب أصلاً؟{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          ادخل
        </Link>
      </p>
    </div>
  );
}
