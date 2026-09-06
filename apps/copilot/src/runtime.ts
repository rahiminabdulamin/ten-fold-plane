import { BuiltInAgent, CopilotKitIntelligence, CopilotRuntime } from "@copilotkit/runtime/v2";

import type { CopilotConfig } from "./config";

export function createRuntime(config: CopilotConfig) {
  return new CopilotRuntime({
    agents: {
      default: new BuiltInAgent({
        model: "openai:gpt-4o-mini",
        apiKey: config.openAiApiKey,
      }),
    },
    intelligence: new CopilotKitIntelligence({ apiKey: config.intelligenceApiKey }),
    identifyUser: (request) => ({
      id: request.headers.get("x-plane-copilot-user-id")!,
      name: request.headers.get("x-plane-copilot-user-name") ?? "Plane user",
    }),
  });
}
