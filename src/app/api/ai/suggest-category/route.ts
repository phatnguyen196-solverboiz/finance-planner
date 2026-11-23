import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { suggestCategoryWithGemini } from "@/lib/ai-categorizer";
import { requireUser, UnauthorizedError } from "@/lib/dal";
import { aiSuggestSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = aiSuggestSchema.safeParse(body);

    if (!parsed.success) {
      const flat = z.flattenError(parsed.error);
      return NextResponse.json(
        {
          ok: false,
          error:
            flat.fieldErrors.description?.[0] ??
            "Mô tả giao dịch không hợp lệ.",
        },
        { status: 400 }
      );
    }

    const result = await suggestCategoryWithGemini(
      parsed.data.description,
      user.id,
      parsed.data.type
    );

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({
      ok: true,
      ...result.data,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Không thể gợi ý danh mục lúc này." },
      { status: 500 }
    );
  }
}
