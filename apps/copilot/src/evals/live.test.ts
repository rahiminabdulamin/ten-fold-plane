import { describe, expect, it, vi } from "vitest";

import { AGENT_SCENARIOS, type AgentScenario } from "./scenarios";
import { runLiveEvaluations } from "./live";
import { DEFAULT_AGENT_PROMPT } from "../runtime";

const scenario: AgentScenario = {
  id: "safe-lookup",
  prompt: "Find Marketing.",
  expectedCalls: [{ name: "find_project", arguments: { query: "Marketing" } }],
  terminalStatus: "success",
};

describe("live agent evaluations", () => {
  it("requires an API key only when invoked", async () => {
    await expect(runLiveEvaluations(vi.fn(), {}, [scenario])).rejects.toThrow("OPENAI_API_KEY is required");
  });

  it("uses Responses function calls with fake tools and returns a passing report", async () => {
    const requests: Array<Record<string, unknown>> = [];
    const responses = [
      {
        id: "response-1",
        output: [
          {
            type: "function_call",
            call_id: "call-1",
            name: "find_project",
            arguments: JSON.stringify({ query: "Marketing" }),
          },
        ],
      },
      {
        id: "response-2",
        output: [
          {
            type: "function_call",
            call_id: "call-2",
            name: "report_outcome",
            arguments: JSON.stringify({ status: "success" }),
          },
        ],
      },
    ];
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    const report = await runLiveEvaluations(fetchImpl, { OPENAI_API_KEY: "test-key" }, [scenario]);

    expect(report).toEqual({
      exitCode: 0,
      results: [{ id: "safe-lookup", pass: true, tools: ["find_project"], reasons: [] }],
    });
    expect(requests[0]).toMatchObject({ instructions: DEFAULT_AGENT_PROMPT, store: false });
    expect(requests[0].tools).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: "function", name: "find_project" })])
    );
    expect(requests[1]).toMatchObject({
      previous_response_id: "response-1",
      input: [
        {
          type: "function_call_output",
          call_id: "call-1",
          output: expect.any(String),
        },
      ],
    });
    expect(JSON.stringify(report)).not.toContain("Marketing");
  });

  it("returns a failing exit code for a nonconforming trace", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: "response-1",
            output: [
              {
                type: "function_call",
                call_id: "call-1",
                name: "report_outcome",
                arguments: JSON.stringify({ status: "success" }),
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
    );

    await expect(runLiveEvaluations(fetchImpl, { OPENAI_API_KEY: "test-key" }, [scenario])).resolves.toMatchObject({
      exitCode: 1,
      results: [{ id: "safe-lookup", pass: false, tools: [], reasons: ["Missing ordered call find_project."] }],
    });
  });

  it("rejects a contradictory final answer after successful October event lookups", async () => {
    const octoberScenario = AGENT_SCENARIOS.find((candidate) => candidate.id === "yearless-month-selected-workspace");
    expect(octoberScenario).toBeDefined();
    const responses = [
      {
        id: "response-1",
        output: [
          {
            type: "function_call",
            call_id: "call-1",
            name: "find_project",
            arguments: JSON.stringify({ query: "Programmes" }),
          },
        ],
      },
      {
        id: "response-2",
        output: [
          {
            type: "function_call",
            call_id: "call-2",
            name: "list_month_events",
            arguments: JSON.stringify({ projectId: "project-1", month: "October" }),
          },
        ],
      },
      {
        id: "response-3",
        output: [
          {
            type: "function_call",
            call_id: "call-3",
            name: "report_outcome",
            arguments: JSON.stringify({ status: "success" }),
          },
          {
            type: "message",
            content: [{ type: "output_text", text: "There are no events scheduled for October 2026." }],
          },
        ],
      },
    ];
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify(responses.shift()), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
    );

    const report = await runLiveEvaluations(fetchImpl, { OPENAI_API_KEY: "test-key" }, [octoberScenario!]);

    expect(report.exitCode).toBe(1);
    expect(report.results[0]).toMatchObject({ id: "yearless-month-selected-workspace" });
    expect(report.results[0]?.reasons).toContainEqual(expect.stringContaining("empty"));
  });
});
