import { describe, expect, it } from "vitest";
import {
  budgetSchema,
  entityIdSchema,
  loginSchema,
  recurringRuleSchema,
  rule503020Schema,
  toggleRecurringRuleSchema,
  transactionSchema,
  wishlistItemSchema,
} from "../validations";

describe("Zod 4 validation schemas", () => {
  it("từ chối số tiền VND không phải số nguyên dương", () => {
    const res = transactionSchema.safeParse({
      amount: 12500.5,
      currency: "VND",
      description: "Cà phê sáng",
      type: "EXPENSE",
      category: "FOOD",
      date: "2026-11-15",
    });
    expect(res.success).toBe(false);
  });

  it("cho phép nhập số thập phân với ngoại tệ USD/EUR", () => {
    const res = transactionSchema.safeParse({
      amount: 19.99,
      currency: "USD",
      description: "Mua tên miền",
      type: "EXPENSE",
      category: "BILLS",
      date: "2026-11-15",
    });
    expect(res.success).toBe(true);
  });

  it("từ chối mô tả rỗng hoặc vượt quá 120 ký tự", () => {
    const empty = transactionSchema.safeParse({
      amount: 50000,
      currency: "VND",
      description: "   ",
      type: "EXPENSE",
      category: "FOOD",
      date: "2026-11-15",
    });
    expect(empty.success).toBe(false);

    const tooLong = transactionSchema.safeParse({
      amount: 50000,
      currency: "VND",
      description: "a".repeat(121),
      type: "EXPENSE",
      category: "FOOD",
      date: "2026-11-15",
    });
    expect(tooLong.success).toBe(false);
  });

  it("kiểm tra wishlistItemSchema với hạn chót tuỳ chọn", () => {
    const valid = wishlistItemSchema.safeParse({
      name: "Laptop mới",
      cost: 25000000,
      priority: "HIGH",
      targetDate: "2027-06-30",
    });
    expect(valid.success).toBe(true);

    const invalidDate = wishlistItemSchema.safeParse({
      name: "Laptop mới",
      cost: 25000000,
      priority: "HIGH",
      targetDate: "30/06/2027",
    });
    expect(invalidDate.success).toBe(false);
  });

  it("kiểm tra budgetSchema đúng định dạng tháng YYYY-MM và hạn mức dương", () => {
    expect(
      budgetSchema.safeParse({
        category: "FOOD",
        month: "2026-11",
        limitAmount: 3000000,
      }).success
    ).toBe(true);

    expect(
      budgetSchema.safeParse({
        category: "FOOD",
        month: "2026-13",
        limitAmount: 3000000,
      }).success
    ).toBe(false);
  });

  it("kiểm tra recurringRuleSchema giới hạn ngày từ 1 đến 28", () => {
    expect(
      recurringRuleSchema.safeParse({
        title: "Tiền trọ",
        amount: 4500000,
        type: "EXPENSE",
        category: "BILLS",
        dayOfMonth: 28,
      }).success
    ).toBe(true);

    expect(
      recurringRuleSchema.safeParse({
        title: "Tiền trọ",
        amount: 4500000,
        type: "EXPENSE",
        category: "BILLS",
        dayOfMonth: 31,
      }).success
    ).toBe(false);
  });

  it("kiểm tra tổng tỷ lệ quy tắc 50/30/20 phải bằng 100 và login email hợp lệ", () => {
    expect(
      rule503020Schema.safeParse({ needsPct: 50, wantsPct: 30, savingsPct: 20 })
        .success
    ).toBe(true);
    expect(
      rule503020Schema.safeParse({ needsPct: 60, wantsPct: 30, savingsPct: 20 })
        .success
    ).toBe(false);

    expect(
      loginSchema.safeParse({ email: "sai-dinh-dang", password: "123" }).success
    ).toBe(false);
  });

  it("kiểm tra entityIdSchema và toggleRecurringRuleSchema cho thao tác sửa/xoá/bật-tắt", () => {
    expect(entityIdSchema.safeParse("").success).toBe(false);
    expect(entityIdSchema.safeParse("   ").success).toBe(false);
    expect(entityIdSchema.safeParse("tx_123").success).toBe(true);

    expect(
      toggleRecurringRuleSchema.safeParse({ id: "rule_1", active: false }).success
    ).toBe(true);
    expect(
      toggleRecurringRuleSchema.safeParse({ id: "  ", active: true }).success
    ).toBe(false);
  });
});
