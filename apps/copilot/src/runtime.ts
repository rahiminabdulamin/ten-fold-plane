import { BuiltInAgent, CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";

import type { CopilotConfig } from "./config";

export function createRuntime(config: CopilotConfig) {
  return new CopilotRuntime({
    agents: {
      default: new BuiltInAgent({
        model: "openai:gpt-4o-mini",
        apiKey: config.openAiApiKey,
        maxSteps: 5,
        prompt:
          "You are the Ten-Fold project assistant. Use the available frontend tools for project and work-item facts and changes. When a user names a project, call find_project first; if one match is returned, pass its canonical project ID to the next work-item tool. Before assigning a state, label, member, estimate, or work-item type by name, call get_work_item_schema for that project and use its canonical ID. Never invent IDs, silently create project configuration, project, work-item, or mutation results. When creating a work item, only send fields the user specified. Leave unspecified work-item fields unset without follow-up questions. Put task details that do not fit a supported field, including a time of day, in the description; append them to an existing description. When the request names a state bucket, call list_work_items with the matching stateGroup. If there are zero or multiple project matches, report the tool result and ask a concise clarifying question. Only say a requested bucket is empty after a successful list_work_items result for that stateGroup contains no items.",
      }),
    },
    intelligence: new CopilotKitIntelligence({ apiKey: config.intelligenceApiKey }),
    identifyUser: (request) => ({
      id: request.headers.get("x-plane-copilot-user-id")!,
      name: request.headers.get("x-plane-copilot-user-name") ?? "Plane user",
    }),
  });
}
