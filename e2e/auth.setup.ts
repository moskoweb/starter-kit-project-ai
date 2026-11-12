import { expect, test as setup } from "@playwright/test";
import { authFile, generatedResource, signUpAndSignIn } from "./helpers";

// One real sign-up → email verification → sign-in for the whole run; tests reuse the session.
setup("sign up, verify and sign in", async ({ page }) => {
  await signUpAndSignIn(page);
  // Default template registers only /admin, so landing is /account; a generated personal panel takes over.
  await expect(page).toHaveURL(generatedResource ? /\/app$/ : /\/account$/);
  await page.context().storageState({ path: authFile });
});
