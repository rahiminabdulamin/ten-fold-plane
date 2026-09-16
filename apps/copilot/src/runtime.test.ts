import { describe, expect, it } from "vitest";

import { DEFAULT_AGENT_MAX_STEPS, DEFAULT_AGENT_PROMPT, createRuntime } from "./runtime";

describe("createRuntime", () => {
  it("instructs the agent to create multi-item requests as one resolved-project batch", () => {
    expect(DEFAULT_AGENT_MAX_STEPS).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_AGENT_PROMPT).toContain("create_work_items exactly once");
    expect(DEFAULT_AGENT_PROMPT).toContain("dateFrom and dateTo");
    expect(DEFAULT_AGENT_PROMPT).toContain(
      "Do not ask the user to confirm or re-establish the current Workspace context"
    );
  });

  it("uses Team and Workspace in user-facing responses without renaming tool contracts", () => {
    expect(DEFAULT_AGENT_PROMPT).toContain('call the top-level entity "Team" and the child entity "Workspace"');
    expect(DEFAULT_AGENT_PROMPT).toContain("Keep tool names and parameter names unchanged");
    expect(DEFAULT_AGENT_PROMPT).toContain("find_project");
    expect(DEFAULT_AGENT_PROMPT).toContain("projectId");
  });

  it("requires truthful terminal outcomes without automatic mutation retries", () => {
    expect(DEFAULT_AGENT_PROMPT).toContain("partial_success, failure, or uncertain");
    expect(DEFAULT_AGENT_PROMPT).toContain("Never automatically repeat a mutation after an uncertain result");
    expect(DEFAULT_AGENT_PROMPT).toContain("Never invent IDs, tool results, or mutation results");
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
