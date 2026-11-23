import { describe, expect, it } from "vitest";
import {
  calculateSavingsGoalPlan,
  calculateWishlistProgress,
  evaluateWishlistMilestones,
  getHighestReachedMilestone,
  reconcileNotifiedMilestone,
} from "../milestones";

describe("Wishlist Progress & Milestone Notifications", () => {
  it("giới hạn tiến độ trong 0–100% và trả về 0% khi số dư âm", () => {
    expect(calculateWishlistProgress(-5_000_000, 10_000_000)).toBe(0);
    expect(calculateWishlistProgress(0, 10_000_000)).toBe(0);
    expect(calculateWishlistProgress(5_000_000, 10_000_000)).toBe(50);
    expect(calculateWishlistProgress(15_000_000, 10_000_000)).toBe(100);
    expect(calculateWishlistProgress(1_000_000, 0)).toBe(0);
  });

  it("xác định đúng mốc cao nhất 0 / 50 / 75 / 100", () => {
    expect(getHighestReachedMilestone(4_999_999, 10_000_000)).toBe(0);
    expect(getHighestReachedMilestone(5_000_000, 10_000_000)).toBe(50);
    expect(getHighestReachedMilestone(7_500_000, 10_000_000)).toBe(75);
    expect(getHighestReachedMilestone(10_000_000, 10_000_000)).toBe(100);
  });

  it("chỉ thông báo mốc mới vượt qua và không lặp lại mốc đã báo", () => {
    const items = [
      { id: "w1", name: "chiếc laptop mới", cost: 20_000_000, notifiedMilestone: 0 },
      { id: "w2", name: "tai nghe", cost: 10_000_000, notifiedMilestone: 50 },
      { id: "w3", name: "bàn phím", cost: 4_000_000, notifiedMilestone: 100 },
    ];

    const notifications = evaluateWishlistMilestones(11_000_000, items);
    expect(notifications).toHaveLength(2);
    expect(notifications[0]).toMatchObject({
      itemId: "w1",
      milestone: 50,
      message: "Bạn đã tiết kiệm được 50% cho chiếc laptop mới!",
    });
    expect(notifications[1]).toMatchObject({
      itemId: "w2",
      milestone: 100,
    });
  });

  it("chỉ phát 1 thông báo ở mốc cao nhất khi số dư nhảy vọt qua nhiều mốc", () => {
    const items = [
      { id: "w1", name: "máy ảnh", cost: 10_000_000, notifiedMilestone: 0 },
    ];
    const notifications = evaluateWishlistMilestones(12_000_000, items);
    expect(notifications).toHaveLength(1);
    expect(notifications[0].milestone).toBe(100);
  });

  it("tính đúng số tiền gợi ý cần để dành mỗi tháng cho mục tiêu có hạn chót", () => {
    const ref = new Date("2026-11-15T12:00:00.000Z");
    const plan = calculateSavingsGoalPlan(
      6_000_000,
      18_000_000,
      "2027-02-28T12:00:00.000Z",
      ref
    );

    expect(plan).not.toBeNull();
    expect(plan?.remainingAmount).toBe(12_000_000);
    // Tháng 11, 12, 1, 2 => 4 tháng
    expect(plan?.monthsRemaining).toBe(4);
    expect(plan?.monthlySuggested).toBe(3_000_000);
    expect(plan?.isCompleted).toBe(false);
    expect(plan?.isOverdue).toBe(false);
  });

  it("đánh dấu hoàn thành hoặc quá hạn cho mục tiêu có hạn chót", () => {
    const ref = new Date("2026-11-15T12:00:00.000Z");
    const completed = calculateSavingsGoalPlan(
      20_000_000,
      15_000_000,
      "2026-10-01T12:00:00.000Z",
      ref
    );
    expect(completed?.isCompleted).toBe(true);
    expect(completed?.monthlySuggested).toBe(0);

    const overdue = calculateSavingsGoalPlan(
      5_000_000,
      15_000_000,
      "2026-10-01T12:00:00.000Z",
      ref
    );
    expect(overdue?.isOverdue).toBe(true);
    expect(overdue?.remainingAmount).toBe(10_000_000);
  });

  it("điều chỉnh đúng mốc đã báo khi người dùng thay đổi giá món wishlist", () => {
    // Đã báo mốc 75% (số dư 8M / giá cũ 10M), tăng giá lên 20M (tiến độ 40%) -> hạ về 0
    expect(reconcileNotifiedMilestone(75, 8_000_000, 20_000_000)).toBe(0);
    // Đã báo mốc 75% (số dư 8M / giá cũ 10M), tăng giá lên 15M (tiến độ 53.3%) -> hạ về 50
    expect(reconcileNotifiedMilestone(75, 8_000_000, 15_000_000)).toBe(50);
    // Giảm giá từ 20M (mốc cũ 0) xuống 10M (tiến độ 80%) -> giữ 0 để kích hoạt toast mốc 75%
    expect(reconcileNotifiedMilestone(0, 8_000_000, 10_000_000)).toBe(0);
    // Không đổi tiến độ vượt mốc cũ -> giữ nguyên mốc đã báo
    expect(reconcileNotifiedMilestone(75, 8_000_000, 10_000_000)).toBe(75);
  });
});
