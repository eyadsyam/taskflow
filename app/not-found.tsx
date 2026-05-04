import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">الصفحة مش موجودة</p>
        <Button asChild><Link href="/dashboard">العودة للرئيسية</Link></Button>
      </div>
    </div>
  );
}
