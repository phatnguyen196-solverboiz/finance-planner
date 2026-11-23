import { beforeEach, describe, expect, it } from "vitest";
import {
  checkAiRateLimit,
  clearAiRateLimitForTest,
  sanitizeDescriptionForAi,
} from "../ai-categorizer";
import { calculateBudgetStatus } from "../budget";
import {
  parseAndValidateCsvTransactions,
  serializeTransactionsToCsv,
} from "../csv";
import {
  convertToVndInt,
  isRateCacheFresh,
  RATE_CACHE_TTL_MS,
} from "../currency";
import {
  analyze503020Rule,
  calculateFinancialHealthAndForecast,
  calculateMonthlyComparisonAndTrend,
} from "../financial-insights";
import {
  buildRecurringTransactionDate,
  shouldGenerateRecurringForMonth,
} from "../recurring";

describe("Extended features core logic", () => {
  beforeEach(() => {
    clearAiRateLimitForTest();
  });

  it("phân loại đúng 3 ngưỡng cảnh báo ngân sách (<80%, >=80%, >=100%)", () => {
    expect(calculateBudgetStatus(500_000, 1_000_000).alertLevel).toBe("SAFE");
    expect(calculateBudgetStatus(800_000, 1_000_000).alertLevel).toBe("WARNING_80");
    expect(calculateBudgetStatus(1_050_000, 1_000_000).alertLevel).toBe(
      "EXCEEDED_100"
    );
  });

  it("không sinh trùng giao dịch định kỳ trong cùng tháng", () => {
    const ref = new Date("2026-11-15T12:00:00.000Z");

    expect(
      shouldGenerateRecurringForMonth(
        { active: true, dayOfMonth: 10, lastGeneratedMonth: null },
        ref
      )
    ).toBe(true);

    expect(
      shouldGenerateRecurringForMonth(
        { active: true, dayOfMonth: 10, lastGeneratedMonth: "2026-11" },
        ref
      )
    ).toBe(false);

    expect(
      shouldGenerateRecurringForMonth(
        { active: true, dayOfMonth: 25, lastGeneratedMonth: null },
        ref,
        false
      )
    ).toBe(false);

    expect(
      shouldGenerateRecurringForMonth(
        { active: true, dayOfMonth: 25, lastGeneratedMonth: null },
        ref,
        true
      )
    ).toBe(true);
  });

  it("tạo ngày hợp lệ cho giao dịch định kỳ và kẹp ngày tối đa là 28", () => {
    const d = buildRecurringTransactionDate("2026-02", 31);
    expect(d.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("xuất CSV đúng định dạng và chống CSV injection", () => {
    const csv = serializeTransactionsToCsv([
      {
        date: "2026-11-15T12:00:00.000Z",
        type: "EXPENSE",
        category: "FOOD",
        amount: 55000,
        description: "=SUM(A1), Cơm trưa \"ngon\"",
      },
    ]);
    expect(csv.startsWith("\uFEFFdate,type,category,amount,description")).toBe(
      true
    );
    expect(csv).toContain("\"'=SUM(A1), Cơm trưa \"\"ngon\"\"\"");
  });

  it("kiểm tra và tách dòng hợp lệ vs dòng lỗi khi nhập CSV", () => {
    const rawCsv = [
      "date,type,category,amount,description",
      "2026-11-15,EXPENSE,FOOD,45000,Bún bò sáng",
      "2026-11-15,EXPENSE,FOOD,-100,Số tiền âm",
      "invalid-date,INCOME,SALARY,15000000,Lương",
    ].join("\n");

    const result = parseAndValidateCsvTransactions(rawCsv);
    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].amount).toBe(45000);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].row).toBe(3);
    expect(result.errors[1].row).toBe(4);
  });

  it("quy đổi USD/EUR sang số nguyên VND và kiểm tra TTL cache 1 giờ", () => {
    const rates = { VND: 1, USD: 25400, EUR: 27400 };
    expect(convertToVndInt(12.5, "USD", rates)).toBe(317500);
    expect(convertToVndInt(10, "EUR", rates)).toBe(274000);

    const fetchedAt = 1_000_000;
    expect(isRateCacheFresh(fetchedAt, fetchedAt + RATE_CACHE_TTL_MS - 1)).toBe(
      true
    );
    expect(isRateCacheFresh(fetchedAt, fetchedAt + RATE_CACHE_TTL_MS)).toBe(
      false
    );
  });

  it("ẩn dữ liệu cá nhân (PII) trước khi gửi mô tả sang Gemini API", () => {
    const dirty =
      "Chuyển tiền cho an.nguyen@gmail.com sdt 0912345678 stk 1903344556677 https://bank.vn/pay";
    const clean = sanitizeDescriptionForAi(dirty);
    expect(clean).not.toContain("an.nguyen@gmail.com");
    expect(clean).not.toContain("0912345678");
    expect(clean).not.toContain("1903344556677");
    expect(clean).not.toContain("https://bank.vn/pay");
  });

  it("áp dụng giới hạn tần suất gọi AI (rate limit) theo userId", () => {
    const baseTime = 1_700_000_000_000;
    for (let i = 0; i < 10; i++) {
      expect(checkAiRateLimit("u1", baseTime + i * 100).allowed).toBe(true);
    }
    const blocked = checkAiRateLimit("u1", baseTime + 2000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("tổng hợp so sánh thu chi 6 tháng và phần trăm thay đổi chi tiêu", () => {
    const ref = new Date("2026-11-15T12:00:00.000Z");
    const report = calculateMonthlyComparisonAndTrend(
      [
        {
          amount: 10_000_000,
          type: "INCOME",
          category: "SALARY",
          date: "2026-10-05T12:00:00.000Z",
        },
        {
          amount: 4_000_000,
          type: "EXPENSE",
          category: "FOOD",
          date: "2026-10-12T12:00:00.000Z",
        },
        {
          amount: 5_000_000,
          type: "EXPENSE",
          category: "BILLS",
          date: "2026-11-10T12:00:00.000Z",
        },
      ],
      ref,
      6
    );

    expect(report.months).toHaveLength(6);
    expect(report.previousMonthExpense).toBe(4_000_000);
    expect(report.currentMonthExpense).toBe(5_000_000);
    expect(report.expenseChangePct).toBe(25);
    expect(report.trendDirection).toBe("up");
  });

  it("phân tích chính xác quy tắc phân bổ 50/30/20", () => {
    const ref = new Date("2026-11-15T12:00:00.000Z");
    const analysis = analyze503020Rule(
      [
        { amount: 20_000_000, type: "INCOME", category: "SALARY", date: ref },
        { amount: 9_000_000, type: "EXPENSE", category: "FOOD", date: ref },
        { amount: 5_000_000, type: "EXPENSE", category: "SHOPPING", date: ref },
        { amount: 2_000_000, type: "EXPENSE", category: "INVESTMENT", date: ref },
      ],
      { needsPct: 50, wantsPct: 30, savingsPct: 20 },
      ref
    );

    expect(analysis.actualNeedsPct).toBe(45);
    expect(analysis.actualWantsPct).toBe(25);
    expect(analysis.actualSavingsPct).toBe(30); // 2M đầu tư + 4M tiền dư
    expect(analysis.isBalanced).toBe(true);
  });

  it("tính điểm sức khỏe tài chính, runway và dự báo cuối tháng", () => {
    const ref = new Date("2026-11-15T12:00:00.000Z");
    const report = calculateFinancialHealthAndForecast({
      balance: 30_000_000,
      transactions: [
        { amount: 20_000_000, type: "INCOME", category: "SALARY", date: ref },
        { amount: 6_000_000, type: "EXPENSE", category: "FOOD", date: ref },
      ],
      pendingRecurringIncome: 0,
      pendingRecurringExpense: 1_000_000,
      budgetExceededCount: 0,
      referenceDate: ref,
    });

    expect(report.savingsRatePct).toBe(70);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.grade).toBe("A");
    expect(report.projectedMonthExpense).toBe(13_000_000);
    expect(report.projectedEndOfMonthBalance).toBe(23_000_000);
  });
});
