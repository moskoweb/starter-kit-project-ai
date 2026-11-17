// Run: node packages/ui/src/components/resource/resource-form.check.mjs
// Real browser + public ResourceForm API. Only Next navigation is a test adapter, no DB claim.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
const { build } = require(require.resolve("esbuild", { paths: [path.dirname(require.resolve("tsx"))] }));
const root = process.cwd();
const dir = await mkdtemp(path.join(process.env.JCODE_SCRATCH_DIR ?? tmpdir(), "resource-form-"));
const entry = path.join(dir, "entry.tsx");
await writeFile(entry, `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ResourceForm } from '${root}/packages/ui/src/components/resource/resource-form';
import { PageHeader } from '${root}/packages/ui/src/components/resource/page-header';
import { resourceText, toLabels } from '${root}/apps/app/src/lib/resources/labels';
window.calls = [];
createRoot(document.getElementById('root')).render(<>
<PageHeader title="Create record" actions={<button type="button">Header action</button>} />
<ResourceForm labels={toLabels(resourceText.en)} cancelHref="/cancel" redirectTo={() => '/saved'}
 record={location.search ? {id:'existing',title:'initial'} : undefined}
 sections={[{ columns: 2, fields: [
 { name: 'title', label: 'Title', type: 'text', required: true, maxLength: 12, disabledOnEdit: true },
 { name: 'email', label: 'Email', type: 'email' },
 { name: 'count', label: 'Count', type: 'number', min: 1, max: 5 },
 { name: 'active', label: 'Active', type: 'boolean', description: 'Activation state' }
 ] }]} onSubmit={async values => { window.calls.push(values); await new Promise(r => setTimeout(r, 200));
 if (values.title === 'throw') throw new Error('Offline');
 if (values.title === 'reject') return {ok:false, error:'INVALID', fieldErrors:{active:'Cannot activate'}};
 return {ok:true, id:'saved'};
 }} />
</>);
`);
const output = await build({ entryPoints: [entry], bundle: true, write: false, format: "iife", jsx: "automatic", nodePaths: [path.join(root, "node_modules"), path.join(root, "packages/ui/node_modules")], plugins: [{ name: "next-test-adapter", setup(b) {
  b.onResolve({ filter: /^next\/(navigation|link)$/ }, ({ path: name }) => ({ path: name, namespace: "next-adapter" }));
  b.onLoad({ filter: /.*/, namespace: "next-adapter" }, ({ path: name }) => ({ loader: "tsx", resolveDir: root, contents: name.endsWith("navigation") ? "export const useRouter=()=>({push:url=>window.destination=url,refresh:()=>{}})" : "import React from 'react'; export default function Link(props){return <a {...props}/>;}" }));
} }] });
const server = createServer((req, res) => { res.setHeader("Content-Type", req.url === "/app.js" ? "text/javascript" : "text/html"); res.end(req.url === "/app.js" ? output.outputFiles[0].text : '<div id="root"></div><script src="/app.js"></script>'); });
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  assert.equal(await page.locator("#field-title").getAttribute("aria-invalid"), "true");
  assert.equal(await page.locator("#field-title").evaluate(el => el === document.activeElement), true);
  assert.equal(await page.locator("#field-title-error").textContent(), "Required field.");
  await page.getByLabel("Title").fill("reject");
  await page.getByLabel("Email").fill("bad");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  assert.equal(await page.evaluate(() => window.calls.length), 0);
  await page.getByLabel("Email").fill("user@example.test");
  await page.getByLabel("Count").fill("6");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  assert.equal(await page.locator("#field-count").getAttribute("aria-invalid"), "true");
  await page.getByLabel("Count").fill("3");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: "Cancel", exact: true }).isDisabled(), true);
  await page.locator("#field-active-error").waitFor();
  assert.equal(await page.getByRole("switch").getAttribute("aria-invalid"), "true");
  assert.equal(await page.getByRole("switch").evaluate(el => el === document.activeElement), true);
  assert.equal(await page.getByRole("switch").getAttribute("aria-describedby"), "field-active-description field-active-error");
  await page.getByLabel("Title").fill("throw");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("link", { name: "Cancel", exact: true }).waitFor();
  assert.equal(await page.getByLabel("Title").inputValue(), "throw");
  assert.equal(await page.getByRole("button", { name: "Save", exact: true }).isEnabled(), true);
  await page.getByLabel("Title").fill("valid");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() => window.destination === "/saved");
  assert.deepEqual(await page.evaluate(() => window.calls.at(-1)), { title: "valid", email: "user@example.test", count: 3, active: false });
  assert.equal(await page.locator('[data-slot="resource-action-header"]').count(), 1);
  assert.equal(await page.locator('[data-slot="resource-action-footer"]').count(), 1);
  await page.goto(`http://127.0.0.1:${server.address().port}/?edit`);
  assert.equal(await page.getByLabel("Title").inputValue(), "initial");
  assert.equal(await page.getByLabel("Title").isDisabled(), true);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForFunction(() => window.destination === "/saved");
  assert.deepEqual(await page.evaluate(() => window.calls[0]), { email: null, count: null, active: false });
  assert.equal(await page.getByRole("link", { name: "Cancel", exact: true }).getAttribute("href"), "/cancel");
  assert.deepEqual(errors, []);
  console.log("ResourceForm browser check passed: required, native validity, pending, server errors, focus, boolean aria, serialization, navigation, action slots.");
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await rm(dir, { recursive: true, force: true });
}
