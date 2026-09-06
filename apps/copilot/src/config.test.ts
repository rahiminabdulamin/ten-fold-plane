import { describe, expect, it } from "vitest";

import { readConfig } from "./config";

describe("readConfig", () => {
  it("rejects a missing OpenAI credential without revealing configuration values", () => {
    expect(() =>
      readConfig({
        CPK_INTELLIGENCE_API_KEY: "cpk_test",
        COPILOT_ALLOWED_ORIGINS: "http://localhost:3000",
      })
    ).toThrow("OPENAI_API_KEY is required");
  });

  it("normalizes origins and applies bounded local defaults", () => {
    expect(
      readConfig({
        OPENAI_API_KEY: "test",
        CPK_INTELLIGENCE_API_KEY: "cpk_test",
        COPILOT_ALLOWED_ORIGINS: "http://localhost:3000, http://localhost:3000/",
      })
    ).toMatchObject({
      allowedOrigins: ["http://localhost:3000"],
      port: 8200,
      requestTimeoutMs: 30_000,
      maxRequestsPerMinute: 60,
    });
  });
});
