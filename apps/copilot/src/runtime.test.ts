import { describe, expect, it } from "vitest";

import { DEFAULT_AGENT_MAX_STEPS, DEFAULT_AGENT_PROMPT, createRuntime } from "./runtime";

describe("createRuntime", () => {
  it("instructs the agent to create multi-item requests as one resolved-project batch", () => {
    expect(DEFAULT_AGENT_MAX_STEPS).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_AGENT_PROMPT).toContain("create_work_items exactly once");
    expect(DEFAULT_AGENT_PROMPT).toContain("dateFrom and dateTo");
    expect(DEFAULT_AGENT_PROMPT).toContain("Ask the user to select a Workspace only when neither selected UI context");
    expect(DEFAULT_AGENT_PROMPT).toContain("create_recurring_work_items exactly once");
    expect(DEFAULT_AGENT_PROMPT).toContain("never use startDate or targetDate as recurrence boundaries");
    expect(DEFAULT_AGENT_PROMPT).toContain('"event", "task", and "work item" are synonyms');
    expect(DEFAULT_AGENT_PROMPT).toContain("does not imply a work-item type");
    expect(DEFAULT_AGENT_PROMPT).toContain("creation request that does not name one of those properties");
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
    expect(DEFAULT_AGENT_PROMPT).toContain("including list_month_events");
  });

  it("uses selected UI Workspace context before asking the user to choose", () => {
    expect(DEFAULT_AGENT_PROMPT).toContain("selected UI Workspace");
    expect(DEFAULT_AGENT_PROMPT).toContain("do not call list_projects or ask the user to choose");
    expect(DEFAULT_AGENT_PROMPT).toContain("explicitly names a different Workspace");
    expect(DEFAULT_AGENT_PROMPT).not.toContain("do not infer a Workspace from the open page");
    expect(DEFAULT_AGENT_PROMPT).toContain("yearless named month");
    expect(DEFAULT_AGENT_PROMPT).toContain("Only say a requested date period is empty");
    expect(DEFAULT_AGENT_PROMPT).toContain("Do not infer stateGroup");
  });

  it("requires unqualified work-item requests to omit stateGroup", () => {
    expect(DEFAULT_AGENT_PROMPT).toContain(
      "For an unqualified request to list work items, tasks, or events, omit stateGroup"
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
