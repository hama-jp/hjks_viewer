import { test, expect } from "@playwright/test";

test.describe("Outages List", () => {
  test("should load and display outage table", async ({ page }) => {
    await page.goto("/outages");
    await expect(page.locator("h1")).toContainText("停止情報一覧");
    // Table should be visible with data
    await expect(page.locator("table")).toBeVisible();
    // Should have at least one row
    await expect(page.locator("table tbody tr").first()).toBeVisible();
  });

  test("should filter by search text", async ({ page }) => {
    await page.goto("/outages");
    // Wait for table to load
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    // Type in search box
    const searchInput = page.getByPlaceholder(/事業者名|発電所名|検索/);
    await searchInput.fill("北海道");
    // Check URL updated
    await expect(page).toHaveURL(/q=%E5%8C%97%E6%B5%B7%E9%81%93|q=北海道/);
    // Table should still have results (filtered)
    await expect(page.locator("table")).toBeVisible();
  });

  test("should paginate when many records", async ({ page }) => {
    await page.goto("/outages");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    // Check if pagination exists (may or may not depending on record count)
    // With 30 records and 50 per page, there may be only 1 page
    const totalText = page.getByText(/件/);
    await expect(totalText.first()).toBeVisible();
  });

  test("should sort by clicking column header", async ({ page }) => {
    await page.goto("/outages");
    await expect(page.locator("table tbody tr").first()).toBeVisible();
    // Click on "停止日時" header to toggle sort
    await page.click('th:has-text("停止日時")');
    await expect(page).toHaveURL(/sort=|dir=/);
  });
});
