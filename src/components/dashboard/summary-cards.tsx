import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatVnd } from "@/lib/constants";
import type { FinancialHealthReport } from "@/lib/financial-insights";

interface SummaryCardsProps {
  balance: number;
  totalIncome: number;
  totalExpense: number;
  healthReport: FinancialHealthReport;
}

export function SummaryCards({
  balance,
  totalIncome,
  totalExpense,
  healthReport,
}: SummaryCardsProps) {
  const isPositiveBalance = balance >= 0;

  return (
    <section
      aria-label="Tổng quan số dư tài chính"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Card className="border-teal-500/40 bg-gradient-to-br from-teal-500/10 via-card to-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Số dư hiện tại
          </CardTitle>
          <Landmark className="size-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p
            data-testid="current-balance"
            className={`text-2xl font-bold tracking-tight ${
              isPositiveBalance
                ? "text-teal-700 dark:text-teal-300"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatVnd(balance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            = Tổng thu − Tổng chi (toàn thời gian)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tổng thu nhập
          </CardTitle>
          <ArrowUpCircle className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatVnd(totalIncome)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tích lũy tất cả nguồn thu
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Tổng chi tiêu
          </CardTitle>
          <ArrowDownCircle className="size-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
            {formatVnd(totalExpense)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tích lũy tất cả khoản chi
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Sức khỏe tài chính
          </CardTitle>
          <Activity className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold">
              {healthReport.score}/100
            </p>
            <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Hạng {healthReport.grade}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Dự báo cuối tháng: {formatVnd(healthReport.projectedEndOfMonthBalance)}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
