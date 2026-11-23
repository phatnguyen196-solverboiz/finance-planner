"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { toast } from "sonner";
import { syncRecurringRulesAction } from "@/actions/recurring-actions";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function MilestoneNotifier() {
  const router = useRouter();
  const hasSyncedRef = React.useRef(false);
  const [installPrompt, setInstallPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    if (hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    // Tự động kiểm tra sinh giao dịch định kỳ đến hạn & thông báo mốc tiết kiệm
    syncRecurringRulesAction(false)
      .then((res) => {
        if (!res.ok || !res.data) return;
        if (res.data.generatedCount > 0) {
          toast.info(res.message);
        }
        for (const note of res.data.newMilestones) {
          toast.success(note.message, { duration: 6000 });
        }
        if (res.data.generatedCount > 0 || res.data.newMilestones.length > 0) {
          router.refresh();
        }
      })
      .catch(() => {
        // Không làm gián đoạn UX nếu kiểm tra nền lỗi tạm thời
      });
  }, [router]);

  React.useEffect(() => {
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  async function handleInstallPwa() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      toast.success("Đã cài đặt Finance Planner lên thiết bị!");
    }
    setInstallPrompt(null);
  }

  if (!installPrompt) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-2.5 text-xs">
      <div className="flex items-center gap-2">
        <Smartphone className="size-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        <span>
          Cài đặt <strong>Finance Planner</strong> như ứng dụng PWA trên điện thoại hoặc máy tính của bạn.
        </span>
      </div>
      <Button type="button" size="xs" onClick={handleInstallPwa}>
        Cài ứng dụng
      </Button>
    </div>
  );
}
