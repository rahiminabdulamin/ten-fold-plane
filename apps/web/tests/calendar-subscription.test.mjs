// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright ESM entry if it
// is not on the local module path. The API below is an isolated in-memory fixture.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile, readdir, mkdir } from "node:fs/promises";
import test from "node:test";

const require = createRequire(new URL("../package.json", import.meta.url));
const { build } = createRequire(require.resolve("vite"))("esbuild");
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");

test("project admins can create, copy, disable, rotate and revoke a subscription", async () => {
  const bundled = await build({
    stdin: {
      contents: `import React from "react"; import {createRoot} from "react-dom/client";
        import {CalendarSubscription} from "./core/components/project/settings/calendar-subscription";
        const root = createRoot(document.getElementById("root"));
        window.switchProject = projectId => root.render(<CalendarSubscription workspaceSlug="workspace" projectId={projectId}/>);
        window.switchProject("project");`,
      loader: "tsx",
      resolveDir: new URL("..", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    plugins: [
      {
        name: "test-api-origin",
        setup(builder) {
          builder.onResolve({ filter: /^@plane\/constants$/ }, () => ({ path: "constants", namespace: "fixture" }));
          builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents: 'export const API_BASE_URL = "";',
          }));
        },
      },
    ],
    alias: { "@": new URL("../core", import.meta.url).pathname },
    define: { "process.env.NODE_ENV": '"development"' },
  });
  let feed = null;
  let mutations = 0;
  let failRead = true;
  let failMutation = false;
  const assetRoot = new URL("../build/client/assets/", import.meta.url);
  const css = (await readdir(assetRoot)).find((name) => name.startsWith("globals-") && name.endsWith(".css"));
  const server = createServer(async (request, response) => {
    if (/^\/assets\/[A-Za-z0-9_.-]+$/.test(request.url)) {
      const name = request.url.slice("/assets/".length);
      try {
        response.setHeader("Content-Type", name.endsWith(".css") ? "text/css" : "application/octet-stream");
        response.end(await readFile(new URL(name, assetRoot)));
      } catch {
        response.statusCode = 404;
        response.end();
      }
      return;
    }
    if (request.url === "/bundle.js") {
      response.setHeader("Content-Type", "application/javascript");
      response.end(bundled.outputFiles[0].text);
      return;
    }
    if (request.url.startsWith("/api/")) {
      response.setHeader("Content-Type", "application/json");
      if (request.method === "GET" && failRead) {
        failRead = false;
        response.statusCode = 500;
        response.end("{}");
        return;
      }
      if (request.method === "GET" && request.url.includes("slow-project")) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        response.end(JSON.stringify({ url: "https://tenfold.example/ics/old-project.ics", enabled: true }));
        return;
      }
      if (request.method === "GET" && request.url.includes("next-project")) {
        response.end(JSON.stringify({ url: "https://tenfold.example/ics/next-project.ics", enabled: true }));
        return;
      }
      if (request.method !== "GET") mutations++;
      if (request.method === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 50));
        feed = {
          url: `https://tenfold.example/ics/token-${mutations}.ics`,
          enabled: true,
          expires_at: null,
          token_rotated_at: null,
        };
      } else if (request.method === "PATCH") {
        let body = "";
        for await (const part of request) body += part;
        feed = { ...feed, ...JSON.parse(body) };
      } else if (request.method === "DELETE") {
        feed = null;
        response.statusCode = 204;
        response.end();
        return;
      }
      if (failMutation && request.method !== "GET") {
        failMutation = false;
        response.statusCode = 500;
        response.end("{}");
        return;
      }
      response.end(JSON.stringify(feed));
      return;
    }
    response.end(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/${css}"></head><body><main style="max-width:900px;margin:auto;padding:24px"><div id="root"></div></main><script src="/bundle.js"></script></body></html>`
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.getByRole("button", { name: "Reload status" }).click();
    await page.getByRole("button", { name: "Enable subscription", exact: true }).waitFor();
    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find(
        (item) => item.textContent === "Enable subscription"
      );
      button.click();
      button.click();
    });
    const input = page.getByLabel("Subscription URL", { exact: true });
    await input.waitFor();
    const original = await input.inputValue();
    assert.match(original, /^https:\/\/tenfold.example\/ics\//);
    if (process.env.CALENDAR_SCREENSHOT_DIR) {
      await mkdir(process.env.CALENDAR_SCREENSHOT_DIR, { recursive: true });
      // Each capture shares one browser page; resizing and capture must be sequential.
      /* eslint-disable no-await-in-loop */
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 850 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.screenshot({
          path: `${process.env.CALENDAR_SCREENSHOT_DIR}/subscription-${width}.png`,
          fullPage: true,
        });
      }
      /* eslint-enable no-await-in-loop */
    }
    await page.evaluate(() => {
      window.copied = "";
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text) => {
            window.copied = text;
          },
        },
        configurable: true,
      });
    });
    await page.getByRole("button", { name: "Copy URL", exact: true }).click();
    assert.equal(await page.evaluate(() => window.copied), original);
    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => {
        throw Error("Denied");
      };
    });
    await page.getByRole("button", { name: "Copy URL", exact: true }).click();
    await page.getByText("Clipboard unavailable. Select the URL and copy it manually.").waitFor();
    await page.getByRole("button", { name: "Disable", exact: true }).click();
    await page.getByRole("button", { name: "Enable", exact: true }).waitFor();
    assert.equal(feed.enabled, false);
    await page.getByRole("button", { name: "Enable", exact: true }).click();
    await page.getByRole("button", { name: "Disable", exact: true }).waitFor();
    assert.equal(await input.inputValue(), original);
    await page.getByRole("button", { name: "Rotate URL", exact: true }).click();
    assert.equal(await input.inputValue(), original);
    await page.getByRole("button", { name: "Confirm rotation", exact: true }).click();
    await page.waitForFunction(
      (value) => document.querySelector('input[aria-label="Subscription URL"]')?.value !== value,
      original
    );
    assert.notEqual(await input.inputValue(), original);
    await page.getByRole("button", { name: "Revoke subscription", exact: true }).click();
    await page.getByRole("button", { name: "Confirm revocation", exact: true }).click();
    await page.getByRole("button", { name: "Enable subscription", exact: true }).waitFor();
    assert.equal(feed, null);
    assert.equal(mutations, 5);
    await page.getByRole("button", { name: "Enable subscription", exact: true }).click();
    await input.waitFor();
    failMutation = true;
    await page.getByRole("button", { name: "Disable", exact: true }).click();
    await page.getByRole("button", { name: "Reload status" }).waitFor();
    assert.equal(await input.count(), 0);
    await page.getByRole("button", { name: "Reload status" }).click();
    await page.getByRole("button", { name: "Enable", exact: true }).waitFor();
    await page.evaluate(() => window.switchProject("slow-project"));
    await page.waitForTimeout(20);
    await page.evaluate(() => window.switchProject("next-project"));
    await input.waitFor();
    await page.waitForTimeout(300);
    assert.equal(await input.inputValue(), "https://tenfold.example/ics/next-project.ics");
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
