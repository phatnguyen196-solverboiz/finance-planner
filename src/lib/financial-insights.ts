import { CATEGORY_META, type CategoryValue, type TransactionTypeValue } from "./constants";
import { formatYearMonth } from "./recurring";

export interface TransactionRecordLike {
  amount: number;
  type: TransactionTypeValue;
  category: CategoryValue;
  date: Date | string;
}

export interface MonthlyComparisonPoint {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlyTrendReport {
  months: MonthlyComparisonPoint[];
  currentMonthExpense: number;
  previousMonthExpense: number;
  expenseChangePct: number | null;
  avgMonthlyExpense3m: number;
  trendDirection: "up" | "down" | "flat";
}

export interface Rule503020Target {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
}

export interface Rule503020Analysis {
  monthKey: string;
  totalIncome: number;
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  actualNeedsPct: number;
  actualWantsPct: number;
  actualSavingsPct: number;
  target: Rule503020Target;
  statusMessage: string;
  isBalanced: boolean;
}

export interface FinancialHealthReport {
  score: number;
  grade: "A" | "B" | "C" | "D";
  savingsRatePct: number;
  emergencyRunwayMonths: number;
  projectedMonthExpense: number;
  projectedEndOfMonthBalance: number;
  tips: string[];
}

function toUtcDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/**
 * Tính báo cáo so sánh các tháng (biểu đồ cột) & xu hướng chi tiêu (Tính năng mở rộng #6).
 */
export function calculateMonthlyComparisonAndTrend(
  transactions: TransactionRecordLike[],
  referenceDate: Date = new Date(),
  monthsCount = 6
): MonthlyTrendReport {
  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  const bucketMap = new Map<string, MonthlyComparisonPoint>();
  const orderedKeys: string[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(refYear, refMonth - i, 1));
    const key = formatYearMonth(d);
    const label = `T${d.getUTCMonth() + 1}/${String(d.getUTCFullYear()).slice(-2)}`;
    orderedKeys.push(key);
    bucketMap.set(key, {
      monthKey: key,
      label,
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  for (const tx of transactions) {
    const d = toUtcDate(tx.date);
    if (Number.isNaN(d.getTime())) continue;
    const key = formatYearMonth(d);
    const point = bucketMap.get(key);
    if (!point) continue;

    if (tx.type === "INCOME") {
      point.income += tx.amount;
    } else {
      point.expense += tx.amount;
    }
    point.net = point.income - point.expense;
  }

  const months = orderedKeys.map((k) => bucketMap.get(k)!);
  const currentMonthExpense = months[months.length - 1]?.expense ?? 0;
  const previousMonthExpense = months[months.length - 2]?.expense ?? 0;

  let expenseChangePct: number | null = null;
  let trendDirection: "up" | "down" | "flat" = "flat";

  if (previousMonthExpense > 0) {
    expenseChangePct =
      Math.round(
        ((currentMonthExpense - previousMonthExpense) / previousMonthExpense) *
          1000
      ) / 10;
    if (expenseChangePct > 2) trendDirection = "up";
    else if (expenseChangePct < -2) trendDirection = "down";
  } else if (currentMonthExpense > 0) {
    trendDirection = "up";
  }

  const recent3 = months.slice(-3);
  const avgMonthlyExpense3m =
    recent3.length > 0
      ? Math.round(
          recent3.reduce((sum, item) => sum + item.expense, 0) / recent3.length
        )
      : 0;

  return {
    months,
    currentMonthExpense,
    previousMonthExpense,
    expenseChangePct,
    avgMonthlyExpense3m,
    trendDirection,
  };
}

/**
 * Phân tích phân bổ thu nhập theo Quy tắc 50/30/20 (Tính năng mở rộng #9 - Tự chọn).
 */
export function analyze503020Rule(
  transactions: TransactionRecordLike[],
  target: Rule503020Target = { needsPct: 50, wantsPct: 30, savingsPct: 20 },
  referenceDate: Date = new Date()
): Rule503020Analysis {
  const monthKey = formatYearMonth(referenceDate);

  let totalIncome = 0;
  let needsAmount = 0;
  let wantsAmount = 0;
  let investmentExpense = 0;

  for (const tx of transactions) {
    const d = toUtcDate(tx.date);
    if (Number.isNaN(d.getTime()) || formatYearMonth(d) !== monthKey) continue;

    if (tx.type === "INCOME") {
      totalIncome += tx.amount;
    } else {
      const bucket = CATEGORY_META[tx.category].ruleBucket;
      if (bucket === "needs") needsAmount += tx.amount;
      else if (bucket === "wants") wantsAmount += tx.amount;
      else investmentExpense += tx.amount;
    }
  }

  const totalOutflow = needsAmount + wantsAmount + investmentExpense;
  const retainedCash = Math.max(0, totalIncome - totalOutflow);
  const savingsAmount = investmentExpense + retainedCash;

  const denominator = totalIncome > 0 ? totalIncome : totalOutflow;
  const pct = (val: number) =>
    denominator > 0 ? Math.round((val / denominator) * 1000) / 10 : 0;

  const actualNeedsPct = pct(needsAmount);
  const actualWantsPct = pct(wantsAmount);
  const actualSavingsPct = pct(savingsAmount);

  const isBalanced =
    totalIncome > 0 &&
    actualNeedsPct <= target.needsPct + 5 &&
    actualWantsPct <= target.wantsPct + 5 &&
    actualSavingsPct >= target.savingsPct - 5;

  let statusMessage = "Chưa có dữ liệu thu nhập trong tháng này để phân tích.";
  if (totalIncome > 0) {
    if (isBalanced) {
      statusMessage = "Cơ cấu chi tiêu tháng này đang cân đối tốt theo mục tiêu đề ra.";
    } else if (actualWantsPct > target.wantsPct + 5) {
      statusMessage = `Chi tiêu Mong muốn (${actualWantsPct}%) đang vượt mục tiêu (${target.wantsPct}%).`;
    } else if (actualNeedsPct > target.needsPct + 5) {
      statusMessage = `Chi tiêu Thiết yếu (${actualNeedsPct}%) đang cao hơn ngưỡng (${target.needsPct}%).`;
    } else {
      statusMessage = `Tỷ lệ Tích lũy (${actualSavingsPct}%) chưa đạt mục tiêu (${target.savingsPct}%).`;
    }
  }

  return {
    monthKey,
    totalIncome,
    needsAmount,
    wantsAmount,
    savingsAmount,
    actualNeedsPct,
    actualWantsPct,
    actualSavingsPct,
    target,
    statusMessage,
    isBalanced,
  };
}

/**
 * Tính Điểm Sức khỏe Tài chính & Dự báo cuối tháng (Tính năng mở rộng #10 - Tự chọn).
 */
export function calculateFinancialHealthAndForecast(params: {
  balance: number;
  transactions: TransactionRecordLike[];
  pendingRecurringIncome: number;
  pendingRecurringExpense: number;
  budgetExceededCount: number;
  referenceDate?: Date;
}): FinancialHealthReport {
  const ref = params.referenceDate ?? new Date();
  const monthKey = formatYearMonth(ref);
  const daysInMonth = new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const elapsedDays = Math.max(1, ref.getUTCDate());
  const remainingDays = Math.max(0, daysInMonth - elapsedDays);

  let currentIncome = 0;
  let currentExpense = 0;

  for (const tx of params.transactions) {
    const d = toUtcDate(tx.date);
    if (Number.isNaN(d.getTime()) || formatYearMonth(d) !== monthKey) continue;
    if (tx.type === "INCOME") currentIncome += tx.amount;
    else currentExpense += tx.amount;
  }

  const savingsRatePct =
    currentIncome > 0
      ? Math.round(((currentIncome - currentExpense) / currentIncome) * 1000) / 10
      : 0;

  const trend = calculateMonthlyComparisonAndTrend(params.transactions, ref, 3);
  const avgExpense = Math.max(1, trend.avgMonthlyExpense3m || currentExpense);
  const emergencyRunwayMonths =
    params.balance > 0
      ? Math.round((params.balance / avgExpense) * 10) / 10
      : 0;

  const dailyAvgExpense = currentExpense / elapsedDays;
  const projectedRemainingSpend = Math.round(dailyAvgExpense * remainingDays);
  const projectedMonthExpense =
    currentExpense + projectedRemainingSpend + params.pendingRecurringExpense;

  const projectedEndOfMonthBalance =
    params.balance +
    params.pendingRecurringIncome -
    projectedRemainingSpend -
    params.pendingRecurringExpense;

  let score = 40;
  if (params.balance > 0) score += 15;
  if (savingsRatePct >= 20) score += 25;
  else if (savingsRatePct >= 10) score += 15;
  else if (savingsRatePct > 0) score += 5;

  if (emergencyRunwayMonths >= 6) score += 20;
  else if (emergencyRunwayMonths >= 3) score += 12;
  else if (emergencyRunwayMonths >= 1) score += 5;

  score -= Math.min(20, params.budgetExceededCount * 10);
  score = Math.max(0, Math.min(100, score));

  const grade: "A" | "B" | "C" | "D" =
    score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "D";

  const tips: string[] = [];
  if (savingsRatePct < 20) {
    tips.push("Cố gắng nâng tỷ lệ tiết kiệm tháng lên tối thiểu 20% thu nhập.");
  }
  if (emergencyRunwayMonths < 3) {
    tips.push("Quỹ dự phòng hiện dưới 3 tháng chi tiêu trung bình, nên ưu tiên tích lũy.");
  }
  if (params.budgetExceededCount > 0) {
    tips.push(
      `Có ${params.budgetExceededCount} danh mục đã vượt hạn mức ngân sách tháng này.`
    );
  }
  if (tips.length === 0) {
    tips.push("Sức khỏe tài chính ổn định, tiếp tục duy trì kỷ luật thu chi hiện tại!");
  }

  return {
    score,
    grade,
    savingsRatePct,
    emergencyRunwayMonths,
    projectedMonthExpense,
    projectedEndOfMonthBalance,
    tips,
  };
}
