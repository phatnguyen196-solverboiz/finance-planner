import type { CategoryValue } from "./constants";

export type BudgetAlertLevel = "SAFE" | "WARNING_80" | "EXCEEDED_100";

export interface BudgetStatus {
  spentAmount: number;
  limitAmount: number;
  remainingAmount: number;
  percentage: number;
  alertLevel: BudgetAlertLevel;
}

export interface BudgetSummaryItem extends BudgetStatus {
  id: string;
  category: CategoryValue;
  month: string;
}

/**
 * Đánh giá trạng thái ngân sách danh mục và ngưỡng cảnh báo 80% / 100%.
 */
export function calculateBudgetStatus(
  spentAmount: number,
  limitAmount: number
): BudgetStatus {
  const safeSpent = Math.max(0, spentAmount);
  const safeLimit = Math.max(0, limitAmount);

  if (safeLimit === 0) {
    return {
      spentAmount: safeSpent,
      limitAmount: 0,
      remainingAmount: -safeSpent,
      percentage: safeSpent > 0 ? 100 : 0,
      alertLevel: safeSpent > 0 ? "EXCEEDED_100" : "SAFE",
    };
  }

  const percentage = Math.round((safeSpent / safeLimit) * 1000) / 10;
  const remainingAmount = safeLimit - safeSpent;

  let alertLevel: BudgetAlertLevel = "SAFE";
  if (percentage >= 100) {
    alertLevel = "EXCEEDED_100";
  } else if (percentage >= 80) {
    alertLevel = "WARNING_80";
  }

  return {
    spentAmount: safeSpent,
    limitAmount: safeLimit,
    remainingAmount,
    percentage,
    alertLevel,
  };
}
