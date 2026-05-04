import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });

export const metadata: Metadata = {
  title: "TaskFlow — منصة الفريق",
  description: "منصة عمل تشاركية للفريق - محادثات، مهام، وملفات في مكان واحد",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`dark ${cairo.variable}`}>
      <body className="font-sans bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
