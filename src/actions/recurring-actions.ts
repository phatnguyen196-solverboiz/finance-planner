"use server";

import { revalidatePath } from "next/cache";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import type { MilestoneNotification } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import {
  evaluateAndPersistMilestones,
  syncDueRecurringRulesForUser,
} from "@/lib/server-sync";
import {
  entityIdSchema,
  formatZodActionError,
  recurringRuleSchema,
  syncRecurringRulesSchema,
  toggleRecurringRuleSchema,
  type ActionResult,
} from "@/lib/validations";

export async function createRecurringRuleAction(
  input: unknown
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = recurringRuleSchema.safeParse(input);
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    await prisma.recurringRule.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        amount: parsed.data.amount,
        type: parsed.data.type,
        category: parsed.data.category,
        dayOfMonth: parsed.data.dayOfMonth,
        active: true,
      },
    });

    revalidatePath("/");
    return { ok: true, message: "Đã tạo quy tắc giao dịch định kỳ." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể tạo giao dịch định kỳ." };
  }
}

export async function toggleRecurringRuleAction(
  id: string,
  active: boolean
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = toggleRecurringRuleSchema.safeParse({ id, active });
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const result = await prisma.recurringRule.updateMany({
      where: { id: parsed.data.id, userId: user.id },
      data: { active: parsed.data.active },
    });

    if (result.count === 0) {
      return { ok: false, message: "Không tìm thấy quy tắc định kỳ." };
    }

    revalidatePath("/");
    return {
      ok: true,
      message: parsed.data.active
        ? "Đã bật lại giao dịch định kỳ."
        : "Đã tạm dừng giao dịch định kỳ.",
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể cập nhật trạng thái." };
  }
}

export async function deleteRecurringRuleAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsedId = entityIdSchema.safeParse(id);
    if (!parsedId.success) {
      return { ok: false, message: "Thiếu mã quy tắc định kỳ hợp lệ." };
    }

    const result = await prisma.recurringRule.deleteMany({
      where: { id: parsedId.data, userId: user.id },
    });

    if (result.count === 0) {
      return { ok: false, message: "Không tìm thấy quy tắc định kỳ." };
    }

    revalidatePath("/");
    return { ok: true, message: "Đã xoá quy tắc giao dịch định kỳ." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể xoá quy tắc định kỳ." };
  }
}

export async function syncRecurringRulesAction(force = false): Promise<
  ActionResult<{ generatedCount: number; newMilestones: MilestoneNotification[] }>
> {
  try {
    const user = await requireUser();
    const parsed = syncRecurringRulesSchema.safeParse({ force });
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const { generatedCount } = await syncDueRecurringRulesForUser(
      user.id,
      parsed.data.force
    );
    const newMilestones = await evaluateAndPersistMilestones(user.id);

    if (generatedCount > 0 || newMilestones.length > 0) {
      revalidatePath("/");
    }

    return {
      ok: true,
      message:
        generatedCount > 0
          ? `Đã tự sinh ${generatedCount} giao dịch định kỳ cho tháng này.`
          : "Không có giao dịch định kỳ mới cần sinh trong tháng này.",
      data: { generatedCount, newMilestones },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể đồng bộ giao dịch định kỳ." };
  }
}
