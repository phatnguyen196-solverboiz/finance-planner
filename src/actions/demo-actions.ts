"use server";

import { revalidatePath } from "next/cache";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { formatYearMonth } from "@/lib/recurring";
import { evaluateAndPersistMilestones } from "@/lib/server-sync";
import type { ActionResult } from "@/lib/validations";

/**
 * Nạp nhanh bộ dữ liệu mẫu cho tài khoản mới tạo để người dùng trải nghiệm ngay các biểu đồ & tính năng.
 */
export async function populateSampleDataAction(): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const existingCount = await prisma.transaction.count({
      where: { userId: user.id },
    });

    if (existingCount > 0) {
      return {
        ok: false,
        message: "Tài khoản đã có giao dịch; nút nạp mẫu chỉ dùng cho tài khoản trống.",
      };
    }

    const now = new Date();
    const currentMonth = formatYearMonth(now);
    const d = (monthsAgo: number, day: number) =>
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, day, 12, 0, 0));

    await prisma.transaction.createMany({
      data: [
        { userId: user.id, type: "INCOME", amount: 18_000_000, description: "Lương tháng hiện tại", category: "SALARY", date: d(0, 5), originalCurrency: "VND" },
        { userId: user.id, type: "EXPENSE", amount: 4_500_000, description: "Tiền thuê trọ", category: "BILLS", date: d(0, 2), originalCurrency: "VND" },
        { userId: user.id, type: "EXPENSE", amount: 2_300_000, description: "Ăn uống & đi chợ", category: "FOOD", date: d(0, 10), originalCurrency: "VND" },
        { userId: user.id, type: "EXPENSE", amount: 650_000, description: "Xăng xe & Grab", category: "TRANSPORT", date: d(0, 11), originalCurrency: "VND" },
        { userId: user.id, type: "EXPENSE", amount: 1_500_000, description: "Mua tai nghe học online", category: "SHOPPING", date: d(0, 12), originalCurrency: "VND" },
        { userId: user.id, type: "INCOME", amount: 17_500_000, description: "Lương tháng trước", category: "SALARY", date: d(1, 5), originalCurrency: "VND" },
        { userId: user.id, type: "EXPENSE", amount: 4_500_000, description: "Tiền thuê trọ tháng trước", category: "BILLS", date: d(1, 2), originalCurrency: "VND" },
        { userId: user.id, type: "EXPENSE", amount: 2_100_000, description: "Chi phí ăn uống tháng trước", category: "FOOD", date: d(1, 14), originalCurrency: "VND" },
      ],
    });

    await prisma.wishlistItem.createMany({
      data: [
        {
          userId: user.id,
          name: "Laptop mới phục vụ học tập",
          cost: 28_000_000,
          priority: "HIGH",
          targetDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 4, 28)),
          notifiedMilestone: 0,
        },
        {
          userId: user.id,
          name: "Ghế công thái học",
          cost: 6_000_000,
          priority: "MEDIUM",
          notifiedMilestone: 0,
        },
      ],
    });

    await prisma.categoryBudget.createMany({
      data: [
        { userId: user.id, category: "FOOD", month: currentMonth, limitAmount: 2_600_000 },
        { userId: user.id, category: "SHOPPING", month: currentMonth, limitAmount: 1_200_000 },
      ],
    });

    await prisma.recurringRule.createMany({
      data: [
        {
          userId: user.id,
          title: "Lương hàng tháng",
          amount: 18_000_000,
          type: "INCOME",
          category: "SALARY",
          dayOfMonth: 5,
          active: true,
          lastGeneratedMonth: currentMonth,
        },
        {
          userId: user.id,
          title: "Tiền thuê trọ",
          amount: 4_500_000,
          type: "EXPENSE",
          category: "BILLS",
          dayOfMonth: 2,
          active: true,
          lastGeneratedMonth: currentMonth,
        },
      ],
    });

    await evaluateAndPersistMilestones(user.id);
    revalidatePath("/");

    return { ok: true, message: "Đã nạp bộ dữ liệu mẫu thành công!" };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể nạp dữ liệu mẫu." };
  }
}
