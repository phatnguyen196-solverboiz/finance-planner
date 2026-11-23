"use server";

import { revalidatePath } from "next/cache";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import {
  reconcileNotifiedMilestone,
  type MilestoneNotification,
} from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import {
  evaluateAndPersistMilestones,
  getUserBalanceSummary,
} from "@/lib/server-sync";
import {
  entityIdSchema,
  formatZodActionError,
  wishlistItemSchema,
  type ActionResult,
} from "@/lib/validations";

export interface WishlistActionPayload {
  newMilestones: MilestoneNotification[];
}

export async function createWishlistItemAction(
  input: unknown
): Promise<ActionResult<WishlistActionPayload>> {
  try {
    const user = await requireUser();
    const parsed = wishlistItemSchema.safeParse(input);
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const { name, cost, priority, targetDate } = parsed.data;

    await prisma.wishlistItem.create({
      data: {
        userId: user.id,
        name,
        cost,
        priority,
        targetDate: targetDate ? new Date(`${targetDate}T12:00:00.000Z`) : null,
      },
    });

    const newMilestones = await evaluateAndPersistMilestones(user.id);
    revalidatePath("/");

    return {
      ok: true,
      message: "Đã thêm món đồ vào Wishlist.",
      data: { newMilestones },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể thêm món Wishlist." };
  }
}

export async function updateWishlistItemAction(
  id: string,
  input: unknown
): Promise<ActionResult<WishlistActionPayload>> {
  try {
    const user = await requireUser();
    const parsedId = entityIdSchema.safeParse(id);
    if (!parsedId.success) {
      return { ok: false, message: "Thiếu mã món Wishlist hợp lệ." };
    }

    const parsed = wishlistItemSchema.safeParse(input);
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const { name, cost, priority, targetDate } = parsed.data;

    const [existing, { balance }] = await Promise.all([
      prisma.wishlistItem.findFirst({
        where: { id: parsedId.data, userId: user.id },
        select: { notifiedMilestone: true },
      }),
      getUserBalanceSummary(user.id),
    ]);

    if (!existing) {
      return {
        ok: false,
        message: "Không tìm thấy món Wishlist hoặc bạn không có quyền sửa.",
      };
    }

    const nextNotifiedMilestone = reconcileNotifiedMilestone(
      existing.notifiedMilestone,
      balance,
      cost
    );

    const result = await prisma.wishlistItem.updateMany({
      where: { id: parsedId.data, userId: user.id },
      data: {
        name,
        cost,
        priority,
        targetDate: targetDate ? new Date(`${targetDate}T12:00:00.000Z`) : null,
        notifiedMilestone: nextNotifiedMilestone,
      },
    });

    if (result.count === 0) {
      return {
        ok: false,
        message: "Không tìm thấy món Wishlist hoặc bạn không có quyền sửa.",
      };
    }

    const newMilestones = await evaluateAndPersistMilestones(user.id);
    revalidatePath("/");

    return {
      ok: true,
      message: "Đã cập nhật món Wishlist.",
      data: { newMilestones },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể cập nhật món Wishlist." };
  }
}

export async function deleteWishlistItemAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsedId = entityIdSchema.safeParse(id);
    if (!parsedId.success) {
      return { ok: false, message: "Thiếu mã món Wishlist hợp lệ." };
    }

    const result = await prisma.wishlistItem.deleteMany({
      where: { id: parsedId.data, userId: user.id },
    });

    if (result.count === 0) {
      return {
        ok: false,
        message: "Không tìm thấy món Wishlist hoặc bạn không có quyền xoá.",
      };
    }

    revalidatePath("/");
    return { ok: true, message: "Đã xoá món khỏi Wishlist." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể xoá món Wishlist." };
  }
}
