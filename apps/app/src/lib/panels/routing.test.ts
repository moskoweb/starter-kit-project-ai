import assert from "node:assert/strict";
import { buildPanelPath, resolvePanelPath } from "./routing.js";
import { validatePanels, type PanelConfig } from "./registry.js";

// Explicit lists: derived projects register their own panels (vibe create/panel), so tests never depend on `registry`.
const admin: PanelConfig[] = [{ id: "admin", label: "Admin", prefix: "/admin", context: "global" }];
const org: PanelConfig = { id: "org", label: "Organization", prefix: "/org", context: "organization", tenantIdentifier: "slug" };
const panels: PanelConfig[] = [...admin, { id: "app", label: "Personal", prefix: "/app", context: "personal" }, org];
const orgPath = buildPanelPath("org", { tenant: "acme west", segments: ["notes", "a+b"] }, panels);
assert.equal(orgPath, "/org/acme%20west/notes/a%2Bb");
assert.deepEqual(resolvePanelPath(orgPath, panels), { panel: org, tenantParam: "acme west", segments: ["notes", "a+b"] });
assert.equal(resolvePanelPath(orgPath, admin), undefined, "unregistered panels do not resolve");
assert.deepEqual(resolvePanelPath("/admin/users/7", admin)?.segments, ["users", "7"]);
assert.equal(resolvePanelPath("/administrator", admin), undefined);
assert.equal(resolvePanelPath("/org/acme/%2e%2e", panels), undefined);
assert.equal(resolvePanelPath("/org/acme/a%2Fb", panels), undefined);
assert.equal(resolvePanelPath("/api/health", panels), undefined);
assert.throws(() => buildPanelPath("org", { tenant: "acme", segments: ["../admin"] }, panels));
assert.throws(() => buildPanelPath("app", { segments: ["a/b"] }, panels));
assert.throws(() => buildPanelPath("app", {}, admin), /Unknown panel/);
const overlapping: PanelConfig[] = [
  { id: "a", label: "A", prefix: "/a", context: "global" },
  { id: "ab", label: "AB", prefix: "/a/x", context: "personal" },
];
assert.throws(() => validatePanels(overlapping), /Overlapping panel prefixes/);
