"use server";

import { revalidatePath } from "next/cache";
import { convertToVndInt, getExchangeRates } from "@/lib/currency";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import type { MilestoneNotification } from "@/lib/milestones";
import { prisma } from "@/lib/prisma";
import { evaluateAndPersistMilestones } from "@/lib/server-sync";
import {
  entityIdSchema,
  formatZodActionError,
  transactionSchema,
  type ActionResult,
} from "@/lib/validations";

export interface TransactionActionPayload {
  newMilestones: MilestoneNotification[];
}

export async function createTransactionAction(
  input: unknown
): Promise<ActionResult<TransactionActionPayload>> {
  try {
    const user = await requireUser();
    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const { amount, currency, description, type, category, date } = parsed.data;
    let amountVnd = Math.round(amount);
    let exchangeRate: number | null = null;
    let rateSource: string | null = null;

    if (currency !== "VND") {
      const snapshot = await getExchangeRates();
      amountVnd = convertToVndInt(amount, currency, snapshot.ratesToVnd);
      exchangeRate = snapshot.ratesToVnd[currency];
      rateSource = snapshot.source;
    }

    await prisma.transaction.create({
      data: {
        userId: user.id,
        type,
        amount: amountVnd,
        description,
        category,
        date: new Date(`${date}T12:00:00.000Z`),
        originalCurrency: currency,
        originalAmount: currency === "VND" ? null : amount,
        exchangeRate,
        rateSource,
      },
    });

    const newMilestones = await evaluateAndPersistMilestones(user.id);
    revalidatePath("/");

    return {
      ok: true,
      message: "Đã thêm giao dịch thành công.",
      data: { newMilestones },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "Không thể thêm giao dịch, vui lòng thử lại.",
    };
  }
}

export async function updateTransactionAction(
  id: string,
  input: unknown
): Promise<ActionResult<TransactionActionPayload>> {
  try {
    const user = await requireUser();
    const parsedId = entityIdSchema.safeParse(id);
    if (!parsedId.success) {
      return { ok: false, message: "Thiếu mã giao dịch hợp lệ." };
    }

    const parsed = transactionSchema.safeParse(input);
    if (!parsed.success) {
      return formatZodActionError(parsed.error);
    }

    const { amount, currency, description, type, category, date } = parsed.data;
    let amountVnd = Math.round(amount);
    let exchangeRate: number | null = null;
    let rateSource: string | null = null;

    if (currency !== "VND") {
      const snapshot = await getExchangeRates();
      amountVnd = convertToVndInt(amount, currency, snapshot.ratesToVnd);
      exchangeRate = snapshot.ratesToVnd[currency];
      rateSource = snapshot.source;
    }

    const result = await prisma.transaction.updateMany({
      where: { id: parsedId.data, userId: user.id },
      data: {
        type,
        amount: amountVnd,
        description,
        category,
        date: new Date(`${date}T12:00:00.000Z`),
        originalCurrency: currency,
        originalAmount: currency === "VND" ? null : amount,
        exchangeRate,
        rateSource,
      },
    });

    if (result.count === 0) {
      return {
        ok: false,
        message: "Không tìm thấy giao dịch hoặc bạn không có quyền sửa.",
      };
    }

    const newMilestones = await evaluateAndPersistMilestones(user.id);
    revalidatePath("/");

    return {
      ok: true,
      message: "Đã cập nhật giao dịch.",
      data: { newMilestones },
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return {
      ok: false,
      message: "Không thể cập nhật giao dịch.",
    };
  }
}

export async function deleteTransactionAction(
  id: string
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsedId = entityIdSchema.safeParse(id);
    if (!parsedId.success) {
      return { ok: false, message: "Thiếu mã giao dịch hợp lệ." };
    }

    const result = await prisma.transaction.deleteMany({
      where: { id: parsedId.data, userId: user.id },
    });

    if (result.count === 0) {
      return {
        ok: false,
        message: "Không tìm thấy giao dịch hoặc bạn không có quyền xoá.",
      };
    }

    revalidatePath("/");
    return { ok: true, message: "Đã xoá giao dịch." };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Không thể xoá giao dịch." };
  }
}
