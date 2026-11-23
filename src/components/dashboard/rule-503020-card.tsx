"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, PieChart as PieIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { updateRule503020Action } from "@/actions/budget-actions";
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
import { formatVnd } from "@/lib/constants";
import type { Rule503020Analysis } from "@/lib/financial-insights";
import { rule503020Schema } from "@/lib/validations";

interface Rule503020CardProps {
  analysis: Rule503020Analysis;
}

export function Rule503020Card({ analysis }: Rule503020CardProps) {
  const router = useRouter();
  const [needsPct, setNeedsPct] = React.useState(String(analysis.target.needsPct));
  const [wantsPct, setWantsPct] = React.useState(String(analysis.target.wantsPct));
  const [savingsPct, setSavingsPct] = React.useState(
    String(analysis.target.savingsPct)
  );
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleSaveSplit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const payload = { needsPct, wantsPct, savingsPct };
    const parsed = rule503020Schema.safeParse(payload);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      const firstErr =
        Object.values(flat.fieldErrors).flat()[0] ??
        "Tổng 3 tỷ lệ phải bằng 100%.";
      setErrorMsg(firstErr);
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateRule503020Action(payload);
      if (!res.ok) {
        setErrorMsg(res.message);
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  const rows = [
    {
      key: "needs",
      label: "Thiết yếu (Ăn uống, Di chuyển, Hoá đơn)",
      amount: analysis.needsAmount,
      actual: analysis.actualNeedsPct,
      target: analysis.target.needsPct,
    },
    {
      key: "wants",
      label: "Mong muốn (Giải trí, Mua sắm, Khác)",
      amount: analysis.wantsAmount,
      actual: analysis.actualWantsPct,
      target: analysis.target.wantsPct,
    },
    {
      key: "savings",
      label: "Tích lũy & Đầu tư",
      amount: analysis.savingsAmount,
      actual: analysis.actualSavingsPct,
      target: analysis.target.savingsPct,
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PieIcon className="size-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            Phân tích Quy tắc {analysis.target.needsPct}/{analysis.target.wantsPct}/
            {analysis.target.savingsPct} (Tháng {analysis.monthKey})
          </CardTitle>
          <CardDescription>{analysis.statusMessage}</CardDescription>
        </div>
        <Badge variant={analysis.isBalanced ? "default" : "outline"}>
          {analysis.isBalanced ? "Cân đối tốt" : "Cần điều chỉnh"}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.key} className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                <span className="font-medium">{row.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatVnd(row.amount)} · Thực tế{" "}
                  <strong className="text-foreground">{row.actual}%</strong> / Mục
                  tiêu {row.target}%
                </span>
              </div>
              <Progress
                value={Math.min(100, row.actual)}
                aria-label={row.label}
                className="h-2"
              />
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSaveSplit}
          className="space-y-3 rounded-lg border bg-muted/30 p-3"
          noValidate
        >
          <p className="text-xs font-medium">Tuỳ chỉnh tỷ lệ mục tiêu (%)</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="rule-needs" className="text-xs">
                Thiết yếu
              </Label>
              <Input
                id="rule-needs"
                type="number"
                min="0"
                max="100"
                value={needsPct}
                onChange={(e) => setNeedsPct(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-wants" className="text-xs">
                Mong muốn
              </Label>
              <Input
                id="rule-wants"
                type="number"
                min="0"
                max="100"
                value={wantsPct}
                onChange={(e) => setWantsPct(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-savings" className="text-xs">
                Tích lũy
              </Label>
              <Input
                id="rule-savings"
                type="number"
                min="0"
                max="100"
                value={savingsPct}
                onChange={(e) => setSavingsPct(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errorMsg}
            </p>
          )}

          <Button type="submit" size="sm" variant="secondary" disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="mr-1.5 size-3.5" aria-hidden="true" />
            )}
            Lưu tỷ lệ mục tiêu
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
