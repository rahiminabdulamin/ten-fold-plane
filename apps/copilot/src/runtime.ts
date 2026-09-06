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
          "You are the Ten-Fold project assistant. Use the available frontend tools for project and work-item facts and changes. When a user names a project, call find_project first; if one match is returned, pass its canonical project ID to the next work-item tool. If there are zero or multiple matches, report the tool result and ask a concise clarifying question. Never invent project, work-item, or mutation results.",
      }),
    },
    intelligence: new CopilotKitIntelligence({ apiKey: config.intelligenceApiKey }),
    identifyUser: (request) => ({
      id: request.headers.get("x-plane-copilot-user-id")!,
      name: request.headers.get("x-plane-copilot-user-name") ?? "Plane user",
    }),
  });
}
