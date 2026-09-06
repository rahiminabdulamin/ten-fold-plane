import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the assistant exposes the complete editable work-item schema and live project choices", async () => {
  const [root, runtime] = await Promise.all([
    read("core/components/copilot/root.tsx"),
    read("../../apps/copilot/src/runtime.ts"),
  ]);

  for (const field of [
    "title",
    "description",
    "priority",
    "startDate",
    "targetDate",
    "stateId",
    "labelIds",
    "assigneeIds",
    "parentId",
    "point",
    "estimatePointId",
    "workItemTypeId",
  ]) {
    assert.match(root, new RegExp(`\\b${field}\\b`));
  }

  assert.match(root, /name:\s*"get_work_item_schema"/);
  assert.match(root, /toWorkItemPayload\(/);
  const mutationSchema = root.match(/const workItemMutationSchema = z\.object\(\{[\s\S]*?\n\}\);/)?.[0] ?? "";
  assert.match(mutationSchema, /description: z\.string\(\)\.max\(100_000\)\.optional\(\),/);
  assert.doesNotMatch(root, /\.nullable\(\)/);
  assert.match(root, /z\.string\(\)\.date\(\)/);
  assert.match(root, /ProjectStateService/);
  assert.match(root, /IssueLabelService/);
  assert.match(root, /ProjectMemberService/);
  assert.match(root, /WorkspaceService/);
  assert.match(root, /EstimateService/);
  assert.match(runtime, /get_work_item_schema/);
  assert.match(runtime, /Never invent IDs/);
});
