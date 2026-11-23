import { describe, expect, it } from "vitest";
import {
  buildTransactionWhereClause,
  getDateRangeForPeriod,
  parseFilterParams,
} from "../filters";

describe("URL Filters & Date Ranges", () => {
  it("tính đúng khoảng đầu/cuối tháng cho this-month", () => {
    const ref = new Date("2026-11-15T10:00:00.000Z");
    const range = getDateRangeForPeriod("this-month", ref);
    expect(range).toBeDefined();
    expect(range?.gte.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(range?.lte.toISOString()).toBe("2026-11-30T23:59:59.999Z");
  });

  it("xử lý đúng last-month khi giao cắt đầu năm (tháng 1 -> tháng 12 năm trước)", () => {
    const jan = new Date("2026-01-10T10:00:00.000Z");
    const range = getDateRangeForPeriod("last-month", jan);
    expect(range).toBeDefined();
    expect(range?.gte.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(range?.lte.toISOString()).toBe("2025-12-31T23:59:59.999Z");
  });

  it("trả về undefined khi period là all", () => {
    expect(getDateRangeForPeriod("all")).toBeUndefined();
  });

  it("chuẩn hóa an toàn các searchParams không hợp lệ trên URL", () => {
    const parsed = parseFilterParams({
      period: "invalid-period",
      category: "food",
      type: "UNKNOWN",
      q: "  cà phê  ",
    });

    expect(parsed).toEqual({
      period: "all",
      category: "FOOD",
      type: "ALL",
      q: "cà phê",
    });
  });

  it("luôn gắn userId và áp dụng điều kiện lọc vào mệnh đề Prisma where", () => {
    const ref = new Date("2026-11-15T12:00:00.000Z");
    const where = buildTransactionWhereClause(
      "user-123",
      {
        period: "this-month",
        category: "FOOD",
        type: "EXPENSE",
        q: "bún bò",
      },
      ref
    );

    expect(where.userId).toBe("user-123");
    expect(where.category).toBe("FOOD");
    expect(where.type).toBe("EXPENSE");
    expect(where.date?.gte.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(where.description).toEqual({
      contains: "bún bò",
      mode: "insensitive",
    });
  });
});
