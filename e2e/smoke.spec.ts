import { expect, test } from "@playwright/test";

test("signed-in user updates profile", async ({ page }) => {
  await page.goto("/account");
  await page.locator("#profile-name").fill("E2E Renamed");
  await page.locator("#profile-name").press("Enter");
  await expect(page.getByText(/Perfil atualizado\.|Profile updated\./)).toBeVisible();
  await expect(page.locator("#profile-name")).toHaveValue("E2E Renamed");
});

test("non-admins cannot open admin", async ({ page }) => {
  // Streaming may commit 200 before forbidden() renders; assert the denial page and absent admin data.
  await page.goto("/admin");
  await expect(page.getByText(/Acesso não permitido|Access denied/)).toBeVisible();
  await expect(page.getByText(/Métricas globais|Global metrics/)).toHaveCount(0);
});

test.describe("anonymous", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test("protected pages redirect to login", async ({ page }) => {
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
  });
});

test("mobile sidebar opens as sheet and navigates @mobile", async ({ page }) => {
  await page.goto("/account");
  await page.locator("[data-sidebar=trigger]").click();
  const sheet = page.locator("[data-mobile=true]");
  await expect(sheet).toBeVisible();
  await sheet.locator('a[href="/security"]').click();
  await expect(page).toHaveURL(/\/security$/);
  await expect(sheet).toBeHidden();
});
