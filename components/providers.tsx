"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30 * 1000, refetchOnWindowFocus: false } },
      }),
  );
  return (
    <QueryClientProvider client={qc}>
      {children}
      <Toaster
        richColors
        position="top-center"
        dir="rtl"
        theme="dark"
        toastOptions={{
          style: {
            background: "hsl(240 5% 9%)",
            border: "1px solid hsl(240 5% 14%)",
            color: "hsl(0 0% 98%)",
          },
        }}
      />
    </QueryClientProvider>
  );
}
