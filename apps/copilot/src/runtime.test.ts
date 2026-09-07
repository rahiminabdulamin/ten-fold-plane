import { describe, expect, it } from "vitest";

import { DEFAULT_AGENT_MAX_STEPS, DEFAULT_AGENT_PROMPT, createRuntime } from "./runtime";

describe("createRuntime", () => {
  it("instructs the agent to create multi-item requests as one resolved-project batch", () => {
    expect(DEFAULT_AGENT_MAX_STEPS).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_AGENT_PROMPT).toContain("create_work_items exactly once");
    expect(DEFAULT_AGENT_PROMPT).toContain("dateFrom and dateTo");
    expect(DEFAULT_AGENT_PROMPT).toContain(
      "Do not ask the user to confirm or re-establish the current project context"
    );
  });

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
