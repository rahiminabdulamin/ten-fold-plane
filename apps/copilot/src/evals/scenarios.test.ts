import { describe, expect, it } from "vitest";

import { AGENT_SCENARIOS, evaluateScenario, type AgentScenario, type AgentTrace } from "./scenarios";

const octoberResponseScenario: AgentScenario = {
  id: "october-response-grounding",
  prompt: "What are the events for October 2026?",
  expectedCalls: [
    { name: "find_project", arguments: { query: "Programmes" } },
    { name: "list_month_events", arguments: { projectId: "project-1", month: "October" } },
  ],
  terminalStatus: "success",
  responseFacts: {
    toolName: "list_month_events",
    count: 3,
    recordNames: [
      "JobCentre - Career360 Session",
      "IBTE Working Session - AI for Humanity",
      "(DYAP) Sekolah Arab Perempuan – Safe & Responsible Digital Citizenship Assembly",
    ],
  },
};

const passingTraces: Record<string, AgentTrace> = {
  "named-workspace-backlog": {
    calls: [
      { name: "find_project", arguments: { query: "Marketing" } },
      { name: "list_work_items", arguments: { projectId: "project-1", stateGroup: "backlog" } },
    ],
    terminalStatus: "success",
  },
  "unqualified-work-item-list": {
    calls: [{ name: "list_work_items", arguments: { projectId: "project-1" } }],
    terminalStatus: "success",
  },
  "relative-date-range": {
    calls: [
      { name: "get_current_datetime", arguments: {} },
      {
        name: "list_work_items",
        arguments: { projectId: "project-1", dateFrom: "2026-09-17", dateTo: "2026-09-24" },
      },
    ],
    terminalStatus: "success",
  },
  "yearless-month-selected-workspace": {
    calls: [
      { name: "find_project", arguments: { query: "Programmes" } },
      { name: "list_month_events", arguments: { projectId: "project-1", month: "October" } },
    ],
    terminalStatus: "success",
    finalResponse:
      "There are 3 events: JobCentre - Career360 Session; IBTE Working Session - AI for Humanity; and (DYAP) Sekolah Arab Perempuan – Safe & Responsible Digital Citizenship Assembly.",
  },
  "schema-backed-assignment": {
    calls: [
      { name: "get_work_item_schema", arguments: { projectId: "project-1" } },
      { name: "update_work_item", arguments: { issueId: "issue-1", assigneeIds: ["member-1"] } },
    ],
    terminalStatus: "success",
  },
  "multi-item-batch": {
    calls: [
      { name: "find_project", arguments: { query: "Marketing" } },
      {
        name: "create_work_items",
        arguments: { projectId: "project-1", items: [{ title: "One" }, { title: "Two" }, { title: "Three" }] },
      },
    ],
    terminalStatus: "success",
  },
  "weekly-recurring-events": {
    calls: [
      { name: "find_project", arguments: { query: "Programmes" } },
      { name: "get_current_datetime", arguments: {} },
      {
        name: "create_recurring_work_items",
        arguments: {
          projectId: "project-1",
          series: [
            {
              title: "Arab mentoring: Digital skills",
              anchorDate: "2026-10-11",
              weekday: "wednesday",
              occurrences: 4,
            },
            { title: "Mentiri mentoring", anchorDate: "2026-10-11", weekday: "saturday", occurrences: 4 },
            { title: "Khattab mentoring", anchorDate: "2026-10-11", weekday: "saturday", occurrences: 4 },
            { title: "Katok mentoring", anchorDate: "2026-10-11", weekday: "saturday", occurrences: 4 },
          ],
        },
      },
    ],
    terminalStatus: "success",
  },
  "ambiguous-workspace": {
    calls: [{ name: "find_project", arguments: { query: "Mobile" } }],
    terminalStatus: "failure",
  },
  "partial-batch": {
    calls: [
      { name: "create_work_items", arguments: { projectId: "project-1", items: [{ title: "One" }, { title: "Two" }] } },
    ],
    terminalStatus: "partial_success",
  },
  "uncertain-update": {
    calls: [{ name: "update_work_item", arguments: { issueId: "issue-1", priority: "high" } }],
    terminalStatus: "uncertain",
  },
  "confirmed-deletion": {
    calls: [{ name: "confirm_delete_work_item", arguments: { issueId: "issue-1", name: "Old task" } }],
    terminalStatus: "success",
  },
};

describe("agent reliability scenarios", () => {
  it("rejects an empty October answer after a successful non-empty event lookup", () => {
    const result = evaluateScenario(octoberResponseScenario, {
      calls: [
        { name: "find_project", arguments: { query: "Programmes" } },
        { name: "list_month_events", arguments: { projectId: "project-1", month: "October" } },
      ],
      terminalStatus: "success",
      finalResponse: "There are no events scheduled for October 2026.",
    });

    expect(result.pass).toBe(false);
    expect(result.reasons).toContainEqual(expect.stringContaining("empty"));
  });

  it("accepts an October answer grounded in the successful event lookup", () => {
    const result = evaluateScenario(octoberResponseScenario, {
      calls: [
        { name: "find_project", arguments: { query: "Programmes" } },
        { name: "list_month_events", arguments: { projectId: "project-1", month: "October" } },
      ],
      terminalStatus: "success",
      finalResponse:
        "There are 3 events: JobCentre - Career360 Session; IBTE Working Session - AI for Humanity; and (DYAP) Sekolah Arab Perempuan – Safe & Responsible Digital Citizenship Assembly.",
    });

    expect(result).toEqual({ pass: true, reasons: [] });
  });

  it("accepts a conforming trace for every scenario", () => {
    expect(AGENT_SCENARIOS.map((scenario) => evaluateScenario(scenario, passingTraces[scenario.id]))).toEqual(
      AGENT_SCENARIOS.map(() => ({ pass: true, reasons: [] }))
    );
  });

  it("rejects a schema lookup for an ordinary recurring event request", () => {
    const scenario = AGENT_SCENARIOS.find((candidate) => candidate.id === "weekly-recurring-events");
    expect(scenario).toBeDefined();
    const calls = [...passingTraces["weekly-recurring-events"].calls];
    calls.splice(2, 0, { name: "get_work_item_schema", arguments: { projectId: "project-1" } });

    expect(evaluateScenario(scenario!, { calls, terminalStatus: "success" }).pass).toBe(false);
  });

  it.each([
    [
      "named-workspace-backlog",
      { calls: [...passingTraces["named-workspace-backlog"].calls].toReversed(), terminalStatus: "success" },
    ],
    [
      "relative-date-range",
      { calls: [{ name: "list_work_items", arguments: { projectId: "project-1" } }], terminalStatus: "success" },
    ],
    [
      "unqualified-work-item-list",
      {
        calls: [{ name: "list_work_items", arguments: { projectId: "project-1", stateGroup: "backlog" } }],
        terminalStatus: "success",
      },
    ],
    [
      "yearless-month-selected-workspace",
      {
        calls: [
          { name: "find_project", arguments: { query: "Programmes" } },
          {
            name: "list_work_items",
            arguments: { projectId: "project-1", dateFrom: "2025-10-01", dateTo: "2025-10-31" },
          },
        ],
        terminalStatus: "success",
      },
    ],
    [
      "yearless-month-selected-workspace",
      {
        calls: [
          { name: "find_project", arguments: { query: "Programmes" } },
          { name: "get_current_datetime", arguments: {} },
          {
            name: "list_work_items",
            arguments: {
              projectId: "project-1",
              dateFrom: "2026-10-01",
              dateTo: "2026-10-31",
              stateGroup: "unstarted",
            },
          },
        ],
        terminalStatus: "success",
      },
    ],
    [
      "schema-backed-assignment",
      { calls: [{ name: "update_work_item", arguments: { issueId: "issue-1" } }], terminalStatus: "success" },
    ],
    [
      "multi-item-batch",
      { calls: [{ name: "create_work_item", arguments: { title: "One" } }], terminalStatus: "success" },
    ],
    [
      "ambiguous-workspace",
      {
        calls: [
          ...passingTraces["ambiguous-workspace"].calls,
          { name: "create_work_item", arguments: { title: "Wrong" } },
        ],
        terminalStatus: "failure",
      },
    ],
    ["partial-batch", { ...passingTraces["partial-batch"], terminalStatus: "success" }],
    [
      "uncertain-update",
      {
        calls: [...passingTraces["uncertain-update"].calls, ...passingTraces["uncertain-update"].calls],
        terminalStatus: "uncertain",
      },
    ],
    ["confirmed-deletion", { calls: [], terminalStatus: "success" }],
  ] as const)("rejects a nonconforming %s trace", (id, trace) => {
    const scenario = AGENT_SCENARIOS.find((candidate) => candidate.id === id);
    expect(scenario).toBeDefined();
    expect(evaluateScenario(scenario!, trace as AgentTrace).pass).toBe(false);
  });
});
