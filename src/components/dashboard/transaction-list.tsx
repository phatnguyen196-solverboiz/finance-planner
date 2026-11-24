"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTransactionAction } from "@/actions/transaction-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CATEGORY_META,
  formatShortDate,
  formatVnd,
  type CategoryValue,
  type CurrencyCodeValue,
  type TransactionTypeValue,
} from "@/lib/constants";
import { summarizeTransactions } from "@/lib/filters";
import { ConfirmDeleteDialog } from "./confirm-delete-dialog";
import type { EditableTransaction } from "./transaction-dialog";

const INITIAL_VISIBLE_COUNT = 10;
const LOAD_MORE_STEP = 10;

export interface TransactionRowItem {
  id: string;
  type: TransactionTypeValue;
  amount: number;
  description: string;
  category: CategoryValue;
  date: string;
  originalCurrency: CurrencyCodeValue;
  originalAmount: number | null;
  exchangeRate: number | null;
  rateSource: string | null;
  isRecurringGenerated: boolean;
}

interface TransactionListProps {
  transactions: TransactionRowItem[];
  onEdit: (item: EditableTransaction) => void;
  initialVisibleCount?: number;
  hasActiveFilter?: boolean;
}

export function TransactionList({
  transactions,
  onEdit,
  initialVisibleCount = INITIAL_VISIBLE_COUNT,
  hasActiveFilter = false,
}: TransactionListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [pendingDelete, setPendingDelete] =
    React.useState<TransactionRowItem | null>(null);
  const [visibleCount, setVisibleCount] = React.useState(initialVisibleCount);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setDeletingId(id);
    try {
      const res = await deleteTransactionAction(id);
      if (res.ok) {
        toast.success(res.message);
        setPendingDelete(null);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center">
        <p className="text-sm font-medium">Chưa có giao dịch nào khớp bộ lọc.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Hãy thêm giao dịch mới, nhập từ tệp CSV hoặc bấm &ldquo;Nạp dữ liệu mẫu&rdquo; ở thanh trên.
        </p>
      </div>
    );
  }

  const summary = summarizeTransactions(transactions);
  const visibleTransactions = transactions.slice(0, visibleCount);
  const shownCount = visibleTransactions.length;
  const remainingCount = transactions.length - shownCount;
  const nextBatchCount = Math.min(LOAD_MORE_STEP, remainingCount);

  return (
    <div className="space-y-3">
      {/* Tóm tắt nhanh tập giao dịch đang hiển thị/lọc */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-xs ${
          hasActiveFilter ? "border-teal-500/30 bg-teal-500/5" : "bg-card/70"
        }`}
      >
        <span className="font-medium text-muted-foreground">
          {hasActiveFilter ? "Theo bộ lọc hiện tại" : "Tổng hợp danh sách"} ({summary.count} giao dịch)
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 tabular-nums">
          <span>
            Thu:{" "}
            <strong className="text-emerald-600 dark:text-emerald-400">
              +{formatVnd(summary.totalIncome)}
            </strong>
          </span>
          <span>
            Chi:{" "}
            <strong className="text-rose-600 dark:text-rose-400">
              -{formatVnd(summary.totalExpense)}
            </strong>
          </span>
          <span>
            Chênh lệch:{" "}
            <strong
              className={
                summary.net >= 0
                  ? "text-teal-700 dark:text-teal-300"
                  : "text-rose-600 dark:text-rose-400"
              }
            >
              {summary.net >= 0 ? "+" : ""}
              {formatVnd(summary.net)}
            </strong>
          </span>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Mô tả</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead className="text-right">Số tiền (VND)</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTransactions.map((tx) => {
              const catMeta = CATEGORY_META[tx.category];
              const isIncome = tx.type === "INCOME";
              return (
                <TableRow key={tx.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatShortDate(tx.date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{tx.description}</span>
                        {tx.isRecurringGenerated && (
                          <Badge variant="outline" className="text-[10px]">
                            <Repeat className="mr-1 size-3" aria-hidden="true" />
                            Định kỳ
                          </Badge>
                        )}
                      </div>
                      {tx.originalCurrency !== "VND" && tx.originalAmount && (
                        <span className="text-xs text-muted-foreground">
                          Gốc: {tx.originalAmount} {tx.originalCurrency} (tỷ giá{" "}
                          {tx.exchangeRate?.toLocaleString("vi-VN")} ·{" "}
                          {tx.rateSource ?? "open.er-api.com"})
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={catMeta.badgeClass}>
                      {catMeta.label}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-right font-semibold tabular-nums ${
                      isIncome
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isIncome ? "+" : "-"}
                    {formatVnd(tx.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Sửa giao dịch ${tx.description}`}
                        onClick={() => onEdit(tx)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Xoá giao dịch ${tx.description}`}
                        disabled={deletingId === tx.id}
                        onClick={() => setPendingDelete(tx)}
                      >
                        <Trash2
                          className="size-4 text-destructive"
                          aria-hidden="true"
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards (PWA Friendly) */}
      <div className="grid gap-2.5 md:hidden">
        {visibleTransactions.map((tx) => {
          const catMeta = CATEGORY_META[tx.category];
          const isIncome = tx.type === "INCOME";
          return (
            <div
              key={tx.id}
              className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3.5"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate font-medium">{tx.description}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{formatShortDate(tx.date)}</span>
                  <Badge variant="outline" className={catMeta.badgeClass}>
                    {catMeta.label}
                  </Badge>
                  {tx.isRecurringGenerated && (
                    <Badge variant="outline" className="text-[10px]">
                      Định kỳ
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`font-semibold tabular-nums ${
                    isIncome
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatVnd(tx.amount)}
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Sửa giao dịch ${tx.description}`}
                    onClick={() => onEdit(tx)}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-xs"
                    aria-label={`Xoá giao dịch ${tx.description}`}
                    disabled={deletingId === tx.id}
                    onClick={() => setPendingDelete(tx)}
                  >
                    <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {transactions.length > initialVisibleCount && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/60 px-4 py-2.5">
          <p className="text-xs text-muted-foreground tabular-nums">
            Đang hiển thị <strong className="text-foreground">{shownCount}</strong> /{" "}
            {transactions.length} giao dịch
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {remainingCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setVisibleCount((prev) =>
                    Math.min(transactions.length, prev + LOAD_MORE_STEP)
                  )
                }
              >
                <ChevronDown className="mr-1.5 size-4" aria-hidden="true" />
                Xem thêm {nextBatchCount} (còn {remainingCount})
              </Button>
            )}

            {remainingCount > LOAD_MORE_STEP && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCount(transactions.length)}
              >
                Xem tất cả ({transactions.length})
              </Button>
            )}

            {shownCount > initialVisibleCount && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCount(initialVisibleCount)}
              >
                <ChevronUp className="mr-1.5 size-4" aria-hidden="true" />
                Thu gọn
              </Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Xoá giao dịch?"
        description={
          pendingDelete
            ? `Bạn chắc chắn muốn xoá giao dịch "${pendingDelete.description}" (${formatVnd(pendingDelete.amount)})? Hành động này không thể hoàn tác.`
            : ""
        }
        isLoading={Boolean(pendingDelete && deletingId === pendingDelete.id)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
