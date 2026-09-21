import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("active workspace members are the shared source for assignees and mentions", async () => {
  const [dropdown, workspaceMembers, issueSerializer, search] = await Promise.all([
    read("core/components/dropdowns/member/dropdown.tsx"),
    read("core/store/member/workspace/workspace-member.store.ts"),
    read("../api/plane/app/serializers/issue.py"),
    read("../api/plane/app/views/search/base.py"),
  ]);

  assert.match(dropdown, /const memberIds = propsMemberIds \?\? workspaceMemberIds;/);
  assert.match(workspaceMembers, /\.filter\(\(m\) => m\.is_active !== false && !this\.memberRoot/);
  assert.match(
    issueSerializer,
    /WorkspaceMember\.objects\.filter\([\s\S]*workspace_id=self\.context\["workspace_id"\],[\s\S]*is_active=True,[\s\S]*member__is_bot=False,/
  );
  assert.match(
    search,
    /WorkspaceMember\.objects\.filter\([\s\S]*is_active=True,[\s\S]*workspace__slug=slug,[\s\S]*member__is_bot=False,/
  );
});
