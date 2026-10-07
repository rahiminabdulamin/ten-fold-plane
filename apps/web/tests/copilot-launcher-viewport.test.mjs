import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

test("assistant launcher stays visible after resizing and removes its resize listener on unmount", async () => {
  const source = await readFile(new URL("../core/components/copilot/root.tsx", import.meta.url), "utf8");
  const helpers = source.slice(source.indexOf("const clamp ="), source.indexOf("type WorkspaceSelectorContextValue"));
  const effect = source.match(/useEffect\(\(\) => \{\s*const keepLauncherInViewport[\s\S]*?\}, \[\]\);/)?.[0];
  assert.ok(effect, "launcher must respond to viewport resizing");

  const listeners = new Map();
  let cleanup;
  const launcherPositionRef = { current: { x: 1720, y: 1280 } };
  const viewport = {
    innerWidth: 1800,
    innerHeight: 1400,
    addEventListener: (event, handler) => listeners.set(event, handler),
    removeEventListener: (event, handler) => {
      assert.equal(listeners.get(event), handler);
      listeners.delete(event);
    },
  };
  vm.runInNewContext(ts.transpile(`${helpers}\n${effect}`), {
    window: viewport,
    LAUNCHER_GUTTER: 24,
    LAUNCHER_SIZE: 56,
    launcherPositionRef,
    useEffect: (callback) => {
      cleanup = callback();
    },
    setLauncherPosition: (position) => {
      launcherPositionRef.current = position;
    },
  });

  viewport.innerWidth = 1000;
  viewport.innerHeight = 800;
  listeners.get("resize")();
  assert.equal(launcherPositionRef.current.x, 920);
  assert.equal(launcherPositionRef.current.y, 720);

  launcherPositionRef.current = { x: 100, y: 150 };
  listeners.get("resize")();
  assert.equal(launcherPositionRef.current.x, 100);
  assert.equal(launcherPositionRef.current.y, 150);

  launcherPositionRef.current = null;
  listeners.get("resize")();
  assert.equal(launcherPositionRef.current, null);
  cleanup();
  assert.equal(listeners.size, 0);
});
