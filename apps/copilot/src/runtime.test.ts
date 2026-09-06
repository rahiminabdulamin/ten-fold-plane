import { describe, expect, it } from "vitest";

import { createRuntime } from "./runtime";

describe("createRuntime", () => {
  it("creates the default gpt-4o-mini agent without exposing credentials", () => {
    expect(() =>
      createRuntime({
        openAiApiKey: "test",
        intelligenceApiKey: "cpk_test",
        identityTokenSecret: "test-secret",
        allowedOrigins: ["http://localhost:3000"],
        port: 8200,
        requestTimeoutMs: 30_000,
        maxRequestsPerMinute: 60,
      })
    ).not.toThrow();
  });
});
