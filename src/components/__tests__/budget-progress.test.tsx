import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BudgetStatusCard } from "../dashboard/budget-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/actions/budget-actions", () => ({
  upsertBudgetAction: vi.fn(),
  deleteBudgetAction: vi.fn(),
  updateRule503020Action: vi.fn(),
}));

describe("BudgetStatusCard component", () => {
  it("hiển thị cảnh báo >=80% và vượt 100% đúng theo mức chi tiêu", () => {
    const { rerender } = render(
      <BudgetStatusCard
        item={{
          id: "b1",
          category: "FOOD",
          month: "2026-11",
          spentAmount: 850_000,
          limitAmount: 1_000_000,
          remainingAmount: 150_000,
          percentage: 85,
          alertLevel: "WARNING_80",
        }}
      />
    );

    expect(screen.getByText("Ăn uống")).toBeInTheDocument();
    expect(screen.getByText(/Cảnh báo ≥80%/i)).toBeInTheDocument();

    rerender(
      <BudgetStatusCard
        item={{
          id: "b2",
          category: "SHOPPING",
          month: "2026-11",
          spentAmount: 2_400_000,
          limitAmount: 2_000_000,
          remainingAmount: -400_000,
          percentage: 120,
          alertLevel: "EXCEEDED_100",
        }}
      />
    );

    expect(screen.getByText("Mua sắm")).toBeInTheDocument();
    expect(screen.getByText(/Vượt 100%/i)).toBeInTheDocument();
    expect(screen.getByText(/Đã vượt hạn mức/i)).toBeInTheDocument();
  });
});
