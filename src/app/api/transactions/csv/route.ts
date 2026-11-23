import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import {
  parseAndValidateCsvTransactions,
  serializeTransactionsToCsv,
} from "@/lib/csv";
import { buildTransactionWhereClause, parseFilterParams } from "@/lib/filters";
import { prisma } from "@/lib/prisma";
import { evaluateAndPersistMilestones } from "@/lib/server-sync";

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
      select: {
        date: true,
        type: true,
        category: true,
        amount: true,
        description: true,
      },
    });

    const csv = serializeTransactionsToCsv(transactions);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finance-planner-transactions.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Không thể xuất tệp CSV." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();

    let csvText = "";
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json(
          { ok: false, error: "Vui lòng chọn tệp .csv hợp lệ." },
          { status: 400 }
        );
      }
      if (file.size > 1_000_000) {
        return NextResponse.json(
          { ok: false, error: "Kích thước tệp CSV tối đa 1MB." },
          { status: 400 }
        );
      }
      csvText = await file.text();
    } else {
      const body = (await request.json().catch(() => null)) as {
        csv?: unknown;
      } | null;
      if (!body || typeof body.csv !== "string") {
        return NextResponse.json(
          { ok: false, error: "Thiếu nội dung CSV cần nhập." },
          { status: 400 }
        );
      }
      csvText = body.csv;
    }

    const { validRows, errors } = parseAndValidateCsvTransactions(csvText);
    if (validRows.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: errors[0]?.message ?? "Không có dòng hợp lệ nào trong tệp CSV.",
          errors,
        },
        { status: 400 }
      );
    }

    const created = await prisma.transaction.createMany({
      data: validRows.map((row) => ({
        userId: user.id,
        date: row.date,
        type: row.type,
        category: row.category,
        amount: row.amount,
        description: row.description,
        originalCurrency: "VND",
      })),
    });

    const newMilestones = await evaluateAndPersistMilestones(user.id);
    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      importedCount: created.count,
      skippedCount: errors.length,
      errors,
      newMilestones,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Không thể nhập tệp CSV." },
      { status: 500 }
    );
  }
}
