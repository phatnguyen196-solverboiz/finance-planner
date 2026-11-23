"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/actions/transaction-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CURRENCY_META,
  formatIsoDateInput,
  formatVnd,
  type CategoryValue,
  type CurrencyCodeValue,
  type TransactionTypeValue,
} from "@/lib/constants";
import type { ExchangeRatesSnapshot } from "@/lib/currency";
import { transactionSchema } from "@/lib/validations";

export interface EditableTransaction {
  id: string;
  amount: number;
  description: string;
  type: TransactionTypeValue;
  category: CategoryValue;
  date: string;
  originalCurrency?: CurrencyCodeValue;
  originalAmount?: number | null;
}

interface TransactionDialogProps {
  ratesSnapshot: ExchangeRatesSnapshot;
  editingItem?: EditableTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDialog({
  ratesSnapshot,
  editingItem,
  open,
  onOpenChange,
}: TransactionDialogProps) {
  const router = useRouter();
  const isEditing = Boolean(editingItem);
  const useOriginalForeign = Boolean(
    editingItem?.originalCurrency &&
      editingItem.originalCurrency !== "VND" &&
      editingItem.originalAmount
  );

  const [amount, setAmount] = React.useState(() =>
    editingItem
      ? String(
          useOriginalForeign ? editingItem.originalAmount : editingItem.amount
        )
      : ""
  );
  const [currency, setCurrency] = React.useState<CurrencyCodeValue>(() =>
    editingItem && useOriginalForeign ? editingItem.originalCurrency! : "VND"
  );
  const [description, setDescription] = React.useState(
    () => editingItem?.description ?? ""
  );
  const [type, setType] = React.useState<TransactionTypeValue>(
    () => editingItem?.type ?? "EXPENSE"
  );
  const [category, setCategory] = React.useState<CategoryValue>(
    () => editingItem?.category ?? "FOOD"
  );
  const [date, setDate] = React.useState(() =>
    editingItem
      ? formatIsoDateInput(editingItem.date)
      : formatIsoDateInput(new Date())
  );
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [aiHint, setAiHint] = React.useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const numericAmount = Number(amount);
  const vndPreview =
    currency !== "VND" && Number.isFinite(numericAmount) && numericAmount > 0
      ? Math.round(numericAmount * ratesSnapshot.ratesToVnd[currency])
      : null;

  async function handleAiSuggest() {
    if (description.trim().length < 2) {
      setFieldErrors((prev) => ({
        ...prev,
        description: ["Nhập ít nhất 2 ký tự mô tả để AI gợi ý danh mục."],
      }));
      return;
    }

    setIsAiLoading(true);
    setAiHint(null);
    try {
      const response = await fetch("/api/ai/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), type }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        category?: CategoryValue;
        reason?: string;
        source?: string;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.category) {
        toast.error(data.error ?? "Không thể gợi ý danh mục lúc này.");
        return;
      }

      setCategory(data.category);
      setAiHint(
        `${data.source === "gemini" ? "Gemini AI" : "Bộ quy tắc"}: ${data.reason}`
      );
      toast.success(
        `Đã chọn danh mục "${CATEGORY_META[data.category].label}".`
      );
    } catch {
      toast.error("Lỗi mạng khi gọi gợi ý danh mục AI.");
    } finally {
      setIsAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const payload = {
      amount,
      currency,
      description,
      type,
      category,
      date,
    };

    const parsed = transactionSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      setFieldErrors(flat);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await updateTransactionAction(editingItem!.id, payload)
        : await createTransactionAction(payload);

      if (!result.ok) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      const milestones = result.data?.newMilestones ?? [];
      for (const note of milestones) {
        toast.success(note.message, { duration: 6000 });
      }

      onOpenChange(false);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Chỉnh sửa giao dịch" : "Thêm giao dịch mới"}
          </DialogTitle>
          <DialogDescription>
            Hỗ trợ nhập VND hoặc USD/EUR (tự quy đổi về VND theo {ratesSnapshot.source}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tx-amount">Số tiền</Label>
              <Input
                id="tx-amount"
                type="number"
                step={currency === "VND" ? "1" : "0.01"}
                min="0"
                placeholder={currency === "VND" ? "50000" : "25.5"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={Boolean(fieldErrors.amount)}
                aria-describedby={fieldErrors.amount ? "tx-amount-error" : undefined}
              />
              {fieldErrors.amount?.[0] && (
                <p
                  id="tx-amount-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {fieldErrors.amount[0]}
                </p>
              )}
              {vndPreview !== null && (
                <p className="text-xs text-teal-700 dark:text-teal-300">
                  Quy đổi tạm tính: {formatVnd(vndPreview)} (1 {currency} ={" "}
                  {formatVnd(ratesSnapshot.ratesToVnd[currency])})
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-currency">Tiền tệ</Label>
              <Select
                value={currency}
                onValueChange={(val) => setCurrency(val as CurrencyCodeValue)}
              >
                <SelectTrigger id="tx-currency" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["VND", "USD", "EUR"] as const).map((code) => (
                    <SelectItem key={code} value={code}>
                      {CURRENCY_META[code].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="tx-description">Mô tả (1–120 ký tự)</Label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleAiSuggest}
                disabled={isAiLoading}
              >
                {isAiLoading ? (
                  <Loader2 className="mr-1 size-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles className="mr-1 size-3 text-amber-500" aria-hidden="true" />
                )}
                AI gợi ý danh mục
              </Button>
            </div>
            <Input
              id="tx-description"
              maxLength={120}
              placeholder="Ví dụ: Cơm trưa văn phòng hoặc Lương tháng 11"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description ? "tx-description-error" : undefined
              }
            />
            {fieldErrors.description?.[0] && (
              <p
                id="tx-description-error"
                role="alert"
                className="text-xs font-medium text-destructive"
              >
                {fieldErrors.description[0]}
              </p>
            )}
            {aiHint && (
              <p className="text-xs text-muted-foreground">{aiHint}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-type">Loại</Label>
              <Select
                value={type}
                onValueChange={(val) => setType(val as TransactionTypeValue)}
              >
                <SelectTrigger id="tx-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">Chi tiêu</SelectItem>
                  <SelectItem value="INCOME">Thu nhập</SelectItem>
                </SelectContent>
              </Select>
              {fieldErrors.type?.[0] && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {fieldErrors.type[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-category">Danh mục</Label>
              <Select
                value={category}
                onValueChange={(val) => setCategory(val as CategoryValue)}
              >
                <SelectTrigger id="tx-category" className="w-full">
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
              {fieldErrors.category?.[0] && (
                <p role="alert" className="text-xs font-medium text-destructive">
                  {fieldErrors.category[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Ngày</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={Boolean(fieldErrors.date)}
                aria-describedby={fieldErrors.date ? "tx-date-error" : undefined}
              />
              {fieldErrors.date?.[0] && (
                <p
                  id="tx-date-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {fieldErrors.date[0]}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="mr-1.5 size-4" aria-hidden="true" />
              )}
              {isEditing ? "Lưu thay đổi" : "Thêm giao dịch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
