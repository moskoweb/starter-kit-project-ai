import { expect, test } from "@playwright/test";
import { generatedResource } from "./helpers";

// Requires CI codegen first: `vibe panel app --context personal --prefix /app` + `vibe resource Note ...` (see docs/TESTING.md).
// Generator slug = kebab-case of the name, not pluralized: `Note` → `/app/note`.
test.skip(!generatedResource, "set E2E_GENERATED_RESOURCE=1 after generating the Note resource");

test("generated resource CRUD: validation, view, search and bulk delete", async ({ page }) => {
  await page.goto("/app/note/new");
  await page.locator("button[type=submit]").click();
  await expect(page.locator("[data-slot=field-error]").first()).toBeVisible();

  await page.locator("#field-title").fill("Nota E2E");
  await page.locator("#field-body").fill("Criada pelo teste ponta a ponta");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/app\/note\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nota E2E");

  await page.goto("/app/note?search=E2E");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator("tbody [data-slot=checkbox]").first().click();
  await page.getByRole("button", { name: /Excluir selecionados|Delete selected/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /^(Excluir|Delete)$/ }).click();
  await expect(page.getByText(/Nenhum registro|No records/)).toBeVisible();
});
