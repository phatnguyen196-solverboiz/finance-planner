import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteTransactionAction } from "@/actions/transaction-actions";
import {
  TransactionList,
  type TransactionRowItem,
} from "../dashboard/transaction-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/actions/transaction-actions", () => ({
  deleteTransactionAction: vi.fn(),
}));

function makeTransactions(count: number): TransactionRowItem[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `tx-${idx + 1}`,
    type: idx % 3 === 0 ? "INCOME" : "EXPENSE",
    amount: 100_000,
    description: `Giao dịch #${idx + 1}`,
    category: idx % 3 === 0 ? "SALARY" : "FOOD",
    date: "2026-11-15T12:00:00.000Z",
    originalCurrency: "VND",
    originalAmount: null,
    exchangeRate: null,
    rateSource: null,
    isRecurringGenerated: false,
  }));
}

describe("TransactionList component", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mặc định hiển thị 10 giao dịch và hỗ trợ Xem thêm / Xem tất cả / Thu gọn", () => {
    const items = makeTransactions(25);
    render(<TransactionList transactions={items} onEdit={vi.fn()} />);

    const tbody = screen.getByRole("table").querySelector("tbody")!;
    expect(within(tbody).getAllByRole("row")).toHaveLength(10);
    expect(screen.getByText(/Theo bộ lọc hiện tại|Tổng hợp danh sách/i)).toHaveTextContent(
      "(25 giao dịch)"
    );
    expect(screen.getByText(/Đang hiển thị/i)).toHaveTextContent(
      "Đang hiển thị 10 / 25 giao dịch"
    );

    // Bấm Xem thêm 10 -> 20 dòng
    fireEvent.click(screen.getByRole("button", { name: /Xem thêm 10/i }));
    expect(within(tbody).getAllByRole("row")).toHaveLength(20);
    expect(screen.getByRole("button", { name: /Thu gọn/i })).toBeInTheDocument();

    // Bấm Xem tất cả -> đủ 25 dòng và ẩn nút Xem thêm
    // Lúc này remainingCount = 5 <= 10 nên dùng nút Xem thêm 5
    fireEvent.click(screen.getByRole("button", { name: /Xem thêm 5/i }));
    expect(within(tbody).getAllByRole("row")).toHaveLength(25);
    expect(
      screen.queryByRole("button", { name: /Xem thêm/i })
    ).not.toBeInTheDocument();

    // Bấm Thu gọn -> quay lại 10 dòng
    fireEvent.click(screen.getByRole("button", { name: /Thu gọn/i }));
    expect(within(tbody).getAllByRole("row")).toHaveLength(10);

    // Kiểm tra nút Xem tất cả (25) hoạt động thẳng từ 10 dòng
    fireEvent.click(screen.getByRole("button", { name: /Xem tất cả \(25\)/i }));
    expect(within(tbody).getAllByRole("row")).toHaveLength(25);
  });

  it("hiện hộp thoại xác nhận trước khi xoá và chỉ gọi deleteTransactionAction khi xác nhận", async () => {
    vi.mocked(deleteTransactionAction).mockResolvedValue({
      ok: true,
      message: "Đã xoá giao dịch.",
    });

    const items = makeTransactions(3);
    render(
      <TransactionList
        transactions={items}
        onEdit={vi.fn()}
        hasActiveFilter
      />
    );

    expect(screen.getByText(/Theo bộ lọc hiện tại/i)).toBeInTheDocument();

    const tbody = screen.getByRole("table").querySelector("tbody")!;
    const deleteBtn = within(tbody).getByRole("button", {
      name: "Xoá giao dịch Giao dịch #1",
    });
    fireEvent.click(deleteBtn);

    // Hộp thoại xác nhận mở lên, chưa gọi action xoá
    expect(screen.getByText("Xoá giao dịch?")).toBeInTheDocument();
    expect(deleteTransactionAction).not.toHaveBeenCalled();

    // Bấm nút xác nhận Xoá trong Dialog
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Xoá" }));

    await waitFor(() => {
      expect(deleteTransactionAction).toHaveBeenCalledWith("tx-1");
    });
  });
});
