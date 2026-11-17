import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const { transpileModule, ModuleKind } = require("typescript");
const env = { IDENTITY_PROFILE: "organizations", ORGANIZATION_MODE: "single" };
const panels = [{ id: "org", context: "organization", prefix: "/org", label: "Organization" }];
const deps = {
  "server-only": {}, "next/headers": { cookies: async () => ({ get: () => undefined }) },
  "@vibe/config/env": { getIdentityEnv: () => env },
  "../metrics/loaders": { loadOrganizationOptions: async () => [{ id: "one", name: "Only organization", identifier: "only" }] },
  "../i18n": { messages: { "pt-BR": { navigation: "Navigation", settings: "Settings" } } },
  "../resources/define": { t: value => value }, "./registry": { registry: panels },
  "./resources": { resourcesForPanel: () => [], resourceId: () => "" },
  "./routing": { buildPanelPath: (_id, args) => `/org/${args?.tenant ?? ""}` },
};
const loaded = { exports: {} };
const { outputText } = transpileModule(readFileSync(new URL("./chrome.ts", import.meta.url), "utf8"), { compilerOptions: { module: ModuleKind.CommonJS } });
runInNewContext(outputText, { exports: loaded.exports, require: name => { assert.ok(Object.hasOwn(deps, name), name); return deps[name]; } });
const props = () => loaded.exports.accountChrome({ name: "Test" });
assert.equal((await props()).switchable, false);
assert.equal((await props()).organizations[0].name, "Only organization");
env.ORGANIZATION_MODE = "multi";
assert.equal((await props()).switchable, true);
panels.length = 0;
assert.equal((await props()).switchable, false);
console.log("chrome check passed: single fixed, multi switchable, absent workspace fixed.");
