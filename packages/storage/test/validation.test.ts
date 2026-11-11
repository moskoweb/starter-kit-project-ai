import assert from "node:assert/strict";
import test from "node:test";
import { getStorageConfig } from "../src/config";
import { MAX_UPLOAD_BYTES, STORAGE_URL_TTL_SECONDS, storagePrefix, validateObjectKey, validateUpload } from "../src/validation";

const context = { namespace: "org", id: "org-1" } as const;
const key = "org/org-1/df6a4027-cc23-4ef5-a1b4-49cfc41e6724";

test("upload size and MIME limits reject untrusted declarations", () => {
  validateUpload({ contentType: "image/png", size: 1 });
  validateUpload({ contentType: "application/pdf", size: MAX_UPLOAD_BYTES });
  for (const size of [0, -1, 1.5, NaN, Infinity, MAX_UPLOAD_BYTES + 1]) {
    assert.throws(() => validateUpload({ contentType: "image/png", size }));
  }
  for (const contentType of ["text/html", "image/svg+xml", "image/png; charset=utf-8", "IMAGE/PNG", ""]) {
    assert.throws(() => validateUpload({ contentType, size: 1 }));
  }
  assert.equal(STORAGE_URL_TTL_SECONDS, 60);
});

test("keys require exact server namespace and generated UUID, never traversal", () => {
  assert.equal(storagePrefix(context), "org/org-1/");
  assert.equal(validateObjectKey(context, { key }), key);
  for (const invalid of [key.replace("org-1", "org-2"), key.replace("org/", "user/"), `${key}/../x`, "../x", "org/org-1/%2e%2e/x", "org/org-1/../x", "org/org-1\\x", "org/org-1/x"]) {
    assert.throws(() => validateObjectKey(context, { key: invalid }));
  }
  assert.throws(() => storagePrefix({ namespace: "org", id: "../org-2" }));
  assert.throws(() => storagePrefix({ namespace: "user", id: "user/other" }));
});

test("disabled storage does not demand credentials; enabled storage fails clearly", () => {
  assert.throws(() => getStorageConfig({}), /Storage is disabled/);
  assert.throws(() => getStorageConfig({ STORAGE_ENABLED: "false" }), /Storage is disabled/);
  assert.throws(() => getStorageConfig({ STORAGE_ENABLED: "yes" }), /must be true or false/);
  assert.throws(() => getStorageConfig({ STORAGE_ENABLED: "true" }), /requires S3_ENDPOINT/);
  assert.throws(() => getStorageConfig({ STORAGE_ENABLED: "true", S3_ENDPOINT: "http://remote.example" }), /requires HTTPS/);
});
