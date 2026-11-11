import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateRuntimeEnv, validateMigrationEnv } from "../src/env";

describe("validateRuntimeEnv", () => {
  it("accepts valid postgres URL and numeric port", () => {
    const env = validateRuntimeEnv({
      DATABASE_URL: "postgresql://vibe_app:secret@127.0.0.1:5432/vibe_starter",
      PORT: "3000",
      NODE_ENV: "development",
    });

    assert.equal(env.PORT, 3000);
    assert.equal(env.DATABASE_URL, "postgresql://vibe_app:secret@127.0.0.1:5432/vibe_starter");
    assert.equal(env.NODE_ENV, "development");
  });

  it("accepts postgres:// protocol", () => {
    const env = validateRuntimeEnv({
      DATABASE_URL: "postgres://vibe_app:secret@127.0.0.1:5432/vibe_starter",
    });

    assert.equal(env.DATABASE_URL, "postgres://vibe_app:secret@127.0.0.1:5432/vibe_starter");
    assert.equal(env.PORT, 3000);
  });

  it("rejects port containing letters", () => {
    assert.throws(
      () =>
        validateRuntimeEnv({
          DATABASE_URL: "postgresql://vibe_app:secret@127.0.0.1:5432/vibe_starter",
          PORT: "3000abc",
        }),
      /Runtime environment validation failed/
    );
  });

  it("rejects port out of range", () => {
    assert.throws(
      () =>
        validateRuntimeEnv({
          DATABASE_URL: "postgresql://vibe_app:secret@127.0.0.1:5432/vibe_starter",
          PORT: "0",
        }),
      /Runtime environment validation failed/
    );

    assert.throws(
      () =>
        validateRuntimeEnv({
          DATABASE_URL: "postgresql://vibe_app:secret@127.0.0.1:5432/vibe_starter",
          PORT: "70000",
        }),
      /Runtime environment validation failed/
    );
  });

  it("rejects non-postgres protocols", () => {
    assert.throws(
      () =>
        validateRuntimeEnv({
          DATABASE_URL: "http://127.0.0.1:5432/vibe_starter",
        }),
      /Runtime environment validation failed/
    );
  });
});

describe("validateMigrationEnv", () => {
  it("accepts valid migration database URL", () => {
    const env = validateMigrationEnv({
      MIGRATION_DATABASE_URL: "postgresql://vibe_owner:secret@127.0.0.1:5432/vibe_starter",
    });

    assert.equal(env.MIGRATION_DATABASE_URL, "postgresql://vibe_owner:secret@127.0.0.1:5432/vibe_starter");
  });

  it("rejects missing migration database URL", () => {
    assert.throws(
      () => validateMigrationEnv({}),
      /Migration environment validation failed/
    );
  });
});
