import { HeartPulse, ShieldCheck, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatVnd } from "@/lib/constants";
import type { FinancialHealthReport } from "@/lib/financial-insights";

interface FinancialHealthCardProps {
  report: FinancialHealthReport;
}

export function FinancialHealthCard({ report }: FinancialHealthCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            Chỉ số Sức khỏe Tài chính & Dự báo cuối tháng
          </CardTitle>
          <CardDescription>
            Đánh giá tổng hợp từ tỷ lệ tiết kiệm, quỹ dự phòng và tuân thủ ngân sách.
          </CardDescription>
        </div>
        <Badge className="bg-indigo-600 text-white">
          {report.score}/100 · Hạng {report.grade}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <Progress
          value={report.score}
          aria-label="Điểm sức khỏe tài chính"
          className="h-2.5"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Tỷ lệ tiết kiệm tháng</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {report.savingsRatePct}%
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Quỹ dự phòng (Runway)</p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {report.emergencyRunwayMonths} tháng
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" aria-hidden="true" />
              Dự báo tổng chi tháng này
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
              {formatVnd(report.projectedMonthExpense)}
            </p>
          </div>

          <div className="rounded-lg border p-3">
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              Dự báo số dư cuối tháng
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums text-teal-700 dark:text-teal-300">
              {formatVnd(report.projectedEndOfMonthBalance)}
            </p>
          </div>
        </div>

        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          <p className="text-xs font-semibold">Khuyến nghị cải thiện</p>
          <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
            {report.tips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
