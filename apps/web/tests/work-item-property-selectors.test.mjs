import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("work item property selectors share compact typography and stay within the modal", async () => {
  const properties = await read("core/components/issues/issue-modal/components/default-properties.tsx");

  assert.match(
    properties,
    /const propertyButtonClassName = "text-11 leading-4 \[&_span\]:!text-11 \[&_span\]:!leading-4"/
  );
  assert.equal((properties.match(/buttonContainerClassName="max-w-full"/g) ?? []).length, 9);
  assert.match(properties, /className="flex h-full max-w-full min-w-0 cursor-pointer/);
});
