export const MILESTONE_THRESHOLDS = [50, 75, 100] as const;
export type MilestoneThreshold = (typeof MILESTONE_THRESHOLDS)[number];

export interface WishlistProgressInput {
  id: string;
  name: string;
  cost: number;
  notifiedMilestone: number;
  targetDate?: Date | string | null;
}

export interface MilestoneNotification {
  itemId: string;
  itemName: string;
  milestone: MilestoneThreshold;
  message: string;
}

export interface SavingsGoalPlan {
  remainingAmount: number;
  monthsRemaining: number;
  monthlySuggested: number;
  isOverdue: boolean;
  isCompleted: boolean;
}

/**
 * Tính phần trăm tiến độ tiết kiệm giới hạn trong [0, 100].
 * Số dư âm hoặc giá <= 0 trả về 0%.
 */
export function calculateWishlistProgress(balance: number, cost: number): number {
  if (cost <= 0 || balance <= 0) {
    return 0;
  }
  const raw = (balance / cost) * 100;
  return Math.min(100, Math.round(raw * 10) / 10);
}

/**
 * Xác định mốc cao nhất đã đạt (100, 75, 50 hoặc 0).
 */
export function getHighestReachedMilestone(
  balance: number,
  cost: number
): MilestoneThreshold | 0 {
  if (cost <= 0 || balance <= 0) {
    return 0;
  }
  const pct = (balance / cost) * 100;
  if (pct >= 100) return 100;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  return 0;
}

/**
 * Điều chỉnh lại mốc đã thông báo khi giá món đồ thay đổi:
 * nếu tăng giá làm tiến độ tụt xuống dưới mốc cũ thì hạ về mốc hiện đạt để sau này vượt lại sẽ báo tiếp.
 */
export function reconcileNotifiedMilestone(
  previousNotified: number,
  balance: number,
  newCost: number
): number {
  const reached = getHighestReachedMilestone(balance, newCost);
  return Math.min(Math.max(0, previousNotified), reached);
}

/**
 * Sinh danh sách toast chúc mừng cho các món wishlist vừa vượt mốc mới,
 * bỏ qua những mốc đã thông báo trước đó (notifiedMilestone).
 */
export function evaluateWishlistMilestones(
  balance: number,
  items: WishlistProgressInput[]
): MilestoneNotification[] {
  const notifications: MilestoneNotification[] = [];

  for (const item of items) {
    const highest = getHighestReachedMilestone(balance, item.cost);
    if (highest !== 0 && highest > item.notifiedMilestone) {
      const message =
        highest === 100
          ? `Chúc mừng! Bạn đã tiết kiệm được 100% cho ${item.name}!`
          : `Bạn đã tiết kiệm được ${highest}% cho ${item.name}!`;

      notifications.push({
        itemId: item.id,
        itemName: item.name,
        milestone: highest,
        message,
      });
    }
  }

  return notifications;
}

/**
 * Tính kế hoạch để dành mỗi tháng cho mục tiêu có hạn chót (Tính năng mở rộng #5).
 */
export function calculateSavingsGoalPlan(
  balance: number,
  cost: number,
  targetDate: Date | string | null | undefined,
  referenceDate: Date = new Date()
): SavingsGoalPlan | null {
  if (!targetDate) return null;

  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate;
  if (Number.isNaN(target.getTime())) return null;

  const effectiveBalance = Math.max(0, balance);
  const remainingAmount = Math.max(0, cost - effectiveBalance);
  const isCompleted = remainingAmount === 0;

  const yearDiff = target.getUTCFullYear() - referenceDate.getUTCFullYear();
  const monthDiff = target.getUTCMonth() - referenceDate.getUTCMonth();
  const rawMonthSpan = yearDiff * 12 + monthDiff;

  const isOverdue = !isCompleted && target.getTime() < referenceDate.getTime() && rawMonthSpan < 0;
  const monthsRemaining = Math.max(1, rawMonthSpan + 1);
  const monthlySuggested = isCompleted
    ? 0
    : Math.ceil(remainingAmount / monthsRemaining);

  return {
    remainingAmount,
    monthsRemaining: isOverdue ? 0 : monthsRemaining,
    monthlySuggested,
    isOverdue,
    isCompleted,
  };
}
