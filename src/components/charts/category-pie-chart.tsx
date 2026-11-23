"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
import { TableIcon } from "lucide-react";
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
import { CATEGORY_META, formatVnd, type CategoryValue } from "@/lib/constants";

export interface CategorySliceItem {
  category: CategoryValue;
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CategoryPieChartProps {
  data: CategorySliceItem[];
  monthLabel: string;
}

export function CategoryPieChart({ data, monthLabel }: CategoryPieChartProps) {
  const [showTable, setShowTable] = React.useState(false);

  const chartConfig = React.useMemo(() => {
    const cfg: ChartConfig = {};
    for (const item of data) {
      cfg[item.category] = {
        label: item.label,
        color: item.color,
      };
    }
    return cfg;
  }, [data]);

  const totalSpent = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">
            Cơ cấu chi tiêu tháng {monthLabel}
          </CardTitle>
          <CardDescription>
            Tổng chi tháng hiện tại: {formatVnd(totalSpent)}
          </CardDescription>
        </div>
        {data.length > 0 && (
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
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có khoản chi tiêu nào trong tháng này.
          </p>
        ) : (
          <div className="space-y-4">
            <div aria-hidden="true">
              <ChartContainer config={chartConfig} className="mx-auto max-h-[250px] w-full">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatVnd(Number(value))}
                      />
                    }
                  />
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="label"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={entry.category}
                        fill={CATEGORY_META[entry.category].color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>

            <div className="flex flex-wrap gap-2">
              {data.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs"
                >
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span>{item.label}:</span>
                  <span className="font-semibold">{item.percentage}%</span>
                </div>
              ))}
            </div>

            {/* Bảng số liệu thay thế cho trình đọc màn hình & người dùng cần xem chi tiết */}
            <div className={showTable ? "mt-2 overflow-x-auto" : "sr-only"}>
              <Table aria-label={`Bảng số liệu chi tiêu tháng ${monthLabel}`}>
                <caption className="sr-only">
                  Tỉ lệ chi tiêu theo danh mục trong tháng {monthLabel}
                </caption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Danh mục</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead className="text-right">Tỉ lệ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell className="text-right">
                        {formatVnd(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.percentage}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
