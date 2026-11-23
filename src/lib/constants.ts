export type TransactionTypeValue = "INCOME" | "EXPENSE";

export type CategoryValue =
  | "FOOD"
  | "TRANSPORT"
  | "ENTERTAINMENT"
  | "SHOPPING"
  | "BILLS"
  | "SALARY"
  | "INVESTMENT"
  | "OTHER";

export type PriorityValue = "LOW" | "MEDIUM" | "HIGH";

export type CurrencyCodeValue = "VND" | "USD" | "EUR";

export const CATEGORY_LIST: CategoryValue[] = [
  "FOOD",
  "TRANSPORT",
  "ENTERTAINMENT",
  "SHOPPING",
  "BILLS",
  "SALARY",
  "INVESTMENT",
  "OTHER",
];

export const EXPENSE_CATEGORIES: CategoryValue[] = [
  "FOOD",
  "TRANSPORT",
  "ENTERTAINMENT",
  "SHOPPING",
  "BILLS",
  "INVESTMENT",
  "OTHER",
];

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeValue, string> = {
  INCOME: "Thu nhập",
  EXPENSE: "Chi tiêu",
};

export const CATEGORY_META: Record<
  CategoryValue,
  {
    label: string;
    color: string;
    badgeClass: string;
    ruleBucket: "needs" | "wants" | "savings";
  }
> = {
  FOOD: {
    label: "Ăn uống",
    color: "#f97316",
    badgeClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    ruleBucket: "needs",
  },
  TRANSPORT: {
    label: "Di chuyển",
    color: "#0ea5e9",
    badgeClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
    ruleBucket: "needs",
  },
  ENTERTAINMENT: {
    label: "Giải trí",
    color: "#a855f7",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    ruleBucket: "wants",
  },
  SHOPPING: {
    label: "Mua sắm",
    color: "#ec4899",
    badgeClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30",
    ruleBucket: "wants",
  },
  BILLS: {
    label: "Hoá đơn",
    color: "#ef4444",
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    ruleBucket: "needs",
  },
  SALARY: {
    label: "Lương",
    color: "#10b981",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    ruleBucket: "savings",
  },
  INVESTMENT: {
    label: "Đầu tư",
    color: "#14b8a6",
    badgeClass: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30",
    ruleBucket: "savings",
  },
  OTHER: {
    label: "Khác",
    color: "#64748b",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
    ruleBucket: "wants",
  },
};

export const PRIORITY_META: Record<
  PriorityValue,
  { label: string; badgeClass: string }
> = {
  LOW: {
    label: "Thấp",
    badgeClass: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
  },
  MEDIUM: {
    label: "Trung bình",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  HIGH: {
    label: "Cao",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  },
};

export const CURRENCY_META: Record<
  CurrencyCodeValue,
  { label: string; symbol: string }
> = {
  VND: { label: "VND (₫)", symbol: "₫" },
  USD: { label: "USD ($)", symbol: "$" },
  EUR: { label: "EUR (€)", symbol: "€" },
};

export function formatVnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatShortDate(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

export function formatIsoDateInput(dateInput: Date | string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
