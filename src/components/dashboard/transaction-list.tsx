"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Repeat, Trash2 } from "lucide-react";
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
import type { EditableTransaction } from "./transaction-dialog";

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
}

export function TransactionList({ transactions, onEdit }: TransactionListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await deleteTransactionAction(id);
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

  return (
    <div className="space-y-3">
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
            {transactions.map((tx) => {
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
                        onClick={() => handleDelete(tx.id)}
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
        {transactions.map((tx) => {
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
                    onClick={() => handleDelete(tx.id)}
                  >
                    <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
