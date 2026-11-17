import { expect, test } from "@playwright/test";
import { signUpAndSignIn } from "./helpers";

// Uses a real verified disposable account. Enable only on hybrid/organization multi-mode projects.
test.skip(process.env.E2E_ORGANIZATIONS !== "1", "requires organization profile and multi mode");

test("organizations use shared resource list, create, detail and edit", async ({ page, browser }) => {
  const slug = `resource-${Date.now()}`;
  await page.goto("/organizations");
  await expect(page.locator("table")).toBeVisible();
  await page.getByRole("link", { name: /^(Criar|Create) organiza/i }).click();
  await expect(page).toHaveURL(/\/organizations\/new$/);
  await page.getByRole("textbox", { name: /^(Nome|Name)/ }).fill("Resource organization");
  await page.getByRole("textbox", { name: /Slug|Identificador|identifier/i }).fill(slug);
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resource organization");
  await page.getByRole("link", { name: /^(Editar|Edit)$/ }).click();
  await page.getByRole("textbox", { name: /^(Nome|Name)/ }).fill("Resource organization updated");
  await page.locator('button[type="submit"]').click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resource organization updated");
  const detail = page.url();
  const isolated = await browser.newContext();
  try {
    const other = await isolated.newPage();
    await signUpAndSignIn(other);
    await other.goto(`/organizations?search=${slug}`);
    await expect(other.locator("tbody")).not.toContainText("Resource organization updated");
    await other.goto(detail);
    await expect(other.getByText(/Página não encontrada|Page not found/, { exact: true })).toBeVisible();
    await other.goto(`${detail}/edit`);
    await expect(other.getByText(/Página não encontrada|Page not found/, { exact: true })).toBeVisible();
    await expect(other.locator('button[type="submit"]')).toHaveCount(0);
  } finally { await isolated.close(); }
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resource organization updated");
  await page.goto(`/organizations?search=${slug}`);
  await expect(page.locator("tbody")).toContainText("Resource organization updated");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
