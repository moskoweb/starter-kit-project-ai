import { expect, test, type Page } from "@playwright/test";

const mailpit = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:8025";
const password = "E2e-Starter-Pass-2026";

/** Reads the newest verification link sent to `email` from Mailpit's API. */
async function verificationLink(page: Page, email: string): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const search = await page.request.get(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const { messages } = await search.json() as { messages: { ID: string }[] };
    if (messages[0]) {
      const message = await (await page.request.get(`${mailpit}/api/v1/message/${messages[0].ID}`)).json() as { Text: string };
      const link = message.Text.match(/https?:\/\/\S*verify-email\S*/)?.[0];
      if (link) return link.replace(/&amp;/g, "&");
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`No verification email for ${email}`);
}

async function signUpAndSignIn(page: Page) {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  await page.goto("/signup");
  await page.locator("#auth-name").fill("E2E User");
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator("button[type=submit]").click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto(await verificationLink(page, email));
  await page.goto("/login");
  await page.locator("#auth-email").fill(email);
  await page.locator("#auth-password").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL(url => !url.pathname.startsWith("/login"));
  return email;
}

test("sign up, verify, sign in and manage a project", async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto("/app/projects/new");
  await page.locator("button[type=submit]").click();
  await expect(page.locator("[data-slot=field-error]").first()).toBeVisible();

  await page.locator("#field-name").fill("Projeto E2E");
  await page.locator("#field-description").fill("Criado pelo teste ponta a ponta");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/app\/projects\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Projeto E2E");

  await page.goto("/app/projects?search=E2E");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.locator("tbody [data-slot=checkbox]").first().click();
  await page.getByRole("button", { name: /Excluir selecionados|Delete selected/ }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: /^(Excluir|Delete)$/ }).click();
  await expect(page.getByText(/Nenhum registro|No records/)).toBeVisible();
});

test("anonymous users are sent to login and cannot open admin", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await signUpAndSignIn(page);
  // Streaming may commit 200 before forbidden() renders; assert the denial page and absent admin data.
  await page.goto("/admin");
  await expect(page.getByText(/Acesso não permitido|Access denied/)).toBeVisible();
  await expect(page.getByText(/Métricas globais|Global metrics/)).toHaveCount(0);
});

test("mobile sidebar opens as sheet and navigates @mobile", async ({ page }) => {
  await signUpAndSignIn(page);
  await page.goto("/app");
  await page.locator("[data-sidebar=trigger]").click();
  const sheet = page.locator("[data-mobile=true]");
  await expect(sheet).toBeVisible();
  await sheet.locator('a[href$="/projects"]').click();
  await expect(page).toHaveURL(/\/app\/projects$/);
  await expect(sheet).toBeHidden();
});
