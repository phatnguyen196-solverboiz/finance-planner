"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TableIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatVnd } from "@/lib/constants";
import type { MonthlyTrendReport } from "@/lib/financial-insights";

const chartConfig: ChartConfig = {
  income: {
    label: "Thu nhập",
    color: "#10b981",
  },
  expense: {
    label: "Chi tiêu",
    color: "#f43f5e",
  },
};

interface MonthlyComparisonChartProps {
  report: MonthlyTrendReport;
}

export function MonthlyComparisonChart({
  report,
}: MonthlyComparisonChartProps) {
  const [showTable, setShowTable] = React.useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">
            So sánh Thu / Chi 6 tháng gần nhất
          </CardTitle>
          <CardDescription>
            Chi tiêu TB 3 tháng gần nhất: {formatVnd(report.avgMonthlyExpense3m)}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {report.expenseChangePct !== null && (
            <Badge
              variant="outline"
              className={
                report.trendDirection === "up"
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : report.trendDirection === "down"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : ""
              }
            >
              {report.trendDirection === "up" ? (
                <TrendingUp className="mr-1 size-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="mr-1 size-3.5" aria-hidden="true" />
              )}
              {report.expenseChangePct > 0 ? "+" : ""}
              {report.expenseChangePct}% so với tháng trước
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => setShowTable((prev) => !prev)}
            aria-expanded={showTable}
          >
            <TableIcon className="mr-1 size-3.5" aria-hidden="true" />
            {showTable ? "Ẩn bảng" : "Bảng số liệu"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div aria-hidden="true">
          <ChartContainer config={chartConfig} className="max-h-[280px] w-full">
            <BarChart data={report.months}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${Math.round(Number(val) / 1_000_000)}M`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => formatVnd(Number(value))}
                  />
                }
              />
              <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Chi tiêu" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className={showTable ? "mt-4 overflow-x-auto" : "sr-only"}>
          <Table aria-label="Bảng so sánh thu chi 6 tháng">
            <caption className="sr-only">
              Số liệu thu nhập và chi tiêu 6 tháng gần nhất
            </caption>
            <TableHeader>
              <TableRow>
                <TableHead>Tháng</TableHead>
                <TableHead className="text-right">Thu nhập</TableHead>
                <TableHead className="text-right">Chi tiêu</TableHead>
                <TableHead className="text-right">Chênh lệch</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.months.map((m) => (
                <TableRow key={m.monthKey}>
                  <TableCell>{m.label}</TableCell>
                  <TableCell className="text-right">{formatVnd(m.income)}</TableCell>
                  <TableCell className="text-right">{formatVnd(m.expense)}</TableCell>
                  <TableCell className="text-right">{formatVnd(m.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
