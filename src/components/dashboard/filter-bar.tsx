"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_LIST, CATEGORY_META } from "@/lib/constants";
import {
  buildFilterQueryString,
  type PeriodFilter,
  type TransactionFilters,
} from "@/lib/filters";

interface FilterBarProps {
  filters: TransactionFilters;
}

export function FilterBar({ filters }: FilterBarProps) {
  const router = useRouter();
  const [searchText, setSearchText] = React.useState(filters.q);

  function applyFilters(next: Partial<TransactionFilters>) {
    const merged: TransactionFilters = {
      ...filters,
      ...next,
    };
    const qs = buildFilterQueryString(merged);
    router.push(qs ? `/?${qs}` : "/");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyFilters({ q: searchText });
  }

  const hasActiveFilter =
    filters.period !== "all" ||
    filters.category !== "ALL" ||
    filters.type !== "ALL" ||
    filters.q.length > 0;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc theo khoảng thời gian">
          {(
            [
              { value: "this-month", label: "Tháng này" },
              { value: "last-month", label: "Tháng trước" },
              { value: "all", label: "Tất cả" },
            ] as const
          ).map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={filters.period === item.value ? "default" : "outline"}
              onClick={() => applyFilters({ period: item.value as PeriodFilter })}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchText("");
              router.push("/");
            }}
          >
            <RotateCcw className="mr-1.5 size-3.5" aria-hidden="true" />
            Xoá bộ lọc
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="filter-type">Loại giao dịch</Label>
          <Select
            value={filters.type}
            onValueChange={(val) =>
              applyFilters({ type: val as TransactionFilters["type"] })
            }
          >
            <SelectTrigger id="filter-type" className="w-full">
              <SelectValue placeholder="Tất cả loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả (Thu & Chi)</SelectItem>
              <SelectItem value="INCOME">Thu nhập</SelectItem>
              <SelectItem value="EXPENSE">Chi tiêu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-category">Danh mục</Label>
          <Select
            value={filters.category}
            onValueChange={(val) =>
              applyFilters({ category: val as TransactionFilters["category"] })
            }
          >
            <SelectTrigger id="filter-category" className="w-full">
              <SelectValue placeholder="Tất cả danh mục" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả danh mục</SelectItem>
              {CATEGORY_LIST.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {CATEGORY_META[cat].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="space-y-1 sm:col-span-2"
        >
          <Label htmlFor="filter-search">Tìm theo mô tả</Label>
          <div className="flex gap-2">
            <Input
              id="filter-search"
              placeholder="Ví dụ: lương, cà phê, tiền trọ..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <Button type="submit" variant="secondary">
              <Search className="mr-1.5 size-4" aria-hidden="true" />
              Tìm
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
