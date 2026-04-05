import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");

    // Check header contains nav links
    await expect(page.getByRole("link", { name: "ダッシュボード" })).toBeVisible();
    await expect(page.getByRole("link", { name: "停止情報一覧" })).toBeVisible();
  });

  test("should show 404 for unknown routes", async ({ page }) => {
    const response = await page.goto("/unknown-page");
    // Static export returns 404.html
    expect(response?.status()).toBe(404);
  });
});
