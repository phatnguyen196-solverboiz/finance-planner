export interface RecurringRuleLike {
  active: boolean;
  dayOfMonth: number;
  lastGeneratedMonth: string | null;
}

/**
 * Trả về chuỗi "YYYY-MM" theo UTC.
 */
export function formatYearMonth(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Kiểm tra xem quy tắc giao dịch định kỳ có cần tự sinh trong tháng hiện tại hay không.
 */
export function shouldGenerateRecurringForMonth(
  rule: RecurringRuleLike,
  referenceDate: Date = new Date(),
  force = false
): boolean {
  if (!rule.active) return false;

  const currentYearMonth = formatYearMonth(referenceDate);
  if (rule.lastGeneratedMonth === currentYearMonth) {
    return false;
  }

  if (force) return true;

  return referenceDate.getUTCDate() >= rule.dayOfMonth;
}

/**
 * Tạo Date UTC giữa ngày cho giao dịch định kỳ trong tháng "YYYY-MM".
 */
export function buildRecurringTransactionDate(
  yearMonth: string,
  dayOfMonth: number
): Date {
  const [yearStr, monthStr] = yearMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const safeDay = Math.min(28, Math.max(1, Math.trunc(dayOfMonth)));

  return new Date(Date.UTC(year, month - 1, safeDay, 12, 0, 0, 0));
}
