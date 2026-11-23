import { NextRequest, NextResponse } from "next/server";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import { buildTransactionWhereClause, parseFilterParams } from "@/lib/filters";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const searchParams = Object.fromEntries(
      request.nextUrl.searchParams.entries()
    );
    const filters = parseFilterParams(searchParams);
    const where = buildTransactionWhereClause(user.id, filters);

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      ok: true,
      count: transactions.length,
      filters,
      transactions,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Không thể tải danh sách giao dịch." },
      { status: 500 }
    );
  }
}
