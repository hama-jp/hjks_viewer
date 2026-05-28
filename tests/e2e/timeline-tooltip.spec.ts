import { test, expect } from "@playwright/test";

// The Gantt timeline renders its bars onto an ECharts <canvas>, so individual
// bars can't be targeted via DOM selectors. Instead we hover across a few
// candidate points near the top rows until the floating tooltip appears.
test.describe("Timeline hover tooltip", () => {
  test("shows floating outage details when hovering a gantt bar", async ({ page }) => {
    await page.goto("/timeline");

    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    // Give ECharts a moment to finish its initial render.
    await page.waitForTimeout(1500);

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    if (!box) return;

    // The ECharts tooltip is an absolutely-positioned div containing the
    // colon-prefixed "停止区分:" label (the detail table below uses the same
    // word without a colon, so the colon keeps this assertion specific).
    const tooltip = page
      .locator("div")
      .filter({ hasText: /停止区分:/ })
      .first();

    let appeared = false;
    outer: for (let row = 0; row < 6; row++) {
      for (const fx of [0.45, 0.5, 0.55, 0.6, 0.65, 0.4, 0.7]) {
        await page.mouse.move(box.x + box.width * fx, box.y + 45 + row * 32);
        await page.waitForTimeout(150);
        if (await tooltip.isVisible().catch(() => false)) {
          appeared = true;
          break outer;
        }
      }
    }

    expect(appeared, "floating tooltip should appear on hover").toBe(true);
    // The tooltip should carry the key detail fields.
    await expect(tooltip).toContainText("停止日時:");
    await expect(tooltip).toContainText("復旧予定:");
    await expect(tooltip).toContainText("停止期間:");
    await expect(tooltip).toContainText("事業者:");
  });
});
