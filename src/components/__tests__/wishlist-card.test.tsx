import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WishlistItemCard } from "../dashboard/wishlist-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/actions/wishlist-actions", () => ({
  createWishlistItemAction: vi.fn(),
  updateWishlistItemAction: vi.fn(),
  deleteWishlistItemAction: vi.fn(),
}));

describe("WishlistItemCard component", () => {
  it("hiển thị thanh tiến độ đúng phần trăm và gợi ý tiết kiệm hàng tháng", () => {
    render(
      <WishlistItemCard
        balance={12_000_000}
        item={{
          id: "wish-1",
          name: "Laptop học tập",
          cost: 24_000_000,
          priority: "HIGH",
          targetDate: "2027-02-28T12:00:00.000Z",
          notifiedMilestone: 0,
        }}
      />
    );

    expect(screen.getByText("Laptop học tập")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /Tiến độ cho Laptop học tập/i })
    ).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText(/Gợi ý để dành/i)).toBeInTheDocument();
  });

  it("kẹp tiến độ về 0% khi số dư hiện tại bị âm", () => {
    render(
      <WishlistItemCard
        balance={-2_000_000}
        item={{
          id: "wish-2",
          name: "Tai nghe mới",
          cost: 5_000_000,
          priority: "LOW",
          targetDate: null,
          notifiedMilestone: 0,
        }}
      />
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: /Tiến độ cho Tai nghe mới/i })
    ).toHaveAttribute("aria-valuenow", "0");
  });
});
