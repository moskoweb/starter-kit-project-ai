import assert from "node:assert/strict";
import { buildPanelPath, resolvePanelPath } from "./routing.js";
import { validatePanels, type PanelConfig } from "./registry.js";

const orgPath = buildPanelPath("organization", { tenant: "acme west", segments: ["projects", "a+b"] });
assert.equal(orgPath, "/org/acme%20west/projects/a%2Bb");
assert.deepEqual(resolvePanelPath(orgPath), {
  panel: { id: "organization", label: "Organization", prefix: "/org", context: "organization", tenantIdentifier: "slug" },
  tenantParam: "acme west",
  segments: ["projects", "a+b"],
});
assert.deepEqual(resolvePanelPath("/admin/users/7")?.segments, ["users", "7"]);
assert.equal(resolvePanelPath("/administrator"), undefined);
assert.equal(resolvePanelPath("/org/acme/%2e%2e"), undefined);
assert.equal(resolvePanelPath("/org/acme/a%2Fb"), undefined);
assert.equal(resolvePanelPath("/api/health"), undefined);
assert.throws(() => buildPanelPath("organization", { tenant: "acme", segments: ["../admin"] }));
assert.throws(() => buildPanelPath("personal", { segments: ["a/b"] }));
const overlapping: PanelConfig[] = [
  { id: "a", label: "A", prefix: "/a", context: "global" },
  { id: "ab", label: "AB", prefix: "/a/x", context: "personal" },
];
assert.throws(() => validatePanels(overlapping), /Overlapping panel prefixes/);
