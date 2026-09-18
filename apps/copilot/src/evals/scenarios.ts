export interface AgentTraceCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface AgentTrace {
  calls: AgentTraceCall[];
  terminalStatus: "success" | "partial_success" | "failure" | "uncertain";
  finalResponse?: string;
}

export interface AgentResponseFacts {
  toolName: string;
  count: number;
  recordNames: string[];
}

export interface AgentScenario {
  id: string;
  prompt: string;
  expectedCalls: Array<{ name: string; arguments?: Record<string, unknown> }>;
  prohibitedCalls?: string[];
  prohibitedArgumentKeys?: Array<{ name: string; keys: string[] }>;
  maxCalls?: Record<string, number>;
  terminalStatus: AgentTrace["terminalStatus"];
  responseFacts?: AgentResponseFacts;
}

export const AGENT_SCENARIOS: AgentScenario[] = [
  {
    id: "named-workspace-backlog",
    prompt: "List the Backlog work items in the Marketing Workspace.",
    expectedCalls: [
      { name: "find_project", arguments: { query: "Marketing" } },
      { name: "list_work_items", arguments: { projectId: "project-1", stateGroup: "backlog" } },
    ],
    terminalStatus: "success",
  },
  {
    id: "relative-date-range",
    prompt: "List work items due in the next week.",
    expectedCalls: [
      { name: "get_current_datetime" },
      {
        name: "list_work_items",
        arguments: { projectId: "project-1", dateFrom: "2026-09-17", dateTo: "2026-09-24" },
      },
    ],
    terminalStatus: "success",
  },
  {
    id: "yearless-month-selected-workspace",
    prompt:
      "The user selected the Programmes Workspace after being asked to choose. What events are coming up for October?",
    expectedCalls: [
      { name: "find_project", arguments: { query: "Programmes" } },
      { name: "list_month_events", arguments: { projectId: "project-1", month: "October" } },
    ],
    prohibitedCalls: ["list_work_items"],
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
  },
  {
    id: "schema-backed-assignment",
    prompt: "Assign the launch task to Alex.",
    expectedCalls: [
      { name: "get_work_item_schema", arguments: { projectId: "project-1" } },
      { name: "update_work_item", arguments: { issueId: "issue-1", assigneeIds: ["member-1"] } },
    ],
    terminalStatus: "success",
  },
  {
    id: "multi-item-batch",
    prompt: "In Marketing create work items One, Two, and Three.",
    expectedCalls: [
      { name: "find_project", arguments: { query: "Marketing" } },
      {
        name: "create_work_items",
        arguments: { projectId: "project-1", items: [{ title: "One" }, { title: "Two" }, { title: "Three" }] },
      },
    ],
    prohibitedCalls: ["create_work_item"],
    maxCalls: { create_work_items: 1 },
    terminalStatus: "success",
  },
  {
    id: "ambiguous-workspace",
    prompt: "Create a work item in Mobile.",
    expectedCalls: [{ name: "find_project", arguments: { query: "Mobile" } }],
    prohibitedCalls: ["create_work_item", "create_work_items"],
    terminalStatus: "failure",
  },
  {
    id: "partial-batch",
    prompt: "Create work items One and Two; one fixture creation will fail.",
    expectedCalls: [
      { name: "create_work_items", arguments: { projectId: "project-1", items: [{ title: "One" }, { title: "Two" }] } },
    ],
    maxCalls: { create_work_items: 1 },
    terminalStatus: "partial_success",
  },
  {
    id: "uncertain-update",
    prompt: "Set the launch task priority to high; the fixture result is uncertain.",
    expectedCalls: [{ name: "update_work_item", arguments: { issueId: "issue-1", priority: "high" } }],
    maxCalls: { update_work_item: 1 },
    terminalStatus: "uncertain",
  },
  {
    id: "confirmed-deletion",
    prompt: "Delete the Old task after confirmation.",
    expectedCalls: [{ name: "confirm_delete_work_item", arguments: { issueId: "issue-1", name: "Old task" } }],
    prohibitedCalls: ["delete_work_item"],
    maxCalls: { confirm_delete_work_item: 1 },
    terminalStatus: "success",
  },
];

const partiallyMatches = (actual: unknown, expected: unknown): boolean => {
  if (Array.isArray(expected))
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => partiallyMatches(actual[index], item))
    );
  if (expected && typeof expected === "object")
    return (
      Boolean(actual) &&
      typeof actual === "object" &&
      Object.entries(expected as Record<string, unknown>).every(([key, value]) =>
        partiallyMatches((actual as Record<string, unknown>)[key], value)
      )
    );
  return Object.is(actual, expected);
};

const normalizeResponse = (response: string) =>
  response
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[–—]/g, "-")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const evaluateResponseFacts = (facts: AgentResponseFacts, finalResponse: string | undefined) => {
  if (!finalResponse?.trim()) return [`Missing final response for ${facts.toolName}.`];
  const response = normalizeResponse(finalResponse);
  const reasons: string[] = [];
  const emptyClaim = /\b(?:no|zero|0)\s+(?:scheduled\s+)?(?:events?|items?|work items?)\b/.test(response);
  if (facts.count > 0 && emptyClaim)
    reasons.push(`${facts.toolName} returned a non-empty list but the response says it is empty.`);
  if (facts.count === 0 && /\b(?:[1-9]\d*)\s+(?:events?|items?|work items?)\b/.test(response))
    reasons.push(`${facts.toolName} returned an empty list but the response claims records.`);
  for (const match of response.matchAll(/\b(\d+)\s+(?:events?|items?|work items?)\b/g)) {
    if (Number(match[1]) !== facts.count)
      reasons.push(`${facts.toolName} returned ${facts.count} records but the response claims ${match[1]}.`);
  }
  if (facts.count > 0) {
    for (const name of facts.recordNames) {
      if (!response.includes(normalizeResponse(name))) reasons.push(`Response omits ${facts.toolName} record ${name}.`);
    }
  }
  return reasons;
};

export function evaluateScenario(
  scenario: AgentScenario,
  trace: AgentTrace | undefined
): { pass: boolean; reasons: string[] } {
  if (!trace) return { pass: false, reasons: ["No trace was produced."] };
  const reasons: string[] = [];
  let cursor = 0;
  for (const expected of scenario.expectedCalls) {
    const index = trace.calls.findIndex(
      (call, callIndex) =>
        callIndex >= cursor &&
        call.name === expected.name &&
        (expected.arguments === undefined || partiallyMatches(call.arguments, expected.arguments))
    );
    if (index === -1) reasons.push(`Missing ordered call ${expected.name}.`);
    else cursor = index + 1;
  }
  for (const prohibited of scenario.prohibitedCalls ?? []) {
    if (trace.calls.some(({ name }) => name === prohibited)) reasons.push(`Prohibited call ${prohibited} was used.`);
  }
  for (const { name, keys } of scenario.prohibitedArgumentKeys ?? []) {
    for (const call of trace.calls.filter((candidate) => candidate.name === name)) {
      for (const key of keys) {
        if (Object.hasOwn(call.arguments, key)) reasons.push(`Prohibited argument ${key} was used for ${name}.`);
      }
    }
  }
  for (const [name, maximum] of Object.entries(scenario.maxCalls ?? {})) {
    if (trace.calls.filter((call) => call.name === name).length > maximum)
      reasons.push(`Call ${name} exceeded its maximum of ${maximum}.`);
  }
  if (trace.terminalStatus !== scenario.terminalStatus)
    reasons.push(`Expected terminal status ${scenario.terminalStatus}, received ${trace.terminalStatus}.`);
  if (scenario.responseFacts) reasons.push(...evaluateResponseFacts(scenario.responseFacts, trace.finalResponse));
  return { pass: reasons.length === 0, reasons };
}
