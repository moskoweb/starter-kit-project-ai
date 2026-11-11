import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { isPublicIp, signPayload, verifySignature, validateEnvelope, MAX_BODY_BYTES } from "../src/index";

const secret = "test-only-secret";
const body = Buffer.from('{"event":"sample"}');
const timestamp = 1_800_000_000;
const signature = signPayload(secret, body, timestamp);
assert.equal(verifySignature(secret, body, timestamp, signature, timestamp), true);
assert.equal(verifySignature(secret, Buffer.from('{"event":"tampered"}'), timestamp, signature, timestamp), false);
assert.equal(verifySignature(secret, body, timestamp - 301, signature, timestamp), false);
assert.equal(verifySignature(secret, body, timestamp + 301, signature, timestamp), false);
assert.equal(verifySignature(secret, body, timestamp, signature, timestamp + 301), false);
assert.throws(() => signPayload(secret, Buffer.alloc(MAX_BODY_BYTES + 1)), /WEBHOOK_BODY_TOO_LARGE/);
for (const ip of ["127.0.0.1", "10.0.0.1", "169.254.1.1", "172.16.0.1", "192.168.1.1", "100.64.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "2001:db8::1", "2001:0000:4136:e378:8000:63bf:3fff:fdd2"]) assert.equal(isPublicIp(ip), false, ip);
for (const ip of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPublicIp(ip), true, ip);
const allowed = new Set(["sample"]);
assert.equal(validateEnvelope({ id: randomUUID(), event: "sample", createdAt: new Date().toISOString(), data: {} }, allowed), true);
assert.equal(validateEnvelope({ id: randomUUID(), event: "other", createdAt: new Date().toISOString(), data: {} }, allowed), false);
