"use server";

import { revalidatePath } from "next/cache";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import {
  budgetSchema,
  entityIdSchema,
  formatZodActionError,
  rule503020Schema,
  type ActionResult,
} from "@/lib/validations";

export async function upsertBudgetAction(
  input: unknown
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = budgetSchema.safeParse(input);
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const { category, month, limitAmount } = parsed.data;

    const existing = await prisma.categoryBudget.findUnique({
      where: {
        userId_category_month: {
          userId: user.id,
          category,
          month,
        },
      },
    });

    if (existing) {
      const updated = await prisma.categoryBudget.updateMany({
        where: { id: existing.id, userId: user.id },
        data: { limitAmount },
      });
      if (updated.count === 0) {
        return { ok: false, message: "Không thể cập nhật ngân sách." };
      }
    } else {
      await prisma.categoryBudget.create({
        data: {
          userId: user.id,
          category,
          month,
          limitAmount,
        },
      });
    }

    revalidatePath("/");
    return { ok: true, message: "Đã lưu hạn mức ngân sách tháng." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể lưu ngân sách." };
  }
}

export async function deleteBudgetAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsedId = entityIdSchema.safeParse(id);
    if (!parsedId.success) {
      return { ok: false, message: "Thiếu mã ngân sách hợp lệ." };
    }

    const result = await prisma.categoryBudget.deleteMany({
      where: { id: parsedId.data, userId: user.id },
    });

    if (result.count === 0) {
      return {
        ok: false,
        message: "Không tìm thấy ngân sách hoặc bạn không có quyền xoá.",
      };
    }

    revalidatePath("/");
    return { ok: true, message: "Đã xoá ngân sách danh mục." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể xoá ngân sách." };
  }
}

export async function updateRule503020Action(
  input: unknown
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = rule503020Schema.safeParse(input);
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const result = await prisma.user.updateMany({
      where: { id: user.id },
      data: {
        ruleNeedsPct: parsed.data.needsPct,
        ruleWantsPct: parsed.data.wantsPct,
        ruleSavingsPct: parsed.data.savingsPct,
      },
    });

    if (result.count === 0) {
      return { ok: false, message: "Không tìm thấy tài khoản người dùng." };
    }

    revalidatePath("/");
    return { ok: true, message: "Đã cập nhật tỷ lệ mục tiêu 50/30/20." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể cập nhật tỷ lệ phân bổ." };
  }
}
