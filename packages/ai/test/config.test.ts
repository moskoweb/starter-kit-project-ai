import assert from "node:assert/strict";
import test from "node:test";
import { readAiConfig } from "../src/config";

test("disabled AI needs no provider credentials and ignores unused settings", () => {
  assert.deepEqual(readAiConfig({}), { enabled: false });
  assert.deepEqual(readAiConfig({ AI_ENABLED: "false", AI_BASE_URL: "invalid" }), { enabled: false });
});

test("enabled AI fails closed without explicit credentials and model", () => {
  assert.throws(() => readAiConfig({ AI_ENABLED: "yes" }), /AI_ENABLED/);
  assert.throws(() => readAiConfig({ AI_ENABLED: "true" }), /AI_API_KEY/);
  assert.throws(() => readAiConfig({ AI_ENABLED: "true", AI_API_KEY: "test-only" }), /AI_MODEL/);
  const configured = { AI_ENABLED: "true", AI_API_KEY: "test-only", AI_MODEL: "test-model" };
  assert.deepEqual(readAiConfig(configured), {
    enabled: true, apiKey: "test-only", model: "test-model", baseURL: "https://api.openai.com/v1",
  });
  for (const AI_BASE_URL of ["invalid", "http://example.com", "https://user:pass@example.com", "https://example.com?key=secret", "https://example.com/#fragment"]) {
    assert.throws(() => readAiConfig({ ...configured, AI_BASE_URL }), /AI_BASE_URL/);
  }
  assert.equal(readAiConfig({ ...configured, AI_BASE_URL: "https://example.com/v1/" }).enabled, true);
});
