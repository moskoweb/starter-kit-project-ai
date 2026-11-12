import { expect, type Page } from "@playwright/test";

const mailpit = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:8025";
export const password = "E2e-Starter-Pass-2026";
/** Signed-in browser state written by auth.setup.ts and reused by every test (Better Auth rate-limits sign-in/sign-up). */
export const authFile = "e2e/.auth/user.json";

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

/** Sign up, verify by email and sign in; resolves after leaving `/login`. */
export async function signUpAndSignIn(page: Page) {
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

/** CI may register a generated personal panel at `/app`; then it becomes the landing page. */
export const generatedResource = process.env.E2E_GENERATED_RESOURCE === "1";
