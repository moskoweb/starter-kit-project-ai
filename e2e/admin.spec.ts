import { expect, test } from "@playwright/test";

// Opt-in: promote only the disposable setup user in the test DB, then run
// E2E_ADMIN=1 playwright test admin.spec.ts --project=desktop --no-deps.
// Never promote an existing production account for this check.
test.skip(process.env.E2E_ADMIN !== "1", "requires a separately provisioned disposable admin session");

test("admin dashboard, users, edit profile and organizations", async ({ page }) => {
  await page.goto("/account");
  await expect(page.getByRole("link", { name: "Admin", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Admin", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Dashboard|Painel/);
  await page.goto("/admin/users?search=E2E");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator("tbody tr a").first().click();
  await page.getByRole("link", { name: /^(Editar|Edit)$/ }).click();
  await expect(page.getByRole("textbox", { name: /^(E-mail|Email)$/ })).toBeDisabled();
  await page.getByRole("textbox", { name: /^(Nome|Name)/ }).fill("E2E Admin updated");
  await page.locator("button[type=submit]").click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Admin updated");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Admin updated");
  await page.goto("/admin/organizations");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Organizações|Organizations/);
});
