"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, Plus, RefreshCw, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  createRecurringRuleAction,
  deleteRecurringRuleAction,
  syncRecurringRulesAction,
  toggleRecurringRuleAction,
} from "@/actions/recurring-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CATEGORY_LIST,
  CATEGORY_META,
  formatVnd,
  type CategoryValue,
  type TransactionTypeValue,
} from "@/lib/constants";
import { recurringRuleSchema } from "@/lib/validations";

export interface RecurringRuleDto {
  id: string;
  title: string;
  amount: number;
  type: TransactionTypeValue;
  category: CategoryValue;
  dayOfMonth: number;
  active: boolean;
  lastGeneratedMonth: string | null;
}

interface RecurringSectionProps {
  rules: RecurringRuleDto[];
}

export function RecurringSection({ rules }: RecurringSectionProps) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState<TransactionTypeValue>("EXPENSE");
  const [category, setCategory] = React.useState<CategoryValue>("BILLS");
  const [dayOfMonth, setDayOfMonth] = React.useState("5");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const payload = { title, amount, type, category, dayOfMonth };
    const parsed = recurringRuleSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await createRecurringRuleAction(payload);
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setTitle("");
      setAmount("");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSyncNow(force: boolean) {
    setIsSyncing(true);
    try {
      const res = await syncRecurringRulesAction(force);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      for (const note of res.data?.newMilestones ?? []) {
        toast.success(note.message, { duration: 6000 });
      }
      router.refresh();
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleToggle(id: string, nextActive: boolean) {
    const res = await toggleRecurringRuleAction(id, nextActive);
    if (res.ok) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  async function handleDelete(id: string) {
    const res = await deleteRecurringRuleAction(id);
    if (res.ok) {
      toast.success(res.message);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  }

  return (
    <section aria-label="Giao dịch định kỳ hàng tháng" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Repeat className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Giao dịch định kỳ theo tháng</h2>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSyncing}
          onClick={() => handleSyncNow(true)}
        >
          <RefreshCw
            className={`mr-1.5 size-4 ${isSyncing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Sinh giao dịch tháng này ngay
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thêm quy tắc tự sinh hàng tháng</CardTitle>
          <CardDescription>
            Ví dụ: Lương ngày 5, Tiền trọ ngày 2 — hệ thống tự sinh 1 lần mỗi tháng.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            noValidate
          >
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="rec-title">Tên khoản định kỳ</Label>
              <Input
                id="rec-title"
                placeholder="Lương / Tiền thuê trọ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={Boolean(fieldErrors.title)}
              />
              {fieldErrors.title?.[0] && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.title[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-amount">Số tiền (VND)</Label>
              <Input
                id="rec-amount"
                type="number"
                min="1"
                step="1"
                placeholder="4500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={Boolean(fieldErrors.amount)}
              />
              {fieldErrors.amount?.[0] && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.amount[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-type">Loại & Danh mục</Label>
              <div className="flex gap-1.5">
                <Select
                  value={type}
                  onValueChange={(val) => setType(val as TransactionTypeValue)}
                >
                  <SelectTrigger id="rec-type" className="w-[105px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXPENSE">Chi</SelectItem>
                    <SelectItem value="INCOME">Thu</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={category}
                  onValueChange={(val) => setCategory(val as CategoryValue)}
                >
                  <SelectTrigger aria-label="Danh mục định kỳ" className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_LIST.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_META[cat].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-day">Ngày hàng tháng (1–28)</Label>
              <div className="flex gap-2">
                <Input
                  id="rec-day"
                  type="number"
                  min="1"
                  max="28"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(e.target.value)}
                  aria-invalid={Boolean(fieldErrors.dayOfMonth)}
                />
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Plus className="size-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">Thêm</span>
                </Button>
              </div>
              {fieldErrors.dayOfMonth?.[0] && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.dayOfMonth[0]}
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chưa có quy tắc giao dịch định kỳ nào.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{rule.title}</p>
                    <Badge variant={rule.active ? "default" : "secondary"}>
                      {rule.active ? "Đang bật" : "Tạm dừng"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ngày {rule.dayOfMonth} hàng tháng ·{" "}
                    {CATEGORY_META[rule.category].label} ·{" "}
                    {rule.lastGeneratedMonth
                      ? `Đã sinh gần nhất: ${rule.lastGeneratedMonth}`
                      : "Chưa sinh lần nào"}
                  </p>
                  <p
                    className={`text-sm font-semibold ${
                      rule.type === "INCOME"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {rule.type === "INCOME" ? "+" : "-"}
                    {formatVnd(rule.amount)}
                  </p>
                </div>

                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label={rule.active ? `Tạm dừng ${rule.title}` : `Bật ${rule.title}`}
                    onClick={() => handleToggle(rule.id, !rule.active)}
                  >
                    {rule.active ? (
                      <Pause className="size-4" aria-hidden="true" />
                    ) : (
                      <Play className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Xoá ${rule.title}`}
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
