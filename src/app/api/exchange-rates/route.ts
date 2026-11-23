import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/currency";
import { requireUser, UnauthorizedError } from "@/lib/dal";

export async function GET() {
  try {
    await requireUser();
    const snapshot = await getExchangeRates();
    return NextResponse.json({
      ok: true,
      ...snapshot,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { ok: false, error: "Không thể lấy tỷ giá ngoại tệ." },
      { status: 500 }
    );
  }
}
