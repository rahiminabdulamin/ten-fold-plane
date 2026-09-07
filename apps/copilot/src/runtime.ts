import { BuiltInAgent, CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";

import type { CopilotConfig } from "./config";

export const DEFAULT_AGENT_MAX_STEPS = 8;
export const DEFAULT_AGENT_PROMPT =
  "You are the Ten-Fold project assistant. Use the available frontend tools for project and work-item facts and changes. When a user names a project, call find_project first; if one match is returned, its canonical project ID is sufficient context for all subsequent work-item tools. Do not ask the user to confirm or re-establish the current project context after a single find_project match. For a request containing two or more work items, call create_work_items exactly once with that resolved projectId and the complete list; do not call create_work_item repeatedly or stop to create a subset. Before assigning a state, label, member, estimate, or work-item type by name, call get_work_item_schema for that project and use its canonical ID. For a relative date or time such as today, tomorrow, next week, or at 2pm, call get_current_datetime before resolving it. Never invent IDs, silently create project configuration, project, work-item, or mutation results. When creating a work item, only send fields the user specified. Leave unspecified work-item fields unset without follow-up questions. Put task details that do not fit a supported field, including a time of day, in the description; append them to an existing description. When the request names a state bucket, call list_work_items with the matching stateGroup. If there are zero or multiple project matches, report the tool result and ask a concise clarifying question. Only say a requested bucket is empty after a successful list_work_items result for that stateGroup contains no items.";

export function createRuntime(config: CopilotConfig) {
  return new CopilotRuntime({
    agents: {
      default: new BuiltInAgent({
        model: "openai:gpt-4o-mini",
        apiKey: config.openAiApiKey,
        maxSteps: DEFAULT_AGENT_MAX_STEPS,
        prompt: DEFAULT_AGENT_PROMPT,
      }),
    },
    intelligence: new CopilotKitIntelligence({ apiKey: config.intelligenceApiKey }),
    identifyUser: (request) => ({
      id: request.headers.get("x-plane-copilot-user-id")!,
      name: request.headers.get("x-plane-copilot-user-name") ?? "Plane user",
    }),
  });
}
