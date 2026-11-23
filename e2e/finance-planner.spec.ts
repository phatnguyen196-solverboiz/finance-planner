import { expect, test } from "@playwright/test";

test.describe("Finance Planner Security & Auth Flow", () => {
  test("chuyển hướng người dùng chưa đăng nhập từ / sang /login", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await expect(
      page.getByRole("button", { name: "Đăng nhập" })
    ).toBeVisible();
  });

  test("hiển thị lỗi validate form đăng nhập khi gửi rỗng", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText("Email không hợp lệ")).toBeVisible();
    await expect(
      page.getByText("Mật khẩu cần tối thiểu 6 ký tự")
    ).toBeVisible();
  });

  test("API /api/transactions trả về 401 khi chưa đăng nhập", async ({
    request,
  }) => {
    const response = await request.get("/api/transactions");
    expect(response.status()).toBe(401);
  });

  test("PWA manifest.webmanifest hoạt động hợp lệ", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    const json = (await response.json()) as {
      name?: string;
      display?: string;
    };
    expect(json.name).toContain("Finance Planner");
    expect(json.display).toBe("standalone");
  });
});
