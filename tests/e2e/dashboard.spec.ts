import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("should load and display summary cards", async ({ page }) => {
    await page.goto("/");
    // Check page title/heading
    await expect(page.locator("h1")).toContainText("ダッシュボード");
    // Check 3 summary cards are visible
    await expect(page.getByText("停止中件数")).toBeVisible();
    await expect(page.getByText("計画外停止件数")).toBeVisible();
    await expect(page.getByText("エリア数")).toBeVisible();
  });

  test("should display charts after data loads", async ({ page }) => {
    await page.goto("/");
    // Wait for charts to render (they're dynamically imported)
    await expect(page.getByText("エリア別停止件数")).toBeVisible();
    await expect(page.getByText("発電形式別停止件数")).toBeVisible();
    await expect(page.getByText("停止区分別件数")).toBeVisible();
  });

  test("should navigate to outages page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/outages"]');
    await expect(page.locator("h1")).toContainText("停止情報一覧");
  });
});
