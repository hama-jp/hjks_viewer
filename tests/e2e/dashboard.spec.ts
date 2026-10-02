import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("should load and display summary cards", async ({ page }) => {
    await page.goto("/");
    // Check page title/heading
    await expect(page.locator("h1")).toContainText("ダッシュボード");
    // Check summary cards are visible
    await expect(page.getByText("停止中件数")).toBeVisible();
    await expect(page.getByText("計画外停止件数")).toBeVisible();
    await expect(page.getByText("停止容量合計")).toBeVisible();
  });

  test("should display charts after data loads", async ({ page }) => {
    await page.goto("/");
    // Charts are dynamically imported
    await expect(page.getByText("現在の停止状況")).toBeVisible();
    await expect(page.getByText("エリア別停止件数")).toBeVisible();
    await expect(page.getByText("エリア別停止容量 (MW)")).toBeVisible();
    await expect(page.getByText("種別内訳")).toBeVisible();
  });

  test("should navigate to outages page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/outages"]');
    await expect(page.locator("h1")).toContainText("停止情報一覧");
  });
});
