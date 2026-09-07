import { once } from "node:events";
import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createServer } from "./server";

const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

const identityToken = () => {
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    sub: "user-1",
    name: "Ada",
    iss: "plane",
    aud: "copilotkit",
    exp: Math.floor(Date.now() / 1000) + 60,
  });
  return `${header}.${payload}.${createHmac("sha256", "test-secret").update(`${header}.${payload}`).digest("base64url")}`;
};

describe("createServer", () => {
  it("serves an unauthenticated health check", async () => {
    const server = createServer({
      openAiApiKey: "test",
      intelligenceApiKey: "cpk_test",
      identityTokenSecret: "test-secret",
      allowedOrigins: ["http://localhost:3000"],
      port: 0,
      requestTimeoutMs: 30_000,
      maxRequestsPerMinute: 60,
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server");

    const response = await fetch(`http://127.0.0.1:${address.port}/healthz`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
    server.close();
  });

  it("rejects anonymous runtime requests and accepts a signed Plane identity", async () => {
    const server = createServer({
      openAiApiKey: "test",
      intelligenceApiKey: "cpk_test",
      identityTokenSecret: "test-secret",
      allowedOrigins: ["http://localhost:3000"],
      port: 0,
      requestTimeoutMs: 30_000,
      maxRequestsPerMinute: 60,
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP server");
    const url = `http://127.0.0.1:${address.port}/api/copilotkit/info`;

    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(url, { headers: { Authorization: "Bearer invalid" } })).status).toBe(401);
    expect((await fetch(url, { headers: { Authorization: `Bearer ${identityToken()}` } })).status).toBe(200);
    expect(
      (
        await fetch(`${url.replace(/\/info$/, "/inspector-metadata")}`, {
          headers: { Authorization: `Bearer ${identityToken()}` },
        })
      ).status
    ).toBe(204);
    server.close();
  });
});
