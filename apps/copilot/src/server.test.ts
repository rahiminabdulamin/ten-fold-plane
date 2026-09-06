import { once } from "node:events";

import { describe, expect, it } from "vitest";

import { createServer } from "./server";

describe("createServer", () => {
  it("serves an unauthenticated health check", async () => {
    const server = createServer({
      openAiApiKey: "test",
      intelligenceApiKey: "cpk_test",
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
});
