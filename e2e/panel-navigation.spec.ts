import { expect, test } from "@playwright/test";

test.skip(process.env.E2E_ADMIN !== "1", "requires an isolated admin session");

test("panel navigation retains provider, document and collapsed state during slow requests", async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(window, { skeletonObserved: false });
    new MutationObserver(() => {
      if (document.querySelector('[role="status"] [data-slot="skeleton"]')) Object.assign(window, { skeletonObserved: true });
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Dashboard|Painel/);
  await page.locator('[data-slot="sidebar-trigger"]').click();
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
  await page.evaluate(() => {
    Object.assign(window, { panelDocument: document, panelSidebar: document.querySelector('[data-slot="sidebar-wrapper"]') });
  });
  await page.route("**/admin/users?**", async route => {
    await new Promise(resolve => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.locator('[data-slot="sidebar-menu-button"][href="/admin/users"]').click();
  await expect(page.locator('[data-slot="sidebar"]')).toBeVisible();
  await expect(page.getByText("Carregando painel…", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Usuários|Users/);
  expect(await page.evaluate(() => {
    const saved = window as typeof window & { panelDocument?: Document; panelSidebar?: Element };
    return saved.panelDocument === document && saved.panelSidebar === document.querySelector('[data-slot="sidebar-wrapper"]');
  })).toBe(true);
  await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute("data-state", "collapsed");
  await expect(page.locator('header [data-slot="breadcrumb-page"]').first()).toHaveText(/Usuários|Users/);
  expect(await page.evaluate(() => (window as typeof window & { skeletonObserved?: boolean }).skeletonObserved)).toBe(true);
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Dashboard|Painel/);
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Usuários|Users/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
