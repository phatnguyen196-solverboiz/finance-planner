"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, PiggyBank, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  deleteBudgetAction,
  upsertBudgetAction,
} from "@/actions/budget-actions";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateBudgetStatus,
  type BudgetSummaryItem,
} from "@/lib/budget";
import {
  CATEGORY_META,
  EXPENSE_CATEGORIES,
  formatVnd,
  type CategoryValue,
} from "@/lib/constants";
import { budgetSchema } from "@/lib/validations";

interface BudgetStatusCardProps {
  item: BudgetSummaryItem;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function BudgetStatusCard({
  item,
  onDelete,
  isDeleting = false,
}: BudgetStatusCardProps) {
  const status = calculateBudgetStatus(item.spentAmount, item.limitAmount);
  const meta = CATEGORY_META[item.category];
  const clampedPct = Math.min(100, status.percentage);

  const badgeProps =
    status.alertLevel === "EXCEEDED_100"
      ? {
          label: `Vượt 100% (${status.percentage}%)`,
          className: "border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300",
        }
      : status.alertLevel === "WARNING_80"
        ? {
            label: `Cảnh báo ≥80% (${status.percentage}%)`,
            className: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
          }
        : {
            label: `An toàn (${status.percentage}%)`,
            className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div>
          <CardTitle className="text-base">{meta.label}</CardTitle>
          <CardDescription>Tháng {item.month}</CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className={badgeProps.className}>
            {status.alertLevel !== "SAFE" && (
              <AlertTriangle className="mr-1 size-3" aria-hidden="true" />
            )}
            {badgeProps.label}
          </Badge>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Xoá ngân sách ${meta.label}`}
              disabled={isDeleting}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress
          value={clampedPct}
          aria-label={`Mức sử dụng ngân sách ${meta.label}`}
          className="h-2.5"
        />
        <div className="flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
          <span>
            Đã chi: <strong className="text-foreground">{formatVnd(status.spentAmount)}</strong>
          </span>
          <span>
            Hạn mức: <strong className="text-foreground">{formatVnd(status.limitAmount)}</strong>
          </span>
        </div>
        <p className="text-xs font-medium">
          {status.remainingAmount >= 0
            ? `Còn lại ${formatVnd(status.remainingAmount)}`
            : `Đã vượt hạn mức ${formatVnd(Math.abs(status.remainingAmount))}!`}
        </p>
      </CardContent>
    </Card>
  );
}

interface BudgetSectionProps {
  budgets: BudgetSummaryItem[];
  currentMonth: string;
}

export function BudgetSection({ budgets, currentMonth }: BudgetSectionProps) {
  const router = useRouter();
  const [category, setCategory] = React.useState<CategoryValue>("FOOD");
  const [limitAmount, setLimitAmount] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const warningCount = budgets.filter((b) => b.alertLevel === "WARNING_80").length;
  const exceededCount = budgets.filter((b) => b.alertLevel === "EXCEEDED_100").length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    const payload = {
      category,
      month: currentMonth,
      limitAmount,
    };

    const parsed = budgetSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await upsertBudgetAction(payload);
      if (!res.ok) {
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setLimitAmount("");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await deleteBudgetAction(id);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section aria-label="Ngân sách theo danh mục" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PiggyBank className="size-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold">
            Ngân sách tháng {currentMonth}
          </h2>
        </div>

        {(warningCount > 0 || exceededCount > 0) && (
          <div className="flex flex-wrap gap-2">
            {warningCount > 0 && (
              <Badge className="bg-amber-500 text-white">
                {warningCount} danh mục ≥ 80%
              </Badge>
            )}
            {exceededCount > 0 && (
              <Badge variant="destructive">
                {exceededCount} danh mục vượt 100%
              </Badge>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Thiết lập / Cập nhật hạn mức tháng</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-3 sm:grid-cols-3"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="budget-category">Danh mục</Label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as CategoryValue)}
              >
                <SelectTrigger id="budget-category" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_META[cat].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget-limit">Hạn mức (VND)</Label>
              <Input
                id="budget-limit"
                type="number"
                min="1"
                step="1"
                placeholder="3000000"
                value={limitAmount}
                onChange={(e) => setLimitAmount(e.target.value)}
                aria-invalid={Boolean(fieldErrors.limitAmount)}
              />
              {fieldErrors.limitAmount?.[0] && (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.limitAmount[0]}
                </p>
              )}
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="mr-1.5 size-4" aria-hidden="true" />
                )}
                Lưu hạn mức
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chưa có ngân sách nào cho tháng {currentMonth}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((item) => (
            <BudgetStatusCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              isDeleting={deletingId === item.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
