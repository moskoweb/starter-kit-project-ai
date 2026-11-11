"use client";
import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { accessControl, roles } from "./permissions";

export const authClient = createAuthClient({
  plugins: [adminClient(), organizationClient({ ac: accessControl, roles }), twoFactorClient()],
});
