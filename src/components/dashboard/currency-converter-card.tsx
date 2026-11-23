"use client";

import * as React from "react";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
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
import { formatVnd, type CurrencyCodeValue } from "@/lib/constants";
import {
  convertToVndInt,
  type ExchangeRatesSnapshot,
} from "@/lib/currency";

interface CurrencyConverterCardProps {
  initialRates: ExchangeRatesSnapshot;
}

export function CurrencyConverterCard({
  initialRates,
}: CurrencyConverterCardProps) {
  const [rates, setRates] = React.useState(initialRates);
  const [amount, setAmount] = React.useState("100");
  const [currency, setCurrency] = React.useState<Exclude<CurrencyCodeValue, "VND">>("USD");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const numeric = Number(amount);
  const convertedVnd =
    Number.isFinite(numeric) && numeric > 0
      ? convertToVndInt(numeric, currency, rates.ratesToVnd)
      : 0;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/exchange-rates");
      const data = (await response.json()) as ExchangeRatesSnapshot & {
        ok?: boolean;
      };
      if (!response.ok || !data.ok) {
        toast.error("Không thể cập nhật tỷ giá mới.");
        return;
      }
      setRates(data);
      toast.success(
        data.cached
          ? "Đang sử dụng tỷ giá đã cache trong 1 giờ."
          : "Đã cập nhật tỷ giá mới nhất."
      );
    } catch {
      toast.error("Lỗi kết nối khi lấy tỷ giá.");
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="size-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            Quy đổi đa tiền tệ (USD / EUR → VND)
          </CardTitle>
          <CardDescription>
            Nguồn: <strong>{rates.source}</strong> · Cache 1 giờ · Cập nhật:{" "}
            {new Intl.DateTimeFormat("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              timeZone: "Asia/Ho_Chi_Minh",
            }).format(new Date(rates.fetchedAt))}{" "}
            (GMT+7)
          </CardDescription>
        </div>
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={`mr-1 size-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Làm mới
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            1 USD = {formatVnd(rates.ratesToVnd.USD)}
          </Badge>
          <Badge variant="secondary">
            1 EUR = {formatVnd(rates.ratesToVnd.EUR)}
          </Badge>
          {rates.cached && <Badge variant="outline">Đang dùng cache 1h</Badge>}
          {rates.isFallback && (
            <Badge variant="outline">Tỷ giá dự phòng</Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="conv-amount">Số tiền ngoại tệ</Label>
            <Input
              id="conv-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="conv-currency">Đơn vị</Label>
            <Select
              value={currency}
              onValueChange={(val) => setCurrency(val as "USD" | "EUR")}
            >
              <SelectTrigger id="conv-currency" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col justify-end rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-[11px] text-muted-foreground">
              Quy đổi thành VND
            </span>
            <span className="text-base font-bold text-teal-700 dark:text-teal-300 tabular-nums">
              {formatVnd(convertedVnd)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
