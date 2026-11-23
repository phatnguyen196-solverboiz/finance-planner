import "server-only";
import { prisma } from "./prisma";
import {
  evaluateWishlistMilestones,
  type MilestoneNotification,
} from "./milestones";
import {
  buildRecurringTransactionDate,
  formatYearMonth,
  shouldGenerateRecurringForMonth,
} from "./recurring";

/**
 * Tính tổng thu, tổng chi và số dư hiện tại của một userId.
 */
export async function getUserBalanceSummary(userId: string): Promise<{
  totalIncome: number;
  totalExpense: number;
  balance: number;
}> {
  const grouped = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId },
    _sum: { amount: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of grouped) {
    if (row.type === "INCOME") {
      totalIncome = row._sum.amount ?? 0;
    } else if (row.type === "EXPENSE") {
      totalExpense = row._sum.amount ?? 0;
    }
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  };
}

/**
 * Kiểm tra các mốc wishlist mới vượt qua (50%, 75%, 100%) và cập nhật DB bằng updateMany theo userId
 * để không lặp lại thông báo ở các lần sau.
 */
export async function evaluateAndPersistMilestones(
  userId: string
): Promise<MilestoneNotification[]> {
  const [{ balance }, items] = await Promise.all([
    getUserBalanceSummary(userId),
    prisma.wishlistItem.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        cost: true,
        notifiedMilestone: true,
        targetDate: true,
      },
    }),
  ]);

  const notifications = evaluateWishlistMilestones(balance, items);

  for (const note of notifications) {
    await prisma.wishlistItem.updateMany({
      where: {
        id: note.itemId,
        userId,
        notifiedMilestone: { lt: note.milestone },
      },
      data: {
        notifiedMilestone: note.milestone,
      },
    });
  }

  return notifications;
}

/**
 * Tự động sinh giao dịch định kỳ đến hạn trong tháng hiện tại (idempotent theo tháng & userId).
 */
export async function syncDueRecurringRulesForUser(
  userId: string,
  force = false,
  referenceDate: Date = new Date()
): Promise<{ generatedCount: number }> {
  const rules = await prisma.recurringRule.findMany({
    where: { userId, active: true },
  });

  const currentYearMonth = formatYearMonth(referenceDate);
  let generatedCount = 0;

  for (const rule of rules) {
    if (!shouldGenerateRecurringForMonth(rule, referenceDate, force)) {
      continue;
    }

    // Cập nhật điều kiện trước để tránh sinh trùng nếu có 2 request đồng thời
    const updated = await prisma.recurringRule.updateMany({
      where: {
        id: rule.id,
        userId,
        OR: [
          { lastGeneratedMonth: null },
          { lastGeneratedMonth: { not: currentYearMonth } },
        ],
      },
      data: {
        lastGeneratedMonth: currentYearMonth,
      },
    });

    if (updated.count === 0) {
      continue;
    }

    await prisma.transaction.create({
      data: {
        userId,
        type: rule.type,
        amount: rule.amount,
        description: rule.title,
        category: rule.category,
        date: buildRecurringTransactionDate(currentYearMonth, rule.dayOfMonth),
        originalCurrency: "VND",
        isRecurringGenerated: true,
      },
    });

    generatedCount += 1;
  }

  return { generatedCount };
}
