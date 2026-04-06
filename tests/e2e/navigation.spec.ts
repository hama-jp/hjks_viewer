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

  test("should highlight active navigation link on dashboard", async ({ page }) => {
    await page.goto("/");
    const dashboardLink = page.locator("nav").getByRole("link", { name: "ダッシュボード" }).first();
    await expect(dashboardLink).toHaveClass(/font-semibold/);
    await expect(dashboardLink).toHaveClass(/text-blue-700/);
  });

  test("should highlight active navigation link on timeline", async ({ page }) => {
    await page.goto("/timeline");
    const timelineLink = page.locator("nav").getByRole("link", { name: "タイムライン" }).first();
    await expect(timelineLink).toHaveClass(/font-semibold/);
    await expect(timelineLink).toHaveClass(/text-blue-700/);
  });

  test("should highlight active navigation link on outages", async ({ page }) => {
    await page.goto("/outages");
    const outagesLink = page.locator("nav").getByRole("link", { name: "停止情報一覧" }).first();
    await expect(outagesLink).toHaveClass(/font-semibold/);
    await expect(outagesLink).toHaveClass(/text-blue-700/);
  });

  test("should not highlight non-active links", async ({ page }) => {
    await page.goto("/timeline");
    const dashboardLink = page.locator("nav").getByRole("link", { name: "ダッシュボード" }).first();
    await expect(dashboardLink).not.toHaveClass(/font-semibold/);
  });
});

test.describe("Mobile Navigation", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("should show hamburger menu button on mobile", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /メニュー/ });
    await expect(menuButton).toBeVisible();
  });

  test("should open and close hamburger menu", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /メニュー/ });

    // Menu should be hidden initially
    const mobileNav = page.locator("[data-testid='mobile-menu']");
    await expect(mobileNav).toBeHidden();

    // Open menu
    await menuButton.click();
    await expect(mobileNav).toBeVisible();

    // Should show all nav links
    await expect(mobileNav.getByRole("link", { name: "ダッシュボード" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "タイムライン" })).toBeVisible();
    await expect(mobileNav.getByRole("link", { name: "停止情報一覧" })).toBeVisible();
  });

  test("should close menu on overlay click", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /メニュー/ });
    const mobileNav = page.locator("[data-testid='mobile-menu']");

    await menuButton.click();
    await expect(mobileNav).toBeVisible();

    // Click overlay
    const overlay = page.locator("[data-testid='mobile-menu-overlay']");
    await overlay.click();
    await expect(mobileNav).toBeHidden();
  });

  test("should close menu on Escape key", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /メニュー/ });
    const mobileNav = page.locator("[data-testid='mobile-menu']");

    await menuButton.click();
    await expect(mobileNav).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(mobileNav).toBeHidden();
  });

  test("should close menu on navigation", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /メニュー/ });
    const mobileNav = page.locator("[data-testid='mobile-menu']");

    await menuButton.click();
    await expect(mobileNav).toBeVisible();

    // Click a navigation link
    await mobileNav.getByRole("link", { name: "タイムライン" }).click();
    await expect(mobileNav).toBeHidden();
  });

  test("should highlight active link in mobile menu", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: /メニュー/ });
    await menuButton.click();

    const mobileNav = page.locator("[data-testid='mobile-menu']");
    const dashboardLink = mobileNav.getByRole("link", { name: "ダッシュボード" });
    await expect(dashboardLink).toHaveClass(/font-semibold/);
  });
});
