"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Bỏ qua lỗi đăng ký SW trong môi trường không hỗ trợ HTTPS/SW
      });
    }
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
