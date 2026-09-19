import { pathToFileURL } from "node:url";

import { DEFAULT_AGENT_MAX_STEPS, DEFAULT_AGENT_MODEL, DEFAULT_AGENT_PROMPT } from "../runtime";
import { AGENT_SCENARIOS, evaluateScenario, type AgentScenario, type AgentTraceCall } from "./scenarios";

type ResponseFunctionCall = {
  type: "function_call";
  call_id: string;
  name: string;
  arguments: string;
};

type ResponseMessage = { type: "message"; content: Array<{ type: string; text?: string }> };

type ResponsesPayload = {
  id: string;
  output: Array<ResponseFunctionCall | ResponseMessage | { type: string }>;
  output_text?: string;
};

const objectParameters = {
  type: "object",
  properties: {},
  additionalProperties: true,
};

const fakeTools = [
  "find_project",
  "list_work_items",
  "list_work_items_by_state",
  "list_month_events",
  "get_current_datetime",
  "get_work_item_schema",
  "update_work_item",
  "create_work_item",
  "create_work_items",
  "create_recurring_work_items",
  "confirm_delete_work_item",
].map((name) => ({
  type: "function",
  name,
  description: `Fake evaluation implementation of ${name}.`,
  parameters: objectParameters,
  strict: false,
}));

const tools = [
  ...fakeTools,
  {
    type: "function",
    name: "report_outcome",
    description: "Report the final outcome after all required fake tools have completed.",
    parameters: {
      type: "object",
      properties: { status: { type: "string", enum: ["success", "partial_success", "failure", "uncertain"] } },
      required: ["status"],
      additionalProperties: false,
    },
    strict: true,
  },
];

const fakeOutput = (scenario: AgentScenario, call: AgentTraceCall): string => {
  switch (call.name) {
    case "find_project":
      return JSON.stringify(
        call.arguments.query === "Mobile"
          ? { ok: true, data: [{ id: "project-1" }, { id: "project-2" }] }
          : { ok: true, data: [{ id: "project-1", name: "Marketing" }] }
      );
    case "get_current_datetime":
      return JSON.stringify({
        ok: true,
        data: {
          date: scenario.id === "weekly-recurring-events" ? "2026-10-11" : "2026-09-17",
          time: "09:00",
          timeZone: "Asia/Singapore",
        },
      });
    case "get_work_item_schema":
      return JSON.stringify({ ok: true, data: { members: [{ id: "member-1", name: "Alex" }] } });
    case "list_work_items":
    case "list_work_items_by_state":
    case "list_month_events":
      return JSON.stringify({ ok: true, status: "success", data: [{ id: "issue-1", name: "Launch" }] });
    case "create_work_items":
      return JSON.stringify({ ok: scenario.id !== "partial-batch", status: scenario.terminalStatus });
    case "create_recurring_work_items":
      return JSON.stringify({ ok: true, status: "success" });
    case "update_work_item":
      return JSON.stringify({ ok: scenario.id !== "uncertain-update", status: scenario.terminalStatus });
    case "confirm_delete_work_item":
      return JSON.stringify({ ok: true, status: "success", affectedIds: ["issue-1"] });
    default:
      return JSON.stringify({ ok: true, status: "success" });
  }
};

const getResponseText = (payload: ResponsesPayload) => {
  if (payload.output_text?.trim()) return payload.output_text;
  return payload.output
    .filter((item): item is ResponseMessage => item.type === "message")
    .flatMap(({ content }) => content)
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map(({ text }) => text)
    .join("\n");
};

export async function runLiveEvaluations(
  fetchImpl: typeof fetch = fetch,
  environment: Record<string, string | undefined> = process.env,
  scenarios: AgentScenario[] = AGENT_SCENARIOS
): Promise<{
  exitCode: number;
  results: Array<{ id: string; pass: boolean; tools: string[]; reasons: string[] }>;
}> {
  const apiKey = environment.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for live evaluations.");

  const results = [];
  for (const scenario of scenarios) {
    const calls: AgentTraceCall[] = [];
    let terminalStatus: "success" | "partial_success" | "failure" | "uncertain" = "failure";
    let previousResponseId: string | undefined;
    let input: string | Array<{ type: "function_call_output"; call_id: string; output: string }> =
      `${scenario.prompt}\nAfter completing the request, call report_outcome exactly once with the truthful final status and provide a concise final user-facing answer in the same response.`;

    let finalResponse: string | undefined;
    for (let step = 0; step < DEFAULT_AGENT_MAX_STEPS; step++) {
      // oxlint-disable-next-line eslint(no-await-in-loop) -- each response consumes the previous tool outputs.
      const response = await fetchImpl("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: DEFAULT_AGENT_MODEL,
          instructions: DEFAULT_AGENT_PROMPT,
          input,
          tools,
          store: false,
          parallel_tool_calls: false,
          ...(previousResponseId ? { previous_response_id: previousResponseId } : {}),
        }),
      });
      if (!response.ok) throw new Error(`OpenAI evaluation request failed with status ${response.status}.`);
      // oxlint-disable-next-line eslint(no-await-in-loop) -- parse the sequential response before continuing.
      const payload = (await response.json()) as ResponsesPayload;
      const responseText = getResponseText(payload);
      if (responseText.trim()) finalResponse = responseText;
      const functionCalls = payload.output.filter(
        (item): item is ResponseFunctionCall => item.type === "function_call"
      );
      if (!functionCalls.length) break;

      const outputs: Array<{ type: "function_call_output"; call_id: string; output: string }> = [];
      let reported = false;
      for (const call of functionCalls) {
        const arguments_ = JSON.parse(call.arguments) as Record<string, unknown>;
        if (call.name === "report_outcome") {
          const status = arguments_.status;
          if (status === "success" || status === "partial_success" || status === "failure" || status === "uncertain")
            terminalStatus = status;
          reported = true;
          break;
        }
        const traceCall = { name: call.name, arguments: arguments_ };
        calls.push(traceCall);
        outputs.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: fakeOutput(scenario, traceCall),
        });
      }
      if (reported) break;
      previousResponseId = payload.id;
      input = outputs;
    }

    const evaluation = evaluateScenario(scenario, {
      calls,
      terminalStatus,
      ...(finalResponse ? { finalResponse } : {}),
    });
    results.push({
      id: scenario.id,
      pass: evaluation.pass,
      tools: calls.map(({ name }) => name),
      reasons: evaluation.reasons,
    });
  }
  return { exitCode: results.every(({ pass }) => pass) ? 0 : 1, results };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runLiveEvaluations()
    .then(({ exitCode, results }) => {
      for (const result of results)
        console.log(
          `${result.id}: ${result.pass ? "PASS" : "FAIL"} tools=${result.tools.join(",")} ${result.reasons.join(" ")}`
        );
      process.exitCode = exitCode;
      return undefined;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : "Live evaluation failed.");
      process.exitCode = 1;
    });
}
