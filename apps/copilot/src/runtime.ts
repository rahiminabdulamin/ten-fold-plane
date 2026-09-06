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
    // The SPA cannot prove a Plane identity to this separate runtime yet. Local
    // development has one explicit identity; production deployment must replace it.
    identifyUser: () => ({ id: "plane-local-user", name: "Plane local user" }),
  });
}
