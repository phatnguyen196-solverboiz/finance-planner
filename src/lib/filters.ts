import type { CategoryValue, TransactionTypeValue } from "./constants";

export type PeriodFilter = "this-month" | "last-month" | "all";

export interface TransactionFilters {
  period: PeriodFilter;
  category: CategoryValue | "ALL";
  type: TransactionTypeValue | "ALL";
  q: string;
}

const VALID_PERIODS = new Set<PeriodFilter>(["this-month", "last-month", "all"]);
const VALID_CATEGORIES = new Set<CategoryValue>([
  "FOOD",
  "TRANSPORT",
  "ENTERTAINMENT",
  "SHOPPING",
  "BILLS",
  "SALARY",
  "INVESTMENT",
  "OTHER",
]);
const VALID_TYPES = new Set<TransactionTypeValue>(["INCOME", "EXPENSE"]);

/**
 * Tính khoảng thời gian UTC đầu tháng và cuối tháng cho bộ lọc URL.
 */
export function getDateRangeForPeriod(
  period: PeriodFilter,
  referenceDate: Date = new Date()
): { gte: Date; lte: Date } | undefined {
  if (period === "all") {
    return undefined;
  }

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  const targetDate =
    period === "this-month"
      ? new Date(Date.UTC(refYear, refMonth, 1))
      : new Date(Date.UTC(refYear, refMonth - 1, 1));

  const year = targetDate.getUTCFullYear();
  const month = targetDate.getUTCMonth();

  const gte = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const lte = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  return { gte, lte };
}

/**
 * Chuẩn hóa searchParams từ URL sang bộ lọc giao dịch hợp lệ.
 */
export function parseFilterParams(
  rawParams: Record<string, string | string[] | undefined>
): TransactionFilters {
  const getString = (key: string): string => {
    const val = rawParams[key];
    if (Array.isArray(val)) return val[0] ?? "";
    return val ?? "";
  };

  const rawPeriod = getString("period") as PeriodFilter;
  const period: PeriodFilter = VALID_PERIODS.has(rawPeriod) ? rawPeriod : "all";

  const rawCategory = getString("category").toUpperCase();
  const category: CategoryValue | "ALL" = VALID_CATEGORIES.has(
    rawCategory as CategoryValue
  )
    ? (rawCategory as CategoryValue)
    : "ALL";

  const rawType = getString("type").toUpperCase();
  const type: TransactionTypeValue | "ALL" = VALID_TYPES.has(
    rawType as TransactionTypeValue
  )
    ? (rawType as TransactionTypeValue)
    : "ALL";

  const q = getString("q").trim().slice(0, 100);

  return { period, category, type, q };
}

/**
 * Tạo điều kiện `where` cho Prisma query, luôn ép buộc `userId` từ session.
 */
export function buildTransactionWhereClause(
  userId: string,
  filters: TransactionFilters,
  referenceDate: Date = new Date()
) {
  const dateRange = getDateRangeForPeriod(filters.period, referenceDate);

  return {
    userId,
    ...(filters.category !== "ALL" ? { category: filters.category } : {}),
    ...(filters.type !== "ALL" ? { type: filters.type } : {}),
    ...(dateRange ? { date: dateRange } : {}),
    ...(filters.q
      ? {
          description: {
            contains: filters.q,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };
}

export function buildFilterQueryString(filters: Partial<TransactionFilters>): string {
  const params = new URLSearchParams();
  if (filters.period && filters.period !== "all") {
    params.set("period", filters.period);
  }
  if (filters.category && filters.category !== "ALL") {
    params.set("category", filters.category);
  }
  if (filters.type && filters.type !== "ALL") {
    params.set("type", filters.type);
  }
  if (filters.q && filters.q.trim().length > 0) {
    params.set("q", filters.q.trim());
  }
  return params.toString();
}
