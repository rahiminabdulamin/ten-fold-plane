import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("primary sidebar overlays content below the desktop breakpoint", async () => {
  const sidebar = await readFile(new URL("../core/components/sidebar/resizable-sidebar.tsx", import.meta.url), "utf8");

  assert.match(sidebar, /"fixed top-10 bottom-0 left-0 z-\[40\] md:relative md:inset-auto md:z-20"/);
  assert.doesNotMatch(sidebar, /isMobile && "fixed/);
  assert.match(
    sidebar,
    /!isCollapsed && <button type="button" aria-label="Close sidebar" className="fixed top-10 right-0 bottom-0 left-0 z-\[30\] bg-black\/40 md:hidden"/
  );
  assert.match(sidebar, /onClick=\{toggleCollapsed\}/);
});

test("Customize Navigation closes the mobile sidebar before opening its dialog", async () => {
  const sidebarWrapper = await readFile(
    new URL("../core/components/sidebar/sidebar-wrapper.tsx", import.meta.url),
    "utf8"
  );

  assert.match(sidebarWrapper, /if \(window\.innerWidth < 768\) toggleSidebar\(true\);/);
  assert.match(sidebarWrapper, /onClick=\{handleCustomizeNavigation\}/);
});

test("Workspace section entries force-close the mobile sidebar", async () => {
  const workspaceMenuItem = await readFile(
    new URL("../core/components/workspace/sidebar/workspace-menu-item.tsx", import.meta.url),
    "utf8"
  );

  assert.match(workspaceMenuItem, /if \(window\.innerWidth < 768\) \{\s*toggleSidebar\(true\);/);
});

test("listed workspace entries reuse Home's mobile sidebar dismissal", async () => {
  const workspaceListItem = await readFile(
    new URL("../core/components/workspace/sidebar/projects-list-item.tsx", import.meta.url),
    "utf8"
  );

  assert.match(workspaceListItem, /const \{[\s\S]*?toggleSidebar[\s\S]*?\}\s*=\s*useAppTheme\(\);/);
  assert.match(workspaceListItem, /if \(window\.innerWidth < 768\) toggleSidebar\(\);/);
});
