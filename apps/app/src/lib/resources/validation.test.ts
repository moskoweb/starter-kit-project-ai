import assert from "node:assert/strict";
import { listSchema, taskListSchema, taskUpdateSchema } from "./validation";

for (const schema of [listSchema, taskListSchema]) {
  assert.equal(schema.parse({ page: "1000000" }).page, 1_000_000);
  assert.equal(schema.safeParse({ page: "1000001" }).success, false);
  assert.equal(schema.safeParse({ page: "9007199254740992" }).success, false);
}

assert.deepEqual(taskUpdateSchema.parse({ title: "Updated task" }), { title: "Updated task" });
assert.equal(taskUpdateSchema.safeParse({ title: "Updated task", projectId: "11111111-1111-4111-8111-111111111111" }).success, false);
