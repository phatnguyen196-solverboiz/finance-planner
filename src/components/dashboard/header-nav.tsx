"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DatabaseZap,
  LogOut,
  Moon,
  Sun,
  Wallet,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { populateSampleDataAction } from "@/actions/demo-actions";
import { Button } from "@/components/ui/button";

interface HeaderNavProps {
  userName: string;
  userEmail: string;
  hasTransactions: boolean;
  rateSourceLabel: string;
}

export function HeaderNav({
  userName,
  userEmail,
  hasTransactions,
  rateSourceLabel,
}: HeaderNavProps) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [isSeeding, setIsSeeding] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      const { authClient } = await import("@/lib/auth-client");
      await authClient.signOut();
      toast.success("Đã đăng xuất an toàn.");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Không thể đăng xuất, vui lòng thử lại.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handlePopulateSample() {
    setIsSeeding(true);
    try {
      const res = await populateSampleDataAction();
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } finally {
      setIsSeeding(false);
    }
  }

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">
              Finance Planner
            </h1>
            <p className="text-xs text-muted-foreground">
              Tỷ giá: {rateSourceLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!hasTransactions && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePopulateSample}
              disabled={isSeeding}
            >
              <DatabaseZap className="mr-1.5 size-4" aria-hidden="true" />
              {isSeeding ? "Đang nạp..." : "Nạp dữ liệu mẫu"}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? (
              <Sun className="size-4" aria-hidden="true" />
            ) : (
              <Moon className="size-4" aria-hidden="true" />
            )}
          </Button>

          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{userEmail}</p>
          </div>

          <span className="max-w-[120px] truncate text-xs font-medium sm:hidden">
            {userName}
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Đăng xuất"
            onClick={handleSignOut}
            disabled={isSigningOut}
          >
            <LogOut className="mr-1.5 size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
